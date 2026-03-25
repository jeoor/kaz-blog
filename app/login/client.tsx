"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Input, Spinner } from "@heroui/react";
import { SITE } from "@/app/site-config";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

const CONTROL_RADIUS = "rounded-[14px]";
const CONTROL_HEIGHT = "h-11 min-h-11";
const TAB_BUTTON_BASE = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border text-sm font-medium transition-colors duration-150`;
const TAB_BUTTON_ACTIVE = "border-[#8d67404d] bg-[#8d67401a] !text-black/86 hover:bg-[#8d674026] dark:border-[#c59a6948] dark:bg-[#c59a691f] dark:!text-white/94 dark:hover:bg-[#c59a6928]";
const TAB_BUTTON_IDLE = "border-black/10 bg-black/[0.02] text-black/68 hover:border-black/14 hover:bg-black/[0.04] hover:text-black/84 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/70 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06] dark:hover:text-white/90";
const PRIMARY_BUTTON = `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-[#8d674052] bg-[#8d67401c] !text-black/92 transition-colors duration-150 hover:bg-[#8d674029] disabled:opacity-50 dark:border-[#c59a6950] dark:bg-[#c59a6922] dark:!text-white/96 dark:hover:bg-[#c59a6930]`;

const inputClassNames = {
    inputWrapper: `${CONTROL_HEIGHT} ${CONTROL_RADIUS} border border-black/18 bg-black/[0.02] shadow-none transition-colors duration-150 group-data-[focus=true]:border-black/35 group-data-[focus=true]:ring-0 data-[hover=true]:border-black/28 dark:border-white/14 dark:bg-white/[0.03] dark:group-data-[focus=true]:border-white/30 dark:data-[hover=true]:border-white/24`,
    innerWrapper: "border-none bg-transparent shadow-none",
    input: "border-0 bg-transparent text-sm text-black/88 placeholder:text-black/42 outline-none ring-0 focus:outline-none focus:ring-0 dark:text-white/92 dark:placeholder:text-white/42",
    helperWrapper: "px-1",
};

export default function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/write";

    const [mode, setMode] = useState<"login" | "register">("login");

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const [registerUsername, setRegisterUsername] = useState("");
    const [registerDisplayName, setRegisterDisplayName] = useState("");
    const [registerInviteCode, setRegisterInviteCode] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadRegistrationStatus() {
            try {
                const res = await fetch(adminApiUrl("/api/admin/session"), {
                    credentials: adminCredentials(),
                });
                const data = (await res.json().catch(() => ({}))) as any;
                if (cancelled) return;

                const required = Boolean(data?.registration?.inviteRequired);
                setInviteRequired(required);
            } catch {
                if (!cancelled) {
                    setInviteRequired(true);
                }
            }
        }

        void loadRegistrationStatus();

        return () => {
            cancelled = true;
        };
    }, []);

    async function onLogin() {
        setError(null);
        setSuccessMessage(null);
        if (!identifier.trim() || !password.trim()) {
            setError("请输入账号和密码");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(adminApiUrl("/api/admin/session"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: adminCredentials(),
                body: JSON.stringify({
                    action: "login",
                    identifier: identifier.trim(),
                    password,
                }),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setError(data?.message || `登录失败：${res.status}`);
                return;
            }

            router.replace(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : "登录失败");
        } finally {
            setLoading(false);
        }
    }

    async function onRegister() {
        setError(null);
        setSuccessMessage(null);
        if (!registerUsername.trim()) {
            setError("请输入用户名");
            return;
        }
        if (!registerPassword.trim()) {
            setError("请输入密码");
            return;
        }
        if (registerPassword !== registerPasswordConfirm) {
            setError("两次输入的密码不一致");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(adminApiUrl("/api/admin/session"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: adminCredentials(),
                body: JSON.stringify({
                    action: "register",
                    username: registerUsername.trim(),
                    displayName: registerDisplayName.trim(),
                    inviteCode: registerInviteCode.trim(),
                    password: registerPassword,
                }),
            });

            const data = (await res.json().catch(() => ({}))) as any;
            if (!res.ok) {
                setError(data?.message || `注册失败：${res.status}`);
                return;
            }

            setSuccessMessage("注册成功，正在进入写作台...");
            router.replace(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : "注册失败");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto grid w-full max-w-[76rem] gap-6 px-4 pb-28 pt-10 md:grid-cols-[minmax(0,1fr)_26rem] md:pt-16">
            <section className="p-8 md:p-10">
                <p className="eyebrow-label">
                    Admin Access
                </p>
                <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                    {SITE.login.title}
                </h1>
            </section>

            <Card shadow="none" className="reading-shell rounded-[2rem] border border-black/10 bg-white/78 dark:border-white/12 dark:bg-white/[0.05]">
                <CardBody className="space-y-6 p-6 md:p-8">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">身份验证</h2>
                        <p className="mt-2 text-sm text-black/62 dark:text-white/72">支持多作者登录。首个账号将自动成为 owner。</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-black/[0.02] p-1 dark:border-white/12 dark:bg-white/[0.02]">
                        <Button
                            variant="light"
                            className={`${TAB_BUTTON_BASE} ${mode === "login" ? TAB_BUTTON_ACTIVE : TAB_BUTTON_IDLE}`}
                            onPress={() => {
                                setMode("login");
                                setError(null);
                                setSuccessMessage(null);
                            }}
                        >
                            登录
                        </Button>
                        <Button
                            variant="light"
                            className={`${TAB_BUTTON_BASE} ${mode === "register" ? TAB_BUTTON_ACTIVE : TAB_BUTTON_IDLE}`}
                            onPress={() => {
                                setMode("register");
                                setError(null);
                                setSuccessMessage(null);
                            }}
                        >
                            注册
                        </Button>
                    </div>

                    {mode === "login" ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">用户名</label>
                                <Input
                                    aria-label="用户名"
                                    value={identifier}
                                    onValueChange={setIdentifier}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">密码</label>
                                <Input
                                    aria-label="密码"
                                    type="password"
                                    value={password}
                                    onValueChange={setPassword}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                            </div>
                            <Button onPress={onLogin} isDisabled={loading} className={PRIMARY_BUTTON}>
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Spinner size="sm" />
                                        登录中...
                                    </span>
                                ) : (
                                    "登录"
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">用户名</label>
                                <Input
                                    aria-label="用户名"
                                    value={registerUsername}
                                    onValueChange={setRegisterUsername}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                                <p className="text-xs text-black/52 dark:text-white/52">3-32 位，小写字母/数字/._-</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">显示名</label>
                                <Input
                                    aria-label="显示名"
                                    value={registerDisplayName}
                                    onValueChange={setRegisterDisplayName}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                                <p className="text-xs text-black/52 dark:text-white/52">留空会使用用户名</p>
                            </div>
                            {inviteRequired ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black/78 dark:text-white/78">邀请码</label>
                                    <Input
                                        aria-label="邀请码"
                                        value={registerInviteCode}
                                        onValueChange={setRegisterInviteCode}
                                        variant="flat"
                                        classNames={inputClassNames}
                                    />
                                    <p className="text-xs text-black/52 dark:text-white/52">请向管理员请求邀请码</p>
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">密码</label>
                                <Input
                                    aria-label="密码"
                                    type="password"
                                    value={registerPassword}
                                    onValueChange={setRegisterPassword}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                                <p className="text-xs text-black/52 dark:text-white/52">至少 8 位</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-black/78 dark:text-white/78">确认密码</label>
                                <Input
                                    aria-label="确认密码"
                                    type="password"
                                    value={registerPasswordConfirm}
                                    onValueChange={setRegisterPasswordConfirm}
                                    variant="flat"
                                    classNames={inputClassNames}
                                />
                            </div>
                            <Button onPress={onRegister} isDisabled={loading} className={PRIMARY_BUTTON}>
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Spinner size="sm" />
                                        注册中...
                                    </span>
                                ) : (
                                    "注册并登录"
                                )}
                            </Button>
                        </>
                    )}

                    {successMessage ? <div className="text-sm text-emerald-500">{successMessage}</div> : null}

                    {error ? <div className="text-sm text-red-500">{error}</div> : null}

                    {mode === "login" ? <div className="text-xs text-black/50 dark:text-white/50">如忘记密码请联系管理员</div> : null}
                </CardBody>
            </Card>
        </div>
    );
}
