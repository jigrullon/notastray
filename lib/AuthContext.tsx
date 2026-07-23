'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    User,
    UserCredential,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Sends the branded verification email via our own endpoint (AWS SES), replacing
// Firebase's default sendEmailVerification. Throws with code 'auth/too-many-requests'
// on a 429 so the dashboard banner's existing special-casing keeps working.
async function sendCustomVerificationEmail(user: User, continueUrl?: string): Promise<void> {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(continueUrl ? { continueUrl } : {}),
    });

    if (res.status === 429) {
        const err = new Error('Too many verification email requests.') as Error & { code: string };
        err.code = 'auth/too-many-requests';
        throw err;
    }

    if (!res.ok) {
        throw new Error('Failed to send verification email.');
    }
}

// Fires the "your password was changed" security alert without blocking the
// caller — the password change itself has already succeeded by the time this
// runs, so a slow or failed notification should never hold up the UI.
function notifyPasswordChanged(user: User): void {
    user.getIdToken()
        .then((idToken) => fetch('/api/user/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
        }))
        .catch((notifyError) => {
            console.error('Failed to send password change notification:', notifyError);
        });
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
    signIn: (email: string, password: string) => Promise<UserCredential>;
    // TODO: signInWithGoogle temporarily disabled
    // signInWithGoogle: () => Promise<UserCredential>;
    logOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signUp = async (email: string, password: string, displayName: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile with name
        if (userCredential.user) {
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
        }

        // Create Firestore user document with subscription defaults
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            displayName,
            email,
            subscription: {
                status: 'none',
                plan: null,
                stripeSubscriptionId: null,
                stripeCustomerId: null,
                currentPeriodEnd: null,
                createdAt: null,
            },
            tagCodes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // Send our branded verification email. Never let an email failure fail signup.
        try {
            await sendCustomVerificationEmail(userCredential.user);
        } catch (emailError) {
            console.error('Failed to send verification email during signup:', emailError);
        }

        return userCredential;
    };

    const signIn = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // TODO: Google Sign-In temporarily disabled
    // const signInWithGoogle = async () => {
    //     const provider = new GoogleAuthProvider();
    //     const userCredential = await signInWithPopup(auth, provider);

    //     // Create Firestore user document if it doesn't exist
    //     const userDoc = doc(db, 'users', userCredential.user.uid);
    //     const existing = await getDoc(userDoc);
    //     if (!existing.exists()) {
    //         await setDoc(userDoc, {
    //             displayName: userCredential.user.displayName || '',
    //             email: userCredential.user.email || '',
    //             subscription: {
    //                 status: 'none',
    //                 plan: null,
    //                 stripeSubscriptionId: null,
    //                 stripeCustomerId: null,
    //                 currentPeriodEnd: null,
    //                 createdAt: null,
    //             },
    //             tagCodes: [],
    //             createdAt: new Date().toISOString(),
    //             updatedAt: new Date().toISOString(),
    //         });
    //     }

    //     return userCredential;
    // };

    const logOut = () => {
        return signOut(auth);
    };

    const resetPassword = (email: string) => {
        return sendPasswordResetEmail(auth, email);
    };

    // Changes the password for the currently signed-in user. Requires the current
    // password to reauthenticate (Firebase rejects updatePassword on a stale session
    // otherwise). Does not sign the user out — updatePassword keeps the current
    // session valid, so no re-login is needed afterward.
    const changePassword = async (currentPassword: string, newPassword: string) => {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) {
            throw new Error('You must be signed in to change your password.');
        }

        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);

        notifyPasswordChanged(currentUser);
    };

    const resendVerificationEmail = async () => {
        if (!auth.currentUser) {
            throw new Error('You must be signed in to resend a verification email.');
        }
        await sendCustomVerificationEmail(auth.currentUser);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signUp,
            signIn,
            // TODO: signInWithGoogle temporarily disabled
            // signInWithGoogle,
            logOut,
            resetPassword,
            changePassword,
            resendVerificationEmail
        }}>
            {children}
        </AuthContext.Provider>
    );
}
