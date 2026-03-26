"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, Input, Spinner } from "@heroui/react";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

const CONTROL_RADIUS = "rounded-[14px]";
const CONTROL_HEIGHT = "h-11 min-h-11";
const PANEL_RADIUS = "rounded-[2rem] overflow-hidden";
const BUTTON_OUTLINE = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-black/10 bg-black/[0.02] !text-black/78 transition-colors duration-150 hover:border-black/14 hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:!text-white/84 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06]`;
const BUTTON_PRIMARY = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-[#8d674052] bg-[#8d67401c] !text-black/92 transition-colors duration-150 hover:bg-[#8d674029] disabled:opacity-50 dark:border-[#c59a6950] dark:bg-[#c59a6922] dark:!text-white/96 dark:hover:bg-[#c59a6930]`;
const BUTTON_DANGER = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-red-500/35 bg-red-500/12 !text-red-700 transition-colors duration-150 hover:bg-red-500/18 disabled:opacity-50 dark:border-red-300/32 dark:bg-red-500/14 dark:!text-red-200 dark:hover:bg-red-500/22`;

const inputClassNames = {
    inputWrapper: `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-black/18 bg-black/[0.02] shadow-none transition-colors duration-150 group-data-[focus=true]:border-black/34 group-data-[focus=true]:ring-0 data-[hover=true]:border-black/28 dark:border-white/14 dark:bg-white/[0.03] dark:group-data-[focus=true]:border-white/30 dark:data-[hover=true]:border-white/24`,
    innerWrapper: "border-none bg-transparent shadow-none",
    input: "border-0 bg-transparent text-sm text-black/88 placeholder:text-black/42 outline-none ring-0 focus:outline-none focus:ring-0 dark:text-white/92 dark:placeholder:text-white/42",
};

type SessionUser = {
    username: string;
    displayName?: string;
    role?: string;
};

type ManagedUser = {
    id: string;
    username: string;
    displayName: string;
    role: string;
    createdAt?: number;
    updatedAt?: number;
    disabledAt?: number | null;
};

type UserDraft = {
    displayName: string;
    role: string;
    password: string;
};

function formatTime(value?: number | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AuthorManagementPage() {
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actingKey, setActingKey] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [pageMessage, setPageMessage] = useState<string | null>(null);

    function syncDrafts(nextUsers: ManagedUser[]) {
        setDrafts((prev) => {
            const next: Record<string, UserDraft> = {};
            for (const user of nextUsers) {
                next[user.username] = {
                    displayName: prev[user.username]?.displayName ?? user.displayName,
                    role: prev[user.username]?.role ?? user.role,
                    password: "",
                };
            }
            return next;
        });
    }

    const loadUsers = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsRefreshing(true);
        }
        try {
            const res = await fetch(adminApiUrl("/api/admin/authors"), {
                credentials: adminCredentials(),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                if (res.status === 401) {
                    setPageError("登录已失效，请重新登录");
                    setUsers([]);
                    return;
                }
                if (res.status === 403) {
                    setPageError("仅 owner 可访问作者管理");
                    setUsers([]);
                    return;
                }
                setPageError(data?.message || `加载作者失败：${res.status}`);
                setUsers([]);
                return;
            }

            const nextUsers = Array.isArray(data?.users) ? data.users as ManagedUser[] : [];
            setUsers(nextUsers);
            syncDrafts(nextUsers);
            setPageError(null);
        } catch (error) {
            setPageError(error instanceof Error ? error.message : "加载作者失败");
            setUsers([]);
        } finally {
            if (showLoading) {
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            setIsBootstrapping(true);
            try {
                const res = await fetch(adminApiUrl("/api/admin/session"), {
                    credentials: adminCredentials(),
                });
                const data = (await res.json().catch(() => ({}))) as any;
                if (cancelled) return;

                if (!res.ok) {
                    setPageError(res.status === 401 ? "未登录，请先登录" : data?.message || `校验失败：${res.status}`);
                    setSessionUser(null);
                    return;
                }

                const user = (data?.user || null) as SessionUser | null;
                setSessionUser(user);
                if (String(user?.role || "").toLowerCase() !== "owner") {
                    setPageError("仅 owner 可访问作者管理");
                    return;
                }

                await loadUsers(true);
            } catch (error) {
                if (!cancelled) {
                    setPageError(error instanceof Error ? error.message : "初始化失败");
                }
            } finally {
                if (!cancelled) {
                    setIsBootstrapping(false);
                }
            }
        }

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [loadUsers]);

    function setDraft(username: string, patch: Partial<UserDraft>) {
        setDrafts((prev) => ({
            ...prev,
            [username]: {
                displayName: prev[username]?.displayName ?? "",
                role: prev[username]?.role ?? "author",
                password: prev[username]?.password ?? "",
                ...patch,
            },
        }));
    }

    async function runUserAction(username: string, action: string, extra: Record<string, unknown> = {}) {
        setActingKey(`${username}:${action}`);
        setPageError(null);
        setPageMessage(null);
        try {
            const res = await fetch(adminApiUrl("/api/admin/authors"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: adminCredentials(),
                body: JSON.stringify({ username, action, ...extra }),
            });
            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setPageError(data?.message || `操作失败：${res.status}`);
                return;
            }

            const updatedUser = data?.user as ManagedUser | undefined;
            if (updatedUser) {
                setUsers((prev) => prev.map((item) => (item.username === updatedUser.username ? updatedUser : item)));
                setDraft(updatedUser.username, {
                    displayName: updatedUser.displayName,
                    role: updatedUser.role,
                    password: "",
                });
            } else {
                await loadUsers(false);
            }
            setPageMessage("已保存");
        } catch (error) {
            setPageError(error instanceof Error ? error.message : "操作失败");
        } finally {
            setActingKey(null);
        }
    }

    const isOwnerUser = String(sessionUser?.role || "").toLowerCase() === "owner";

    return (
        <div className="mx-auto w-full max-w-[94rem] px-4 pb-24 pt-10 md:pt-14">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card shadow="none" className={`${PANEL_RADIUS} border border-black/10 bg-white/82 dark:border-white/12 dark:bg-white/[0.05]`}>
                    <CardBody className="space-y-5 p-6 md:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                    Author Management
                                </p>
                                <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
                                    作者管理
                                </h1>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button className={BUTTON_OUTLINE} onPress={() => { window.location.href = "/write"; }}>
                                    返回写作台
                                </Button>
                                <Button className={BUTTON_PRIMARY} onPress={() => void loadUsers(true)} isDisabled={isRefreshing || isBootstrapping || !isOwnerUser}>
                                    {isRefreshing ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Spinner size="sm" />
                                            刷新中...
                                        </span>
                                    ) : (
                                        "刷新列表"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {isBootstrapping ? (
                            <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/65">
                                <Spinner size="sm" />
                                正在加载作者信息...
                            </div>
                        ) : null}

                        {pageMessage ? (
                            <div className="rounded-2xl border border-black/12 bg-black/[0.03] px-4 py-3 text-sm text-black/72 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/76">
                                {pageMessage}
                            </div>
                        ) : null}

                        {pageError ? (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 dark:border-red-300/22 dark:bg-red-500/12 dark:text-red-300">
                                {pageError}
                            </div>
                        ) : null}

                        {users.length > 0 ? (
                            <div className="space-y-4">
                                {users.map((user) => {
                                    const draft = drafts[user.username] || {
                                        displayName: user.displayName,
                                        role: user.role,
                                        password: "",
                                    };
                                    const isSelf = user.username === sessionUser?.username;
                                    const isDisabled = Boolean(user.disabledAt);
                                    return (
                                        <div key={user.username} className="rounded-[1.5rem] border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-lg font-semibold text-black/88 dark:text-white/92">{user.displayName || user.username}</div>
                                                    <div className="mt-1 text-sm text-black/58 dark:text-white/62">@{user.username}</div>
                                                </div>
                                                <div className="text-right text-xs text-black/48 dark:text-white/48">
                                                    <div>创建：{formatTime(user.createdAt)}</div>
                                                    <div>更新：{formatTime(user.updatedAt)}</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                                <span className="rounded-full border border-black/10 px-3 py-1 text-black/66 dark:border-white/10 dark:text-white/70">
                                                    角色：{user.role}
                                                </span>
                                                <span className={`rounded-full border px-3 py-1 ${isDisabled ? "border-red-500/25 text-red-500 dark:border-red-300/28 dark:text-red-300" : "border-emerald-500/25 text-emerald-600 dark:text-emerald-300"}`}>
                                                    {isDisabled ? "已禁用" : "正常"}
                                                </span>
                                                {isSelf ? (
                                                    <span className="rounded-full border border-[#8d674052] px-3 py-1 text-black/66 dark:text-white/72">
                                                        当前账号
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">显示名</label>
                                                    <Input
                                                        aria-label={`${user.username}-displayName`}
                                                        value={draft.displayName}
                                                        onValueChange={(value) => setDraft(user.username, { displayName: value })}
                                                        variant="flat"
                                                        classNames={inputClassNames}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">角色</label>
                                                    <select
                                                        className={`${CONTROL_HEIGHT} ${CONTROL_RADIUS} w-full border border-black/18 bg-black/[0.02] px-4 text-sm text-black/88 outline-none dark:border-white/14 dark:bg-white/[0.03] dark:text-white/92`}
                                                        value={draft.role}
                                                        onChange={(event) => setDraft(user.username, { role: event.target.value })}
                                                    >
                                                        <option value="owner">owner</option>
                                                        <option value="author">author</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Button
                                                    className={BUTTON_PRIMARY}
                                                    isDisabled={actingKey !== null}
                                                    onPress={() => void runUserAction(user.username, "set-profile", {
                                                        displayName: draft.displayName,
                                                        role: draft.role,
                                                    })}
                                                >
                                                    保存资料
                                                </Button>
                                                <Button
                                                    className={isDisabled ? BUTTON_OUTLINE : BUTTON_DANGER}
                                                    isDisabled={actingKey !== null}
                                                    onPress={() => void runUserAction(user.username, isDisabled ? "enable" : "disable")}
                                                >
                                                    {isDisabled ? "启用账号" : "禁用账号"}
                                                </Button>
                                            </div>

                                            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem]">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-black/72 dark:text-white/72">新密码</label>
                                                    <Input
                                                        aria-label={`${user.username}-password`}
                                                        type="password"
                                                        value={draft.password}
                                                        onValueChange={(value) => setDraft(user.username, { password: value })}
                                                        variant="flat"
                                                        classNames={inputClassNames}
                                                    />
                                                    <p className="text-xs text-black/50 dark:text-white/50">重置后该用户当前会话会失效，需要重新登录。</p>
                                                </div>
                                                <div className="flex items-end">
                                                    <Button
                                                        className={`w-full ${BUTTON_OUTLINE}`}
                                                        isDisabled={actingKey !== null || draft.password.trim().length < 8}
                                                        onPress={() => void runUserAction(user.username, "reset-password", { password: draft.password })}
                                                    >
                                                        重置密码
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : !isBootstrapping && !pageError ? (
                            <div className="rounded-2xl border border-black/12 bg-black/[0.02] px-4 py-3 text-sm text-black/62 dark:border-white/12 dark:bg-white/[0.03] dark:text-white/68">
                                暂无可管理作者。
                            </div>
                        ) : null}
                    </CardBody>
                </Card>

                <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                    <Card shadow="none" className={`${PANEL_RADIUS} border border-black/10 bg-white/82 dark:border-white/12 dark:bg-white/[0.05]`}>
                        <CardBody className="space-y-4 p-6">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
                                    Session
                                </p>
                                <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">
                                    当前身份
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-black/12 bg-black/[0.03] px-4 py-3 text-sm text-black/72 dark:border-white/12 dark:bg-white/[0.04] dark:text-white/76">
                                {sessionUser ? `${sessionUser.displayName || sessionUser.username}（${sessionUser.role || "unknown"}）` : "未登录"}
                            </div>
                        </CardBody>
                    </Card>
                </aside>
            </div>
        </div>
    );
}