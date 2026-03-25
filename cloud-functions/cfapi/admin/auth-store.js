const SESSION_COOKIE_NAME = "eo_admin_session";
const META_KEY = "author_meta";

function toJsonString(value) {
    return JSON.stringify(value);
}

function parseJsonString(input, fallback = null) {
    try {
        return JSON.parse(String(input || ""));
    } catch {
        return fallback;
    }
}

function nowMs() {
    return Date.now();
}

function utf8ToHex(input) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(String(input || ""));
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export function envValue(name, context) {
    const runtimeEnv = context?.env;
    const fromContext = runtimeEnv && Object.prototype.hasOwnProperty.call(runtimeEnv, name)
        ? runtimeEnv[name]
        : undefined;
    if (fromContext !== undefined && fromContext !== null && String(fromContext) !== "") {
        return String(fromContext);
    }

    if (typeof process !== "undefined" && process.env) {
        const fromProcess = process.env[name];
        if (fromProcess !== undefined && fromProcess !== null && String(fromProcess) !== "") {
            return String(fromProcess);
        }
    }

    return "";
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function randomBytes(length) {
    if (!globalThis.crypto?.getRandomValues) {
        throw httpError(500, "Crypto API unavailable");
    }
    const out = new Uint8Array(length);
    globalThis.crypto.getRandomValues(out);
    return out;
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function hexToBytes(hex) {
    const normalized = String(hex || "").trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
        throw httpError(400, "Invalid hex string");
    }
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
        bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
    }
    return bytes;
}

function normalizeUsername(input) {
    const value = String(input || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(value)) {
        throw httpError(400, "用户名需为 3-32 位，只能包含小写字母、数字、点、下划线、短横线");
    }
    return value;
}

function normalizeDisplayName(input, fallback) {
    const value = String(input || "").trim();
    if (value) return value.slice(0, 80);
    return String(fallback || "");
}

function userKey(username) {
    return `author_user_${utf8ToHex(username)}`;
}

function sessionKey(token) {
    return `author_session_${utf8ToHex(token)}`;
}

function parseCookies(request) {
    const raw = request.headers.get("cookie") || "";
    const out = {};
    for (const part of raw.split(";")) {
        const index = part.indexOf("=");
        if (index <= 0) continue;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (!name) continue;
        out[name] = decodeURIComponent(value);
    }
    return out;
}

function getBearerToken(request) {
    const auth = request.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice("bearer ".length).trim();
    }
    return "";
}

function getSessionTokenFromRequest(request) {
    const fromHeader = request.headers.get("x-session-token");
    if (fromHeader) return String(fromHeader).trim();

    const cookies = parseCookies(request);
    if (cookies[SESSION_COOKIE_NAME]) return String(cookies[SESSION_COOKIE_NAME]).trim();

    const bearer = getBearerToken(request);
    if (bearer) return String(bearer).trim();

    return "";
}

export function sessionCookieName() {
    return SESSION_COOKIE_NAME;
}

export function makeSessionCookie(token, request, maxAgeSeconds) {
    const secure = request.url.startsWith("https://") ? "; Secure" : "";
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearSessionCookie(request) {
    const secure = request.url.startsWith("https://") ? "; Secure" : "";
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function resolveKv(context) {
    const bindingName = envValue("AUTH_KV_BINDING", context) || "AUTH_KV";
    const fromContext = context?.env?.[bindingName];
    const fromGlobal = globalThis[bindingName];
    const kv = fromContext || fromGlobal || null;
    if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function" || typeof kv.delete !== "function") {
        throw httpError(500, `Missing KV binding: ${bindingName}`);
    }
    return kv;
}

async function kvGetText(kv, key) {
    const raw = await kv.get(key);
    if (raw === null || raw === undefined) return "";
    return String(raw);
}

async function kvPutText(kv, key, value, ttlSeconds = 0) {
    const text = String(value);
    if (ttlSeconds > 0) {
        try {
            await kv.put(key, text, { expirationTtl: ttlSeconds });
            return;
        } catch {
            // Some runtimes don't support put options.
        }
    }
    await kv.put(key, text);
}

async function loadMeta(kv) {
    const raw = await kvGetText(kv, META_KEY);
    const parsed = parseJsonString(raw, null);
    if (!parsed || typeof parsed !== "object") {
        return { userCount: 0, usernames: [], createdAt: nowMs(), updatedAt: nowMs() };
    }
    const rawUsernames = Array.isArray(parsed.usernames) ? parsed.usernames : [];
    const usernames = Array.from(new Set(rawUsernames.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)));
    return {
        userCount: Number.isFinite(parsed.userCount) ? parsed.userCount : 0,
        usernames,
        createdAt: Number.isFinite(parsed.createdAt) ? parsed.createdAt : nowMs(),
        updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : nowMs(),
    };
}

