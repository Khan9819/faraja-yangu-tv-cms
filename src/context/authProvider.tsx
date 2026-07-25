import { createContext, useEffect, useState } from 'react'

const AuthContext: any = createContext({})

interface Notification{
    id: number;
    type: string;
    message: string;
    read: boolean;
}

interface PhoneAccount {
    id: number;
    phone_number: string;
    account_name: string;
    account_type: string;
}

interface Profile {
    user: {
        id: number;
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        phone_number: string;
        last_seen: string;
        active_workspace: number;
        avatar: string;
        permission: string;
        country: string;
        notifications: Notification[] | null
    },
    workspace: {
        billing: {
            id: number;
            currency: string;
            plan: string;
            status: string;
            account: PhoneAccount | null
        },
    }
}

interface Auth {
    access: string;
    refresh: string;
}

export const AuthProvider = ({ children }: any) => {
    const [auth, setAuthState] = useState<Auth | null>(() => {
        const stored = sessionStorage.getItem('auth');
        return stored ? JSON.parse(stored) : null;
    });
    const [profile, setProfile] = useState<Profile | null>(null)

    const setAuth = (value: any) => {
        setAuthState(value);
        if (value === null) {
            sessionStorage.removeItem('auth');
        } else if (typeof value === 'function') {
            const next = value(auth);
            sessionStorage.setItem('auth', JSON.stringify(next));
        } else {
            sessionStorage.setItem('auth', JSON.stringify(value));
        }
    };

    return (
        <AuthContext.Provider value={{ auth, setAuth, profile, setProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext;