'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
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

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
    signIn: (email: string, password: string) => Promise<UserCredential>;
    // TODO: signInWithGoogle temporarily disabled
    // signInWithGoogle: () => Promise<UserCredential>;
    logOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
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
            resendVerificationEmail
        }}>
            {children}
        </AuthContext.Provider>
    );
}
