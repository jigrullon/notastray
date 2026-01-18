'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    User,
    UserCredential,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
    signIn: (email: string, password: string) => Promise<UserCredential>;
    signInWithGoogle: () => Promise<UserCredential>;
    logOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
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

        // Send verification email
        await sendEmailVerification(userCredential.user);

        return userCredential;
    };

    const signIn = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const logOut = () => {
        return signOut(auth);
    };

    const resetPassword = (email: string) => {
        return sendPasswordResetEmail(auth, email);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signUp,
            signIn,
            signInWithGoogle,
            logOut,
            resetPassword
        }}>
            {children}
        </AuthContext.Provider>
    );
}
