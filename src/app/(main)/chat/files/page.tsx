"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeftIcon,
    SearchIcon,
    FileTextIcon,
    ImageIcon,
    FileIcon,
    Trash2Icon,
    Loader2Icon,
    FolderOpenIcon,
    ClipboardIcon,
    XIcon,
    EyeIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUserFiles, deleteFile } from "@/actions/file.action";

interface FileItem {
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    url?: string | null;
    status?: string;
    type: "file" | "prescription";
    createdAt: string;
}

export default function FilesPage() {
    const router = useRouter();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [prescriptions, setPrescriptions] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [tab, setTab] = useState<"all" | "files" | "prescriptions">("all");

    // Lightbox state
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const result = await getUserFiles();
            if (result.success) {
                setFiles(result.files ?? []);
                setPrescriptions(result.prescriptions ?? []);
            }
            setLoading(false);
        };
        load();
    }, []);

    const allItems = useMemo(() => {
        let items: FileItem[] = [];
        if (tab === "all" || tab === "files") items = [...items, ...files];
        if (tab === "all" || tab === "prescriptions") items = [...items, ...prescriptions];
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter((f) => f.name.toLowerCase().includes(q));
        }
        return items;
    }, [files, prescriptions, search, tab]);

    const handleDelete = useCallback(async (fileId: string) => {
        setDeletingId(fileId);
        const result = await deleteFile(fileId);
        if (result.success) {
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
        }
        setDeletingId(null);
    }, []);

    const handlePreview = useCallback((file: FileItem) => {
        if (file.url) {
            setLightboxUrl(file.url);
        }
    }, []);

    const formatSize = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith("image/")) return ImageIcon;
        if (mimeType === "application/pdf") return FileTextIcon;
        return FileIcon;
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return null;
        const variants: Record<string, { label: string; className: string }> = {
            PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
            VERIFIED: { label: "Verified", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
            REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
        };
        const v = variants[status] ?? { label: status, className: "" };
        return <Badge variant="secondary" className={`text-[10px] ${v.className}`}>{v.label}</Badge>;
    };

    const isImage = (mimeType: string) => mimeType.startsWith("image/");

    return (
        <ChatLayout>
            <ScrollArea className="flex-1">
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
                                    <FolderOpenIcon className="size-5 text-[#1A1A2F]" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Your Files</h1>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {files.length + prescriptions.length} file{files.length + prescriptions.length !== 1 ? "s" : ""} uploaded
                                    </p>
                                </div>
                            </div>
                            <div className="relative w-64">
                                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search files..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 flex gap-2">
                        {[
                            { value: "all" as const, label: "All" },
                            { value: "files" as const, label: "Files" },
                            { value: "prescriptions" as const, label: "Prescriptions" },
                        ].map((t) => (
                            <Button
                                key={t.value}
                                variant={tab === t.value ? "default" : "outline"}
                                size="sm"
                                className={`rounded-full ${tab === t.value ? "bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white" : ""}`}
                                onClick={() => setTab(t.value)}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>

                    {/* File Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <Loader2Icon className="size-6 animate-spin" />
                            <span className="text-sm">Loading files...</span>
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                                <FolderOpenIcon className="size-5 text-slate-400" />
                            </div>
                            <span className="text-sm">
                                {search ? "No matching files" : "No files uploaded yet"}
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {allItems.map((file) => {
                                const Icon = file.type === "prescription" ? ClipboardIcon : getFileIcon(file.mimeType);
                                const key = `${file.type}-${file.id}`;
                                const isImg = isImage(file.mimeType);

                                return (
                                    <div
                                        key={key}
                                        className="group overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                    >
                                        {/* Preview Area */}
                                        <div
                                            className="relative flex h-36 items-center justify-center bg-slate-50/80 cursor-pointer"
                                            onClick={() => isImg && handlePreview(file)}
                                        >
                                            {isImg && file.url ? (
                                                <>
                                                    <img
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="size-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                                        <EyeIcon className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={`flex size-14 items-center justify-center rounded-full ${file.type === "prescription" ? "bg-violet-100" : "bg-[#1A1A2F]/8"}`}>
                                                    <Icon className={`size-6 ${file.type === "prescription" ? "text-violet-600" : "text-[#1A1A2F]/60"}`} />
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            {file.type === "prescription" && file.status && (
                                                <div className="absolute right-2 top-2">
                                                    {getStatusBadge(file.status)}
                                                </div>
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="p-3">
                                            <p className="truncate text-sm font-medium">{file.name}</p>
                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                <span>{formatDate(file.createdAt)}</span>
                                                {file.size && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatSize(file.size)}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-2 flex items-center gap-1">
                                                {isImg && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                                                        onClick={() => handlePreview(file)}
                                                    >
                                                        <EyeIcon className="size-3.5" />
                                                    </Button>
                                                )}
                                                {file.type === "file" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDelete(file.id)}
                                                        disabled={deletingId === file.id}
                                                    >
                                                        {deletingId === file.id ? (
                                                            <Loader2Icon className="size-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2Icon className="size-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Fullscreen Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setLightboxUrl(null)}
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    >
                        <XIcon className="size-6" />
                    </button>

                    {lightboxUrl === "loading" ? (
                        <div className="flex flex-col items-center gap-3 text-white">
                            <Loader2Icon className="size-8 animate-spin" />
                            <span className="text-sm">Loading image...</span>
                        </div>
                    ) : (
                        <img
                            src={lightboxUrl}
                            alt="Full preview"
                            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            )}
        </ChatLayout>
    );
}