async function saveMeta(kv, meta) {
    await kvPutText(kv, META_KEY, toJsonString(meta));
}

async function reconcileMetaUsers(kv, meta, usernames) {
    const normalized = Array.from(new Set((usernames || []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)));
    const nextCount = normalized.length;
    const prevUsernames = Array.isArray(meta?.usernames) ? meta.usernames : [];
    const prevCount = Number(meta?.userCount || 0);
    const sameCount = prevCount === nextCount;
    const sameNames = prevUsernames.length === normalized.length && prevUsernames.every((value, index) => value === normalized[index]);
    if (sameCount && sameNames) {
        return {
            ...meta,
            userCount: nextCount,
            usernames: normalized,
        };
    }

    const nextMeta = {
        ...meta,
        userCount: nextCount,
        usernames: normalized,
        updatedAt: nowMs(),
    };
    await saveMeta(kv, nextMeta);
    return nextMeta;
}

async function rememberUsername(kv, username) {
    const normalized = String(username || "").trim().toLowerCase();
    if (!normalized) return;

    const meta = await loadMeta(kv);
    if (meta.usernames.includes(normalized)) return;

    meta.usernames = [...meta.usernames, normalized];
    meta.updatedAt = nowMs();
    await saveMeta(kv, meta);
}

async function derivePasswordHash(password, saltHex, iterations = 120000) {
    if (!globalThis.crypto?.subtle) {
        throw httpError(500, "Crypto API unavailable");
    }
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = saltHex ? hexToBytes(saltHex) : randomBytes(16);

    const keyMaterial = await globalThis.crypto.subtle.importKey(
        "raw",
        passwordBytes,
        { name: "PBKDF2" },
        false,
        ["deriveBits"],
    );

    const bits = await globalThis.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: saltBytes,
            iterations,
        },
        keyMaterial,
        256,
    );

    return {
        saltHex: bytesToHex(saltBytes),
        hashHex: bytesToHex(new Uint8Array(bits)),
        iterations,
    };
}

function sessionDays(context) {
    const configured = Number.parseInt(envValue("AUTH_SESSION_DAYS", context) || "30", 10);
    if (!Number.isFinite(configured) || configured <= 0) return 30;
    return Math.min(configured, 365);
}

function allowOpenRegistration(context) {
    const configured = (envValue("AUTH_ALLOW_OPEN_REGISTRATION", context) || "").trim().toLowerCase();
    return configured === "1" || configured === "true" || configured === "yes";
}

export async function getRegistrationStatus(context) {
    const kv = resolveKv(context);
    const meta = await loadMeta(kv);
    const userCount = Number(meta.userCount || 0);
    return {
        hasUsers: userCount > 0,
        userCount,
        inviteRequired: userCount > 0 && !allowOpenRegistration(context),
    };
}

function publicManagedUser(user) {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: ensureStoredRole(user.role),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        disabledAt: user.disabledAt || null,
    };
}

function toPublicUser(user) {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: ensureStoredRole(user.role),
        createdAt: user.createdAt,
    };
}

async function saveUser(kv, user) {
    delete user.email;
    user.updatedAt = nowMs();
    await kvPutText(kv, userKey(user.username), toJsonString(user));
}

export function isOwnerRole(role) {
    return String(role || "").toLowerCase() === "owner";
}

function ensureUserEnabled(user) {
    if (user && user.disabledAt) {
        throw httpError(403, "账号已被禁用，请联系 owner");
    }
}

function ensureManageableRole(role) {
    const value = String(role || "").trim().toLowerCase();
    if (value !== "owner" && value !== "author") {
        throw httpError(400, "角色无效");
    }
    return value;
}

function ensureStoredRole(role) {
    const value = String(role || "").trim().toLowerCase();
    if (value !== "owner" && value !== "author") {
        throw httpError(500, "Invalid stored role");
    }
    return value;
}

async function kvListAll(kv, prefix) {
    if (typeof kv.list !== "function") {
        throw httpError(500, "当前 KV 绑定不支持 list，无法管理作者");
    }

    const keys = [];
    let cursor = undefined;
    do {
        const resp = await kv.list({ prefix, cursor, limit: 1000 });
        keys.push(...(Array.isArray(resp?.keys) ? resp.keys : []));
        cursor = resp?.list_complete ? undefined : resp?.cursor;
    } while (cursor);

    return keys;
}

function listedKeyName(entry) {
    if (typeof entry === "string") return entry.trim();
    if (entry && typeof entry === "object") {
        if (typeof entry.name === "string") return entry.name.trim();
        if (typeof entry.key === "string") return entry.key.trim();
    }
    return "";
}

