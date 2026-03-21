export default function getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" });
    return formatter.format(date);
}
