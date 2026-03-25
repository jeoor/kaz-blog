"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, HeroUIProvider, Input, Spinner } from "@heroui/react";
import { SITE } from "@/app/site-config";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

export default function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/write";

    const [mode, setMode] = useState<"login" | "register">("login");

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const [registerUsername, setRegisterUsername] = useState("");
    const [registerDisplayName, setRegisterDisplayName] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [registerInviteCode, setRegisterInviteCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
                    email: registerEmail.trim(),
                    password: registerPassword,
                    inviteCode: registerInviteCode.trim(),
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
        <HeroUIProvider>
            <div className="mx-auto grid w-full max-w-[76rem] gap-6 px-4 pb-28 pt-10 md:grid-cols-[minmax(0,1fr)_26rem] md:pt-16">
                <section className="reading-shell-strong rounded-[2.3rem] p-8 md:p-10">
                    <p className="eyebrow-label">
                        Admin Access
                    </p>
                    <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
                        {SITE.login.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-black/72 dark:text-white/68">
                        {SITE.login.description}
                    </p>
                </section>

                <Card shadow="none" className="reading-shell rounded-[2rem] border-none">
                    <CardBody className="space-y-6 p-6 md:p-8">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">身份验证</h2>
                            <p className="mt-2 text-sm opacity-80">支持多作者登录。首个账号将自动成为 owner。</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-black/[0.02] p-1 dark:border-white/10 dark:bg-white/[0.03]">
                            <Button
                                variant={mode === "login" ? "solid" : "light"}
                                color={mode === "login" ? "primary" : "default"}
                                onPress={() => {
                                    setMode("login");
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                登录
                            </Button>
                            <Button
                                variant={mode === "register" ? "solid" : "light"}
                                color={mode === "register" ? "primary" : "default"}
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
                                <Input
                                    label="用户名或邮箱"
                                    value={identifier}
                                    onValueChange={setIdentifier}
                                />
                                <Input
                                    label="密码"
                                    type="password"
                                    value={password}
                                    onValueChange={setPassword}
                                />
                                <Button color="primary" onPress={onLogin} isDisabled={loading}>
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
                                <Input
                                    label="用户名"
                                    value={registerUsername}
                                    onValueChange={setRegisterUsername}
                                    description="3-32 位，小写字母/数字/._-"
                                />
                                <Input
                                    label="显示名"
                                    value={registerDisplayName}
                                    onValueChange={setRegisterDisplayName}
                                    description="留空会使用用户名"
                                />
                                <Input
                                    label="邮箱（可选）"
                                    type="email"
                                    value={registerEmail}
                                    onValueChange={setRegisterEmail}
                                />
                                <Input
                                    label="密码"
                                    type="password"
                                    value={registerPassword}
                                    onValueChange={setRegisterPassword}
                                    description="至少 8 位"
                                />
                                <Input
                                    label="邀请码（可选）"
                                    value={registerInviteCode}
                                    onValueChange={setRegisterInviteCode}
                                    description="首个账号无需邀请码，后续按服务端配置"
                                />
                                <Button color="primary" onPress={onRegister} isDisabled={loading}>
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
                    </CardBody>
                </Card>
            </div>
        </HeroUIProvider>
    );
}