async function loadUserByUsername(kv, username) {
    const raw = await kvGetText(kv, userKey(username));
    if (!raw) return null;
    const user = parseJsonString(raw, null);
    if (!user || typeof user !== "object") return null;
    user.role = ensureStoredRole(user.role);
    return user;
}

async function loadUserByIdentifier(kv, identifier) {
    const value = String(identifier || "").trim().toLowerCase();
    if (!value) return null;
    return loadUserByUsername(kv, normalizeUsername(value));
}

export async function registerUser(context, payload) {
    const kv = resolveKv(context);
    const username = normalizeUsername(payload?.username);
    const password = String(payload?.password || "");
    const inviteCode = String(payload?.inviteCode || "").trim();

    if (password.length < 8) {
        throw httpError(400, "密码至少 8 位");
    }

    const existingByUsername = await loadUserByUsername(kv, username);
    if (existingByUsername) {
        throw httpError(409, "用户名已存在");
    }

    const meta = await loadMeta(kv);
    const userCount = Number(meta.userCount || 0);
    if (userCount > 0 && !allowOpenRegistration(context)) {
        const expectedInvite = envValue("REGISTER_INVITE_CODE", context).trim();
        if (!expectedInvite) {
            throw httpError(403, "注册未开放，请联系管理员创建账号");
        }
        if (!inviteCode || inviteCode !== expectedInvite) {
            throw httpError(403, "邀请码无效");
        }
    }

    const passwordHash = await derivePasswordHash(password);
    const now = nowMs();
    const role = userCount === 0 ? "owner" : "author";
    const user = {
        id: bytesToHex(randomBytes(16)),
        username,
        displayName: normalizeDisplayName(payload?.displayName, username),
        role,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
    };

    await kvPutText(kv, userKey(username), toJsonString(user));

    meta.userCount = userCount + 1;
    meta.usernames = Array.from(new Set([...(Array.isArray(meta.usernames) ? meta.usernames : []), username]));
    meta.updatedAt = now;
    await saveMeta(kv, meta);

    return toPublicUser(user);
}

async function verifyPassword(password, stored) {
    if (!stored || typeof stored !== "object") return false;
    const saltHex = String(stored.saltHex || "");
    const hashHex = String(stored.hashHex || "");
    const iterations = Number.isFinite(stored.iterations) ? stored.iterations : 120000;
    if (!saltHex || !hashHex) return false;

    const candidate = await derivePasswordHash(String(password || ""), saltHex, iterations);
    return candidate.hashHex === hashHex;
}

export async function loginUser(context, payload) {
    const kv = resolveKv(context);
    const identifier = String(payload?.identifier || payload?.username || "").trim();
    const password = String(payload?.password || "");

    if (!identifier || !password) {
        throw httpError(400, "请输入账号和密码");
    }

    const user = await loadUserByIdentifier(kv, identifier);
    if (!user) {
        throw httpError(401, "账号或密码错误");
    }
    ensureUserEnabled(user);

    const pass = await verifyPassword(password, user.password);
    if (!pass) {
        throw httpError(401, "账号或密码错误");
    }

    const now = nowMs();
    const ttlDays = sessionDays(context);
    const ttlSeconds = ttlDays * 24 * 60 * 60;
    const expiresAt = now + ttlSeconds * 1000;
    const token = bytesToHex(randomBytes(32));

    const previousToken = String(user.currentSessionToken || "").trim();
    if (previousToken) {
        await kv.delete(sessionKey(previousToken));
    }

    const session = {
        token,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: now,
        expiresAt,
    };

    await kvPutText(kv, sessionKey(token), toJsonString(session), ttlSeconds);
    user.currentSessionToken = token;
    await saveUser(kv, user);
    await rememberUsername(kv, user.username);
    return {
        token,
        maxAgeSeconds: ttlSeconds,
        session,
        user: toPublicUser(user),
    };
}

async function readSessionByToken(kv, token) {
    if (!token) return null;
    const raw = await kvGetText(kv, sessionKey(token));
    if (!raw) return null;

    const session = parseJsonString(raw, null);
    if (!session || typeof session !== "object") {
        await kv.delete(sessionKey(token));
        return null;
    }

    if (Number(session.expiresAt || 0) <= nowMs()) {
        await kv.delete(sessionKey(token));
        return null;
    }
    return session;
}

