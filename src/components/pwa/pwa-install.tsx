"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, XIcon } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Don't show if user previously dismissed
        if (localStorage.getItem("pwa-install-dismissed") === "true") {
            setDismissed(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setDeferredPrompt(null);
        localStorage.setItem("pwa-install-dismissed", "true");
    };

    if (!deferredPrompt || dismissed) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1A2F] text-white text-xs rounded-lg mx-3 mb-2 md:hidden animate-in slide-in-from-bottom-2 duration-300">
            <DownloadIcon className="size-4 shrink-0" />
            <span className="flex-1">Install PharmaCare for quick access</span>
            <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[10px] font-semibold rounded-md"
                onClick={handleInstall}
            >
                Install
            </Button>
            <button
                onClick={handleDismiss}
                className="p-0.5 rounded hover:bg-white/20 transition-colors"
            >
                <XIcon className="size-3" />
            </button>
        </div>
    );
};
