const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripQuotes(value) {
    const v = String(value ?? "").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    return v;
}

function loadEnvLocalIfNeeded() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;

    const text = fs.readFileSync(envPath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx <= 0) continue;

        const key = line.slice(0, idx).trim();
        const value = stripQuotes(line.slice(idx + 1));
        if (!key) continue;

        // don't override env passed by the shell
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

function classifyError(err) {
    const code = err?.code || err?.errno;
    const status = err?.status;
    const message = String(err?.message || "");

    const networkCodes = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED"]);
    const isNetwork = networkCodes.has(code) || message.includes("fetch failed") || message.includes("socket hang up");

    const isNotFound = status === 404 || code === "object_not_found" || message.includes("Could not find database");
    const isAuth = status === 401 || status === 403 || code === "unauthorized" || code === "restricted_resource";

    return { code, status, isNetwork, isNotFound, isAuth, message };
}

async function withRetry(fn, { retries = 3, baseDelayMs = 400 } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const info = classifyError(err);
            if (!info.isNetwork) break;
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            console.warn(`[notion:check] network error (${info.code || "unknown"}), retry ${attempt}/${retries} in ${delay}ms`);
            await sleep(delay);
        }
    }
    throw lastErr;
}

async function main() {
    loadEnvLocalIfNeeded();

    const token = String(process.env.NOTION_TOKEN || "").trim();
    const databaseId = String(process.env.NOTION_DATABASE_ID || "").trim();

    if (!token || !databaseId) {
        console.error("[notion:check] Missing NOTION_TOKEN or NOTION_DATABASE_ID in .env.local");
        process.exitCode = 1;
        return;
    }

    console.log("[notion:check] Using NOTION_TOKEN:", token ? `${token.slice(0, 6)}…` : "(empty)");
    console.log("[notion:check] Using NOTION_DATABASE_ID:", databaseId);

    const client = new Client({ auth: token });

    try {
        const db = await withRetry(() => client.databases.retrieve({ database_id: databaseId }));
        const title = Array.isArray(db?.title) ? db.title.map((t) => t?.plain_text || "").join("") : "";
        console.log("[notion:check] Database OK:", title || "(no title)");

        const props = db?.properties && typeof db.properties === "object" ? db.properties : {};
        const propEntries = Object.entries(props);
        if (propEntries.length > 0) {
            console.log("[notion:check] Database properties (name: type):");
            for (const [name, def] of propEntries) {
                const t = def && typeof def === "object" ? def.type : "unknown";
                console.log(`  - ${name}: ${t}`);
            }

            const titleProp = propEntries.find(([, def]) => def && typeof def === "object" && def.type === "title");
            if (titleProp) {
                console.log("[notion:check] Detected title property:", titleProp[0]);
            }

            const envProps = {
                slug: String(process.env.NOTION_PROP_SLUG || "Slug").trim(),
                date: String(process.env.NOTION_PROP_DATE || "Date").trim(),
                description: String(process.env.NOTION_PROP_DESCRIPTION || "Description").trim(),
                author: String(process.env.NOTION_PROP_AUTHOR || "Author").trim(),
                keywords: String(process.env.NOTION_PROP_KEYWORDS || "Keywords").trim(),
                published: String(process.env.NOTION_PROP_PUBLISHED || "Published").trim(),
            };

            const expectedTypes = {
                slug: ["rich_text"],
                date: ["date"],
                description: ["rich_text"],
                author: ["rich_text"],
                keywords: ["multi_select", "rich_text"],
                published: ["checkbox", "formula"],
            };

            const existingNames = new Set(propEntries.map(([name]) => name));
            const missing = Object.entries(envProps)
                .filter(([, name]) => name && !existingNames.has(name))
                .map(([key, name]) => `${key} -> ${name}`);

            if (missing.length > 0) {
                console.log("[notion:check] ❗Schema mismatch: these expected properties are missing in your database:");
                for (const m of missing) console.log("  -", m);
                console.log(
                    "[notion:check] Fix: either create the missing columns in Notion, or set NOTION_PROP_* in .env.local to match your existing column names."
                );
            }

            // Type mismatches (common cause of validation_error)
            const propTypeByName = new Map(propEntries.map(([name, def]) => [name, def && typeof def === "object" ? def.type : "unknown"]));
            const typeMismatches = [];
            for (const [key, name] of Object.entries(envProps)) {
                if (!name) continue;
                const actualType = propTypeByName.get(name);
                if (!actualType || actualType === "unknown") continue;
                const exp = expectedTypes[key];
                if (Array.isArray(exp) && exp.length > 0 && !exp.includes(actualType)) {
                    typeMismatches.push({ key, name, actualType, expected: exp });
                }
            }
            if (typeMismatches.length > 0) {
                console.log("[notion:check] ❗Type mismatch: these properties exist but have incompatible types:");
                for (const m of typeMismatches) {
                    console.log(`  - ${m.key} -> ${m.name}: ${m.actualType} (expected ${m.expected.join("/")})`);
                }
                console.log(
                    "[notion:check] Fix: Notion 通常不能直接改列类型。建议新建正确类型的列，然后用 NOTION_PROP_* 映射到新列名。"
                );
            }
            console.log(
                "[notion:check] If you see validation_error about missing columns, set these in .env.local to match your DB column names:\n" +
                "  NOTION_PROP_SLUG=...\n" +
                "  NOTION_PROP_DATE=...\n" +
                "  NOTION_PROP_DESCRIPTION=...\n" +
                "  NOTION_PROP_AUTHOR=...\n" +
                "  NOTION_PROP_KEYWORDS=...\n" +
                "  NOTION_PROP_PUBLISHED=...\n" +
                "  (optional) NOTION_PROP_TITLE=..."
            );
        }

        const res = await withRetry(() =>
            client.databases.query({
                database_id: databaseId,
                page_size: 1,
            })
        );

        console.log("[notion:check] Query OK. First page exists:", Boolean(res?.results?.[0]));
        console.log("[notion:check] ✅ Notion connection looks good.");
    } catch (err) {
        const info = classifyError(err);

        console.error("[notion:check] ❌ Notion request failed.");
        if (info.status) console.error("status:", info.status);
        if (info.code) console.error("code:", info.code);
        if (info.message) console.error("message:", info.message);

        if (info.isNotFound) {
            console.error(
                "\nLikely causes:\n" +
                "1) NOTION_DATABASE_ID is not the real database id (copied wrong part of URL), or\n" +
                "2) The database is not shared with your Notion integration.\n" +
                "\nFix:\n" +
                "- Open the database in Notion → Share/Connections → add your integration, then retry.\n"
            );
        } else if (info.isAuth) {
            console.error(
                "\nLikely causes:\n" +
                "- NOTION_TOKEN is wrong, revoked, or integration lacks permission.\n" +
                "\nFix:\n" +
                "- Re-copy the integration token and ensure the database is shared with it.\n"
            );
        } else if (info.isNetwork) {
            console.error(
                "\nLikely causes:\n" +
                "- Network instability (ECONNRESET) / proxy / firewall.\n" +
                "\nFix:\n" +
                "- Retry later, try another network, or run in WSL; ensure api.notion.com is reachable.\n"
            );
        }

        process.exitCode = 1;
    }
}

main();
