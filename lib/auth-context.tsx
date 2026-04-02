"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApiUrl, adminCredentials } from "./admin-api";

type AuthUser = { username: string; displayName?: string; role?: string };

type AuthState = {
    loading: boolean;
    isLoggedIn: boolean;
    user: AuthUser | null;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
    loading: true,
    isLoggedIn: false,
    user: null,
    logout: async () => { },
    refresh: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    const checkSession = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(adminApiUrl("/api/admin/session"), {
                credentials: adminCredentials(),
            });
            const data = (await res.json()) as Record<string, unknown>;
            if (data?.authenticated) {
                setIsLoggedIn(true);
                setUser((data.user as AuthUser) ?? null);
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        } catch {
            setIsLoggedIn(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void checkSession(true);
    }, [checkSession]);

    // 对外暴露，便于调用方（如登录表单）在不重挂载的情况下主动重新校验。
    const refresh = useCallback(() => checkSession(false), [checkSession]);

    const logout = useCallback(async () => {
        await fetch(adminApiUrl("/api/admin/session"), {
            method: "DELETE",
            credentials: adminCredentials(),
        }).catch(() => { });
        setIsLoggedIn(false);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ loading, isLoggedIn, user, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
