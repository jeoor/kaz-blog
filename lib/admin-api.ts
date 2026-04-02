const defaultBase = process.env.NODE_ENV === "production" ? "/cfapi" : "";

export const ADMIN_API_BASE = (process.env.NEXT_PUBLIC_ADMIN_API_BASE || defaultBase).trim().replace(/\/+$/, "");

export function adminApiUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return ADMIN_API_BASE ? `${ADMIN_API_BASE}${normalizedPath}` : normalizedPath;
}

export function adminCredentials(): RequestCredentials {
    if (!ADMIN_API_BASE) return "include";
    if (ADMIN_API_BASE.startsWith("/")) return "include";
    try {
        // 若 base 与当前站点同源，可安全携带 cookie（如有）。
        if (typeof window !== "undefined") {
            const baseOrigin = new URL(ADMIN_API_BASE, window.location.origin).origin;
            if (baseOrigin === window.location.origin) return "include";
        }
    } catch {
        // 忽略解析错误；默认不携带凭据更安全。
    }
    // 跨域时不携带凭据，避免 CORS/第三方 cookie 问题。
    return "omit";
}
