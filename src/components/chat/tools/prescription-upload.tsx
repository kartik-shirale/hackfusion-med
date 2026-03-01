"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
    FileTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    UploadIcon,
    Loader2Icon,
} from "lucide-react";
import { useUploadThing } from "@/utils/uploadthing";

interface PrescriptionUploadProps {
    data: {
        status: string;
        prescriptionId?: string;
        doctorName?: string;
        medicines?: { name: string; dosage?: string; qty?: number }[];
        errors?: string[];
        message?: string;
    };
    messageId?: string;
    partIndex?: number;
    onSendMessage?: (msg: any) => void;
}

export const PrescriptionUpload = ({ data, messageId, partIndex, onSendMessage }: PrescriptionUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const { startUpload } = useUploadThing("prescriptionUploader");

    const statusConfig = {
        awaiting_upload: {
            icon: UploadIcon,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            badge: "outline" as const,
        },
        verified: {
            icon: CheckCircleIcon,
            color: "text-[#1A1A2F]",
            bg: "bg-[#1A1A2F]/5 dark:bg-[#1A1A2F]/10",
            badge: "default" as const,
        },
        invalid: {
            icon: XCircleIcon,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-950/30",
            badge: "destructive" as const,
        },
        pending: {
            icon: ClockIcon,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
            badge: "secondary" as const,
        },
    };

    const statusKey = String(data.status ?? "pending");
    const config =
        statusConfig[statusKey as keyof typeof statusConfig] ??
        statusConfig.pending;
    const StatusIcon = config.icon;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onSendMessage) return;

        setUploading(true);

        // Show local preview
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);

        try {
            // Upload to UploadThing cloud
            const res = await startUpload([file]);
            if (!res?.[0]) {
                setUploading(false);
                return;
            }

            const uploaded = res[0];

            // Send to AI with the UploadThing URL
            onSendMessage({
                text: `__TRIGGER__ Here is my prescription image (uploadedFileUrl: ${uploaded.ufsUrl}, uploadedFileKey: ${uploaded.key}). Please extract the doctor name, issue date, and medicines, then call prescriptionHandler with action="submit".`,
                files: [{
                    type: "file" as const,
                    url: uploaded.ufsUrl,
                    mediaType: file.type,
                    filename: file.name,
                }]
            });
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`rounded-xl border p-4 ${config.bg}`}>
            <div className="flex items-start gap-3">
                <div className={`rounded-lg bg-background p-2 ${config.color}`}>
                    <FileTextIcon className="size-5" />
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">Prescription</h4>
                        <Badge variant={config.badge} className="text-xs">
                            <StatusIcon className="mr-1 size-3" />
                            {String(data.status ?? "pending").replace("_", " ")}
                        </Badge>
                    </div>

                    {data.message && (
                        <p className="text-sm text-muted-foreground">{data.message}</p>
                    )}

                    {/* Uploaded image preview */}
                    {preview && (
                        <div className="mt-2 overflow-hidden rounded-lg border bg-white dark:bg-muted">
                            <img
                                src={preview}
                                alt="Uploaded prescription"
                                className="max-h-64 w-full object-contain"
                            />
                            {uploading && (
                                <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                                    <Loader2Icon className="size-3 animate-spin" />
                                    Uploading to cloud...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show upload button if awaiting and no preview yet */}
                    {data.status === "awaiting_upload" && onSendMessage && !preview && (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-blue-300 bg-white/60 px-3 py-2 text-sm text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                    <UploadIcon className="size-4" />
                                )}
                                {uploading ? "Uploading..." : "Select Prescription Image"}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {data.doctorName && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Dr. {data.doctorName}
                        </p>
                    )}

                    {/* Errors */}
                    {data.errors && data.errors.length > 0 && (
                        <div className="space-y-1 mt-2">
                            {data.errors.map((err, i) => (
                                <p key={i} className="flex items-center gap-1 text-xs text-red-600">
                                    <XCircleIcon className="size-3" />
                                    {err}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Extracted medicines */}
                    {data.medicines && data.medicines.length > 0 && (
                        <div className="mt-2 rounded-lg bg-background/50 p-3 border">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {data.status === "awaiting_upload" ? "Requested Medicines:" : "Extracted Medicines:"}
                            </p>
                            <div className="space-y-1">
                                {data.medicines.map((med, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span>{med.name}</span>
                                        {(med.dosage || med.qty) && (
                                            <span className="text-xs text-muted-foreground">
                                                {med.dosage} × {med.qty}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
