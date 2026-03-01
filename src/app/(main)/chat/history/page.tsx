"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    ArrowLeftIcon,
    SearchIcon,
    MessageSquareIcon,
    ClockIcon,
    Trash2Icon,
    Loader2Icon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getChatHistory, deleteChat } from "@/actions/chat.action";

interface ChatItem {
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
}

export default function HistoryPage() {
    const router = useRouter();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const result = await getChatHistory();
            if (result.success && result.chats) {
                setChats(result.chats.map((c) => ({ ...c, title: c.title ?? "Untitled Chat" })));
            }
            setLoading(false);
        };
        load();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return chats;
        const q = search.toLowerCase();
        return chats.filter((c) => c.title.toLowerCase().includes(q));
    }, [chats, search]);

    const handleDelete = useCallback(async (chatId: string) => {
        setDeletingId(chatId);
        const result = await deleteChat(chatId);
        if (result.success) {
            setChats((prev) => prev.filter((c) => c.id !== chatId));
        }
        setDeletingId(null);
    }, []);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    return (
        <ChatLayout>
            <ScrollArea className="flex-1 min-h-0">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    {/* Header with inline search */}
                    <div className="mb-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4 -ml-2 text-muted-foreground rounded-full"
                            onClick={() => router.back()}
                        >
                            <ArrowLeftIcon className="mr-2 size-4" />
                            Back
                        </Button>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                    <ClockIcon className="size-5 text-[#1A1A2F]" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Chat History</h1>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {chats.length} conversation{chats.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="relative w-64">
                                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Chat List */}
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <Loader2Icon className="size-6 animate-spin" />
                            <span className="text-sm">Loading chats...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <MessageSquareIcon className="size-10 opacity-30" />
                            <span className="text-sm">
                                {search ? "No matching conversations" : "No conversations yet"}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((chat) => (
                                <div
                                    key={chat.id}
                                    className="group flex items-center gap-4 rounded-full border border-white/70 bg-white/60 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[#1A1A2F]/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                                    onClick={() => router.push(`/chat/${chat.id}`)}
                                >
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                        <MessageSquareIcon className="size-4 text-[#1A1A2F]/70" />
                                    </div>
                                    <div className="min-w-0 flex-1 flex items-center gap-4">
                                        <p className="truncate font-medium flex-1 min-w-0">{chat.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                            <span>{formatDate(chat.updatedAt)}</span>
                                            <span>•</span>
                                            <span>{chat.messageCount} msg{chat.messageCount !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(chat.id);
                                        }}
                                        disabled={deletingId === chat.id}
                                    >
                                        {deletingId === chat.id ? (
                                            <Loader2Icon className="size-4 animate-spin" />
                                        ) : (
                                            <Trash2Icon className="size-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </ChatLayout>
    );
}
