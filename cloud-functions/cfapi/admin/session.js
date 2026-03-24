function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

function getAdminTokenFromRequest(request) {
    const header = request.headers.get("x-admin-token");
    if (header) return header;

    const auth = request.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
        return auth.slice("bearer ".length).trim();
    }

    return null;
}

async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

function isAdminTokenValid(token) {
    const expected = String(process.env.ADMIN_TOKEN || "").trim();
    if (!expected || !token) return false;
    return token === expected;
}

export async function onRequestPost({ request }) {
    const body = await readJson(request);
    const provided = String(body.token || body.password || getAdminTokenFromRequest(request) || "").trim();
    if (!isAdminTokenValid(provided)) {
        return json({ message: "Unauthorized" }, 401);
    }
    return json({ ok: true });
}

export async function onRequestDelete() {
    return json({ ok: true });
}