export async function authenticateRequest(context, request) {
    const token = getSessionTokenFromRequest(request);
    if (!token) {
        throw httpError(401, "Unauthorized");
    }

    const kv = resolveKv(context);
    const session = await readSessionByToken(kv, token);
    if (!session) {
        throw httpError(401, "Unauthorized");
    }

    const user = await loadUserByUsername(kv, session.username);
    if (!user) {
        await kv.delete(sessionKey(token));
        throw httpError(401, "Unauthorized");
    }
    if (user.disabledAt) {
        await kv.delete(sessionKey(token));
        throw httpError(401, "Unauthorized");
    }

    const currentSessionToken = String(user.currentSessionToken || "").trim();
    if (!currentSessionToken || currentSessionToken !== token) {
        await kv.delete(sessionKey(token));
        throw httpError(401, "Unauthorized");
    }

    return {
        mode: "session",
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
        },
        sessionToken: token,
    };
}

export async function logoutSession(context, token) {
    if (!token) return;
    const kv = resolveKv(context);
    const session = await readSessionByToken(kv, token);
    await kv.delete(sessionKey(token));
    if (!session?.username) return;

    const user = await loadUserByUsername(kv, session.username);
    if (!user) return;

    if (String(user.currentSessionToken || "").trim() === token) {
        delete user.currentSessionToken;
        await saveUser(kv, user);
    }
}

export function getSessionTokenForLogout(request) {
    return getSessionTokenFromRequest(request);
}

export async function listManagedUsers(context) {
    const kv = resolveKv(context);
    let meta = await loadMeta(kv);
    const usersByUsername = new Map();

    for (const username of meta.usernames || []) {
        const user = await loadUserByUsername(kv, username);
        if (!user) continue;
        usersByUsername.set(user.username, publicManagedUser(user));
    }

    if (usersByUsername.size < Number(meta.userCount || 0) && typeof kv.list === "function") {
        const keys = await kvListAll(kv, "author_user_");

        for (const entry of keys) {
            const key = listedKeyName(entry);
            if (!key) continue;
            const raw = await kvGetText(kv, key);
            const user = parseJsonString(raw, null);
            if (!user || typeof user !== "object") continue;
            const publicUser = publicManagedUser(user);
            usersByUsername.set(publicUser.username, publicUser);
            await rememberUsername(kv, user.username);
        }
    }

    const users = Array.from(usersByUsername.values());
    const usernames = users.map((user) => user.username);
    meta = await reconcileMetaUsers(kv, meta, usernames);

    users.sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0));
    return users;
}

export async function updateManagedUser(context, payload) {
    const kv = resolveKv(context);
    const actor = payload?.actor;
    const targetUsername = normalizeUsername(payload?.username);
    const action = String(payload?.action || "").trim().toLowerCase();
    const user = await loadUserByUsername(kv, targetUsername);

    if (!user) {
        throw httpError(404, "用户不存在");
    }
    if (!isOwnerRole(actor?.role)) {
        throw httpError(403, "Forbidden");
    }

    const actorUsername = String(actor?.username || "").trim().toLowerCase();
    const isSelf = actorUsername === targetUsername;

    if (action === "set-profile") {
        const nextDisplayName = normalizeDisplayName(payload?.displayName, user.username);
        const nextRole = ensureManageableRole(payload?.role || user.role);
        if (isSelf && nextRole !== "owner") {
            throw httpError(400, "不能移除自己的 owner 角色");
        }
        user.displayName = nextDisplayName;
        user.role = nextRole;
        await saveUser(kv, user);
        return publicManagedUser(user);
    }

    if (action === "disable") {
        if (isSelf) {
            throw httpError(400, "不能禁用自己的账号");
        }
        user.disabledAt = nowMs();
        const currentToken = String(user.currentSessionToken || "").trim();
        if (currentToken) {
            await kv.delete(sessionKey(currentToken));
            delete user.currentSessionToken;
        }
        await saveUser(kv, user);
        return publicManagedUser(user);
    }

    if (action === "enable") {
        delete user.disabledAt;
        await saveUser(kv, user);
        return publicManagedUser(user);
    }

    if (action === "reset-password") {
        const password = String(payload?.password || "");
        if (password.length < 8) {
            throw httpError(400, "密码至少 8 位");
        }
        user.password = await derivePasswordHash(password);
        const currentToken = String(user.currentSessionToken || "").trim();
        if (currentToken) {
            await kv.delete(sessionKey(currentToken));
            delete user.currentSessionToken;
        }
        await saveUser(kv, user);
        return publicManagedUser(user);
    }

    throw httpError(400, "Unsupported action");
}

export function statusFromError(err) {
    if (typeof err?.status === "number") return err.status;
    const msg = String(err?.message || "Error");
    if (msg === "Unauthorized") return 401;
    if (msg.startsWith("Missing env:")) return 500;
    return 400;
}
