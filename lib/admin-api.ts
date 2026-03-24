const defaultBase = process.env.NODE_ENV === "production" ? "/cfapi" : "";

export const ADMIN_API_BASE = (process.env.NEXT_PUBLIC_ADMIN_API_BASE || defaultBase).trim().replace(/\/+$/, "");

export function adminApiUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return ADMIN_API_BASE ? `${ADMIN_API_BASE}${normalizedPath}` : normalizedPath;
}

export function adminCredentials(): RequestCredentials {
    if (!ADMIN_API_BASE) return "include";
    try {
        // If the base is same-origin, cookies (if any) are safe to include.
        if (typeof window !== "undefined") {
            const baseOrigin = new URL(ADMIN_API_BASE).origin;
            if (baseOrigin === window.location.origin) return "include";
        }
    } catch {
        // Ignore parse errors; default to omitting credentials for safety.
    }
    // Cross-origin: omit credentials to avoid CORS/3p-cookie issues.
    return "omit";
}
