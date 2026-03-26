import { authenticateRequest, envValue, statusFromError } from "./auth-store.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

function normalizeApiBase(input) {
    const value = String(input || "").trim().replace(/\/+$/, "");
    return value || "https://7bu.top/api/v1";
}

export async function onRequestPost(context) {
    const { request } = context;

    try {
        await authenticateRequest(context, request);

        const form = await request.formData();
        const file = form.get("file");

        if (!(file instanceof File)) {
            return json({ message: "缺少图片文件" }, 400);
        }

        const outbound = new FormData();
        outbound.append("file", file, file.name || "image");
        outbound.append("permission", String(form.get("permission") || "1"));

        const apiBase = normalizeApiBase(envValue("IMAGE_HOST_API_BASE", context) || envValue("SEVEN_BU_API_BASE", context));
        const token = String(envValue("IMAGE_HOST_TOKEN", context) || envValue("SEVEN_BU_TOKEN", context) || envValue("SEVENBU_TOKEN", context) || envValue("SEVEN_BU_BEARER_TOKEN", context) || envValue("SEVENBU_BEARER_TOKEN", context) || envValue("7BU_TOKEN", context) || envValue("BU7_TOKEN", context)).trim();

        const headers = new Headers({
            Accept: "application/json",
        });

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const upstreamResponse = await fetch(`${apiBase}/upload`, {
            method: "POST",
            headers,
            body: outbound,
        });

        const text = await upstreamResponse.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { message: text || "图床返回了非 JSON 响应" };
        }

        return json(data, upstreamResponse.status);
    } catch (error) {
        return json({ message: String(error?.message || "图片上传失败") }, statusFromError(error));
    }
}
