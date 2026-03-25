import {
    authenticateRequest,
    isOwnerRole,
    listManagedUsers,
    statusFromError,
    updateManagedUser,
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

function assertOwner(auth) {
    if (!auth?.user || !isOwnerRole(auth.user.role)) {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
}

export async function onRequestGet(context) {
    const { request } = context;
    try {
        const auth = await authenticateRequest(context, request);
        assertOwner(auth);
        const users = await listManagedUsers(context);
        return json({ ok: true, users });
    } catch (err) {
        return json({ message: String(err?.message || "Error") }, statusFromError(err));
    }
}

export async function onRequestPost(context) {
    const { request } = context;
    try {
        const auth = await authenticateRequest(context, request);
        assertOwner(auth);
        const body = await readJson(request);
        const user = await updateManagedUser(context, { ...body, actor: auth.user });
        return json({ ok: true, user });
    } catch (err) {
        return json({ message: String(err?.message || "Error") }, statusFromError(err));
    }
}