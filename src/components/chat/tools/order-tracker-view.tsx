"use client";

import { Badge } from "@/components/ui/badge";
import {
    PackageIcon,
    CheckCircleIcon,
    TruckIcon,
    HomeIcon,
    CreditCardIcon,
    ClockIcon,
    MapPinIcon,
    XCircleIcon,
} from "lucide-react";

interface TimelineStage {
    stage: string;
    label: string;
    status: "completed" | "current" | "upcoming";
    timestamp: string | null;
}

interface OrderTrackerViewProps {
    data: {
        orderId?: string;
        status?: string;
        paymentStatus?: string;
        totalAmount?: number;
        trackingNumber?: string;
        createdAt?: string;
        timeline?: TimelineStage[];
        items?: {
            name: string;
            strength?: string;
            quantity: number;
            imageUrl?: string | null;
        }[];
        message?: string;
        error?: string;
    };
}

const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    PENDING: ClockIcon,
    CONFIRMED: CreditCardIcon,
    PROCESSING: PackageIcon,
    SHIPPED: TruckIcon,
    DELIVERED: HomeIcon,
};

export const OrderTrackerView = ({ data }: OrderTrackerViewProps) => {
    if (data.error) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {data.error}
            </div>
        );
    }

    // Cancelled order
    if (data.status === "CANCELLED") {
        return (
            <div className="rounded-xl border p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-destructive/10 p-2">
                        <XCircleIcon className="size-5 text-destructive" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Order Cancelled</h4>
                        <p className="text-xs text-muted-foreground">
                            Order ID: {data.orderId}
                        </p>
                    </div>
                </div>
                {data.message && (
                    <p className="mt-3 text-xs text-muted-foreground">{data.message}</p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#1A1A2F]/10 p-2">
                        <MapPinIcon className="size-5 text-[#1A1A2F]" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Track Order</h4>
                        <p className="text-xs text-muted-foreground">
                            Order ID: {data.orderId}
                        </p>
                    </div>
                </div>
                {data.trackingNumber && (
                    <Badge variant="outline" className="text-xs">
                        #{data.trackingNumber}
                    </Badge>
                )}
            </div>

            {/* Timeline */}
            {data.timeline && data.timeline.length > 0 && (
                <div className="mb-4 ml-1">
                    {data.timeline.map((stage, idx) => {
                        const Icon = stageIcons[stage.stage] ?? PackageIcon;
                        const isLast = idx === data.timeline!.length - 1;

                        return (
                            <div key={stage.stage} className="flex gap-3">
                                {/* Connector line + dot */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${stage.status === "completed"
                                                ? "bg-[#1A1A2F] text-white"
                                                : stage.status === "current"
                                                    ? "bg-[#1A1A2F] text-white ring-4 ring-[#1A1A2F]/20"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {stage.status === "completed" ? (
                                            <CheckCircleIcon className="size-3.5" />
                                        ) : (
                                            <Icon className="size-3.5" />
                                        )}
                                    </div>
                                    {!isLast && (
                                        <div
                                            className={`h-6 w-0.5 ${stage.status === "completed"
                                                    ? "bg-[#1A1A2F]"
                                                    : "bg-muted"
                                                }`}
                                        />
                                    )}
                                </div>

                                {/* Label + timestamp */}
                                <div className="pb-5">
                                    <p
                                        className={`text-sm font-medium ${stage.status === "upcoming"
                                                ? "text-muted-foreground"
                                                : "text-foreground"
                                            }`}
                                    >
                                        {stage.label}
                                    </p>
                                    {stage.timestamp && (
                                        <p className="text-[11px] text-muted-foreground">
                                            {new Date(stage.timestamp).toLocaleString("en-IN", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="space-y-1.5 border-t pt-3">
                    {data.items.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                        >
                            <span>
                                {item.name}
                                {item.strength ? ` (${item.strength})` : ""}
                            </span>
                            <span className="text-muted-foreground">× {item.quantity}</span>
                        </div>
                    ))}
                    {data.totalAmount !== undefined && (
                        <div className="flex items-center justify-between border-t pt-2 mt-2">
                            <span className="text-sm font-medium">Total</span>
                            <span className="font-bold text-[#1A1A2F]">
                                ₹{data.totalAmount.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {data.message && (
                <p className="mt-3 text-xs text-muted-foreground">{data.message}</p>
            )}
        </div>
    );
};
