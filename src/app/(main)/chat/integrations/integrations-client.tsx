"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeftIcon,
    BellIcon,
    MailIcon,
    MessageSquareIcon,
    PhoneIcon,
    SaveIcon,
    Loader2Icon,
    CheckIcon,
    PlugIcon,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferences } from "@/actions/notification.action";

interface IntegrationsClientProps {
    initialData: {
        email: string;
        mobile: string;
        channel: "email" | "whatsapp" | "both";
    };
}

export function IntegrationsClient({ initialData }: IntegrationsClientProps) {
    const router = useRouter();

    const [notifChannel, setNotifChannel] = useState<"email" | "whatsapp" | "both">(
        initialData.channel
    );
    const [mobile, setMobile] = useState(initialData.mobile);
    const [userEmail] = useState(initialData.email);
    const [notifSaving, setNotifSaving] = useState(false);
    const [notifMessage, setNotifMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleSaveNotifications = useCallback(async () => {
        setNotifSaving(true);
        setNotifMessage(null);
        const result = await updateNotificationPreferences({
            channel: notifChannel,
            mobile: mobile.trim(),
        });
        setNotifSaving(false);
        if (result.success) {
            setNotifMessage({
                type: "success",
                text: "Notification preferences saved!",
            });
        } else {
            setNotifMessage({
                type: "error",
                text: result.error ?? "Failed to save",
            });
        }
        setTimeout(() => setNotifMessage(null), 3000);
    }, [notifChannel, mobile]);

    return (
        <ChatLayout>
            <ScrollArea className="flex-1">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4 -ml-2 text-muted-foreground"
                            onClick={() => router.back()}
                        >
                            <ArrowLeftIcon className="mr-2 size-4" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#1A1A2F] p-2.5">
                                <PlugIcon className="size-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Integrations</h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Connect your notification channels for order updates and alerts
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <section className="rounded-2xl border bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <div className="mb-6 flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                <BellIcon className="size-4 text-[#1A1A2F]" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Notification Channel</h2>
                                <p className="text-xs text-muted-foreground">
                                    Choose how you receive order updates, refill reminders, and alerts
                                </p>
                            </div>
                        </div>

                        {/* Channel Selection — horizontal layout */}
                        <div className="mb-6 flex items-start justify-between gap-6">
                            <label className="shrink-0 pt-2 text-sm font-medium">
                                Preferred Channel
                            </label>
                            <div className="flex gap-3">
                                {[
                                    { value: "email" as const, label: "Email", icon: MailIcon },
                                    { value: "whatsapp" as const, label: "WhatsApp", icon: MessageSquareIcon },
                                    { value: "both" as const, label: "Both", icon: BellIcon },
                                ].map((opt) => {
                                    const isActive = notifChannel === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setNotifChannel(opt.value)}
                                            className={`relative flex items-center gap-2 rounded-full border px-5 py-2.5 transition-all hover:shadow-md ${isActive
                                                ? "border-[#1A1A2F] bg-[#1A1A2F]/5 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]"
                                                : "border-border bg-card shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.03)] hover:border-muted-foreground/30"
                                                }`}
                                        >
                                            {isActive && (
                                                <div className="absolute -right-1 -top-1 rounded-full bg-[#1A1A2F] p-0.5">
                                                    <CheckIcon className="size-2.5 text-white" />
                                                </div>
                                            )}
                                            <div className={`flex size-7 items-center justify-center rounded-full ${isActive ? "bg-[#1A1A2F]/10" : "bg-muted"}`}>
                                                <opt.icon className={`size-3.5 ${isActive ? "text-[#1A1A2F]" : "text-muted-foreground"}`} />
                                            </div>
                                            <span className="text-sm font-medium">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Email display — horizontal */}
                        {(notifChannel === "email" || notifChannel === "both") && userEmail && (
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <label className="shrink-0 text-sm font-medium">Email</label>
                                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2.5">
                                    <MailIcon className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{userEmail}</span>
                                </div>
                            </div>
                        )}

                        {/* WhatsApp number input — horizontal */}
                        {(notifChannel === "whatsapp" || notifChannel === "both") && (
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div className="shrink-0">
                                    <label className="text-sm font-medium">WhatsApp Number</label>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Linked to your WhatsApp account
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 items-center rounded-full border bg-muted/50 px-3 text-sm text-muted-foreground shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.03)]">
                                        <PhoneIcon className="mr-1.5 size-3.5" />
                                        +91
                                    </div>
                                    <Input
                                        type="tel"
                                        placeholder="9876543210"
                                        value={mobile.replace(/^\+91/, "")}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                            setMobile(`+91${val}`);
                                        }}
                                        className="w-44 rounded-full"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Save button — fit width */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleSaveNotifications}
                                disabled={notifSaving}
                                className="gap-2 rounded-full bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white px-6"
                            >
                                {notifSaving ? (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon className="size-4" />
                                        Save Preferences
                                    </>
                                )}
                            </Button>

                            {/* Status message */}
                            {notifMessage && (
                                <p className={`rounded-full px-4 py-2 text-sm ${notifMessage.type === "success"
                                    ? "bg-[#1A1A2F]/5 text-[#1A1A2F]"
                                    : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                    }`}>
                                    {notifMessage.text}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </ChatLayout>
    );
}
