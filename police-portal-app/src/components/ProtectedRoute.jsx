import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    if (user === undefined) {
        return (
            <div className="h-screen w-full bg-dark-bg flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                <p className="mt-8 font-mono text-xs text-gray-500 animate-pulse tracking-[0.3em] uppercase">Checking Credentials...</p>
            </div>
        );
    }

    if (!user && !localStorage.getItem('dev_access')) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
