import {
    authenticateRequest,
    clearSessionCookie,
    envValue,
    getLegacyAdminToken,
    getSessionTokenForLogout,
    loginUser,
    logoutSession,
    makeSessionCookie,
    registerUser,
    statusFromError,
} from "./auth-store.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

function withCookie(response, cookieValue) {
    if (!cookieValue) return response;
    const headers = new Headers(response.headers);
    headers.append("set-cookie", cookieValue);
    return new Response(response.body, { status: response.status, headers });
}

export async function onRequestGet(context) {
    const { request } = context;
    try {
        const auth = await authenticateRequest(context, request);
        return json({ ok: true, authenticated: true, mode: auth.mode, user: auth.user });
    } catch {
        return json({ ok: false, authenticated: false, message: "Unauthorized" }, 401);
    }
}

export async function onRequestPost(context) {
    const { request } = context;
    try {
        const body = await readJson(request);
        const action = String(body.action || "login").trim().toLowerCase();

        if (action === "register") {
            const user = await registerUser(context, body);
            const login = await loginUser(context, {
                identifier: user.username,
                password: body.password,
            });
            const response = json({ ok: true, action: "register", user: login.user, mode: "session" });
            return withCookie(response, makeSessionCookie(login.token, request, login.maxAgeSeconds));
        }

        if (action === "login") {
            if (body.identifier || body.username) {
                const login = await loginUser(context, body);
                const response = json({ ok: true, action: "login", user: login.user, mode: "session" });
                return withCookie(response, makeSessionCookie(login.token, request, login.maxAgeSeconds));
            }

            const legacyProvided = String(body.token || body.password || getLegacyAdminToken(request) || "").trim();
            const expected = envValue("ADMIN_TOKEN", context).trim();
            if (!legacyProvided || !expected || legacyProvided !== expected) {
                return json({ message: "Unauthorized" }, 401);
            }
            return json({ ok: true, action: "login", mode: "legacy-token" });
        }

        return json({ message: "Unsupported action" }, 400);
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}

export async function onRequestDelete(context) {
    const { request } = context;
    try {
        const token = getSessionTokenForLogout(request);
        if (token) {
            await logoutSession(context, token);
        }

        const response = json({ ok: true });
        return withCookie(response, clearSessionCookie(request));
    } catch (err) {
        const message = String(err?.message || "Error");
        return json({ message }, statusFromError(err));
    }
}
