"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Input, Spinner, NextUIProvider } from "@nextui-org/react";
import { SITE } from "@/app/site-config";
import { adminApiUrl, adminCredentials } from "@/lib/admin-api";

export default function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/write";

    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onLogin() {
        setError(null);
        if (!token.trim()) {
            setError("请输入口令");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(adminApiUrl("/api/admin/session"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: adminCredentials(),
                body: JSON.stringify({ token: token.trim() }),
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

    return (
        <NextUIProvider>
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
                            <p className="mt-2 text-sm opacity-80">登录后才能访问写作与管理接口。</p>
                        </div>

                        <Input
                            label="管理口令"
                            type="password"
                            value={token}
                            onValueChange={setToken}
                            description="对应服务端环境变量 ADMIN_TOKEN"
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

                        {error ? <div className="text-sm text-red-500">{error}</div> : null}
                    </CardBody>
                </Card>
            </div>
        </NextUIProvider>
    );
}
