"use client";

import { useChatStore } from "@/stores/chat-store";
import {
    LANGUAGES,
    getLanguageConfig,
    getVoicesForLanguage,
    getDefaultVoice,
} from "@/lib/voice-config";
import { ChatLayout } from "@/components/chat/chat-layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    GlobeIcon,
    Volume2Icon,
    Loader2Icon,
    CheckIcon,
    PlayIcon,
    ArrowLeftIcon,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const { language, voiceId, setLanguage, setVoiceId } = useChatStore();
    const [testingVoice, setTestingVoice] = useState<string | null>(null);

    const currentLang = getLanguageConfig(language);
    const voices = getVoicesForLanguage(language);

    const handleLanguageChange = useCallback(
        (code: string) => {
            setLanguage(code);
            setVoiceId(getDefaultVoice(code));
        },
        [setLanguage, setVoiceId]
    );

    const handleTestVoice = useCallback(
        async (speaker: string) => {
            setTestingVoice(speaker);
            try {
                const sampleText =
                    currentLang?.sampleText ??
                    "Hello! Welcome to PharmaCare AI.";

                const response = await fetch("/api/tts/stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: sampleText,
                        voiceId: speaker,
                        languageCode: language,
                    }),
                });

                if (!response.ok) {
                    throw new Error("TTS failed");
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                    setTestingVoice(null);
                    URL.revokeObjectURL(audioUrl);
                };
                audio.onerror = () => setTestingVoice(null);
                await audio.play();
            } catch {
                setTestingVoice(null);
            }
        },
        [currentLang, language]
    );

    return (
        <ChatLayout>
            <ScrollArea className="flex-1">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4 -ml-2 text-muted-foreground rounded-full"
                            onClick={() => router.back()}
                        >
                            <ArrowLeftIcon className="mr-2 size-4" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                <GlobeIcon className="size-5 text-[#1A1A2F]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Language & Voice</h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Configure your language and voice preferences
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Language Selection — horizontal */}
                    <section className="mb-8 rounded-2xl border bg-card p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                    <GlobeIcon className="size-4 text-[#1A1A2F]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Language</h2>
                                    <p className="text-xs text-muted-foreground">
                                        AI will respond in your selected language
                                    </p>
                                </div>
                            </div>
                            <Select value={language} onValueChange={handleLanguageChange}>
                                <SelectTrigger className="w-[200px] rounded-full">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            <span className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {lang.nativeLabel}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    — {lang.label}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {currentLang && (
                            <p className="mt-3 rounded-full bg-muted/50 px-4 py-2 text-xs text-muted-foreground italic">
                                &ldquo;{currentLang.sampleText}&rdquo;
                            </p>
                        )}
                    </section>

                    {/* Voice Selection */}
                    <section className="rounded-2xl border bg-card p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                <Volume2Icon className="size-4 text-[#1A1A2F]" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Voice Style</h2>
                                <p className="text-xs text-muted-foreground">
                                    {voices.length} voices • Powered by{" "}
                                    {currentLang?.provider === "gemini"
                                        ? "Google Gemini"
                                        : "Sarvam AI"}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {voices.map((voice) => {
                                const isSelected = voiceId === voice.id;
                                const isTesting = testingVoice === voice.id;
                                const isFemale = voice.gender?.toLowerCase() === "female";

                                return (
                                    <button
                                        key={voice.id}
                                        onClick={() => setVoiceId(voice.id)}
                                        className={`relative flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-left transition-all hover:shadow-md ${isSelected
                                            ? "border-[#1A1A2F] bg-[#1A1A2F]/5 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]"
                                            : "border-border bg-card shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.03)] hover:border-muted-foreground/30"
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute -right-1 -top-1 rounded-full bg-[#1A1A2F] p-0.5">
                                                <CheckIcon className="size-2.5 text-white" />
                                            </div>
                                        )}

                                        {/* Gender icon */}
                                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${isFemale ? "bg-pink-100" : "bg-blue-100"}`}>
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className={`size-3.5 ${isFemale ? "text-pink-600" : "text-blue-600"}`}
                                            >
                                                {isFemale ? (
                                                    <>
                                                        <circle cx="12" cy="8" r="5" />
                                                        <path d="M12 13v8" />
                                                        <path d="M9 18h6" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <circle cx="10" cy="14" r="5" />
                                                        <path d="M19 5l-4.35 4.35" />
                                                        <path d="M15 5h4v4" />
                                                    </>
                                                )}
                                            </svg>
                                        </div>

                                        {/* Voice name */}
                                        <span className="flex-1 text-sm font-medium truncate">
                                            {voice.label}
                                        </span>

                                        {/* Play button */}
                                        <button
                                            type="button"
                                            disabled={isTesting}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTestVoice(voice.id);
                                            }}
                                            className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all ${isTesting
                                                ? "bg-[#1A1A2F]/10"
                                                : "bg-[#1A1A2F]/5 hover:bg-[#1A1A2F]/15"
                                                }`}
                                        >
                                            {isTesting ? (
                                                <Loader2Icon className="size-3 animate-spin text-[#1A1A2F]" />
                                            ) : (
                                                <PlayIcon className="size-3 text-[#1A1A2F] fill-[#1A1A2F]" />
                                            )}
                                        </button>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </ChatLayout>
    );
}
