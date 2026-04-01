export function isNotionConnectionErrorMessage(message: string): boolean {
    const text = String(message || "").trim();
    if (!text) return false;

    return (
        /api\.notion\.com/i.test(text)
        || /request to\s+https?:\/\/.*notion/i.test(text)
        || /failed,\s*reason:/i.test(text)
        || /fetch failed/i.test(text)
        || /econnreset|enotfound|etimedout|eai_again/i.test(text)
        || /network/i.test(text)
    );
}

export function toFriendlyNotionConnectionMessage(message: string): string {
    return isNotionConnectionErrorMessage(message)
        ? "Notion 连接失败，请稍后再试"
        : message;
}
