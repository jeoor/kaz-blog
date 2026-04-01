"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApiUrl, adminCredentials } from "./admin-api";

type AuthUser = { username: string; displayName?: string; role?: string };

type AuthState = {
    loading: boolean;
    isLoggedIn: boolean;
    user: AuthUser | null;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
    loading: true,
    isLoggedIn: false,
    user: null,
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch(adminApiUrl("/api/admin/session"), {
            credentials: adminCredentials(),
        })
            .then((res) => res.json() as Promise<Record<string, unknown>>)
            .then((data) => {
                if (cancelled) return;
                if (data?.authenticated) {
                    setIsLoggedIn(true);
                    setUser((data.user as AuthUser) ?? null);
                } else {
                    setIsLoggedIn(false);
                    setUser(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setIsLoggedIn(false);
                    setUser(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const logout = useCallback(async () => {
        await fetch(adminApiUrl("/api/admin/session"), {
            method: "DELETE",
            credentials: adminCredentials(),
        }).catch(() => { });
        setIsLoggedIn(false);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ loading, isLoggedIn, user, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
