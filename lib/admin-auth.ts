export const ADMIN_SESSION_COOKIE = "admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env: ${name}`);
    }
    return value;
}

function adminSecret(): Uint8Array {
    const secret = requiredEnv("ADMIN_TOKEN");
    return new TextEncoder().encode(secret);
}

function bytesToBase64(bytes: Uint8Array): string {
    if (typeof btoa === "function") {
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    // Node.js runtime
    return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(base64: string): Uint8Array {
    if (typeof atob === "function") {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    // Node.js runtime
    return new Uint8Array(Buffer.from(base64, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
    return base64ToBytes(padded);
}

function textToBytes(input: string): Uint8Array {
    return new TextEncoder().encode(input);
}

function toBufferSource(bytes: Uint8Array): BufferSource {
    // TypeScript's WebCrypto typings expect ArrayBuffer-backed views.
    // In newer TS versions, Uint8Array may be typed as Uint8Array<ArrayBufferLike>.
    return bytes as unknown as BufferSource;
}

function bytesToText(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

async function hmacSign(data: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        toBufferSource(adminSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const sig = await crypto.subtle.sign("HMAC", key, toBufferSource(textToBytes(data)));
    return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(data: string, signatureB64Url: string): Promise<boolean> {
    const key = await crypto.subtle.importKey(
        "raw",
        toBufferSource(adminSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
    );

    return crypto.subtle.verify(
        "HMAC",
        key,
        toBufferSource(base64UrlDecodeToBytes(signatureB64Url)),
        toBufferSource(textToBytes(data)),
    );
}

export function getAdminTokenFromRequest(request: Request): string | null {
    const header = request.headers.get("x-admin-token");
    if (header) return header;

    const auth = request.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice("bearer ".length).trim();
    }

    return null;
}

export function isAdminTokenValid(provided: string | null): boolean {
    if (!provided) return false;
    return provided === requiredEnv("ADMIN_TOKEN");
}

export async function createAdminSessionJwt(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        sub: "admin",
        role: "admin",
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
    };

    const payloadB64Url = base64UrlEncode(textToBytes(JSON.stringify(payload)));
    const signature = await hmacSign(payloadB64Url);
    return `${payloadB64Url}.${signature}`;
}

export async function verifyAdminSessionJwt(token: string | null | undefined): Promise<boolean> {
    if (!token) return false;
    try {
        const parts = token.split(".");
        if (parts.length !== 2) return false;

        const payloadB64Url = parts[0];
        const sig = parts[1];

        const ok = await hmacVerify(payloadB64Url, sig);
        if (!ok) return false;

        const payloadJson = bytesToText(base64UrlDecodeToBytes(payloadB64Url));
        const payload = JSON.parse(payloadJson) as { exp?: number; sub?: string };
        if (payload.sub !== "admin") return false;
        if (typeof payload.exp !== "number") return false;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
    } catch {
        return false;
    }
}
