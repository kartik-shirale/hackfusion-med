"use client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    PackageIcon,
    ChevronRightIcon,
    CheckCircle2Icon,
    TruckIcon,
    ClockIcon,
    CircleDotIcon,
    XCircleIcon,
} from "lucide-react";
import Link from "next/link";

interface RecentOrder {
    id: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    isAutoRefill: boolean;
    createdAt: string;
    items: {
        name: string;
        strength: string | null;
        brand: string | null;
        quantity: number;
        unitPrice: number;
    }[];
}

interface RecentOrdersProps {
    orders: RecentOrder[];
}

const trackingSteps = [
    { key: "PENDING", label: "Pending", icon: ClockIcon },
    { key: "CONFIRMED", label: "Confirmed", icon: CircleDotIcon },
    { key: "PROCESSING", label: "Processing", icon: PackageIcon },
    { key: "SHIPPED", label: "Shipped", icon: TruckIcon },
    { key: "DELIVERED", label: "Delivered", icon: CheckCircle2Icon },
];

const getStepIndex = (status: string) => {
    if (status === "CANCELLED") return -1;
    const idx = trackingSteps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
};

const StatusTracker = ({ status }: { status: string }) => {
    const currentIdx = getStepIndex(status);

    if (status === "CANCELLED") {
        return (
            <div className="flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center rounded-full bg-rose-500/15">
                    <XCircleIcon className="size-3 text-rose-500" />
                </div>
                <span className="text-xs font-medium text-rose-500">Cancelled</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0.5">
            {trackingSteps.map((step, i) => {
                const isCompleted = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                    <div key={step.key} className="flex items-center gap-0.5">
                        <div
                            className={cn(
                                "flex items-center justify-center rounded-full transition-colors",
                                isCurrent
                                    ? "size-5 bg-[#1A1A2F] text-white shadow-[0_2px_6px_rgba(26,26,47,0.3)]"
                                    : isCompleted
                                        ? "size-4 bg-[#1A1A2F]/20 text-[#1A1A2F]"
                                        : "size-4 bg-slate-100 text-slate-300"
                            )}
                        >
                            <step.icon className={cn(isCurrent ? "size-3" : "size-2.5")} />
                        </div>
                        {i < trackingSteps.length - 1 && (
                            <div
                                className={cn(
                                    "h-[2px] w-3 rounded-full",
                                    isCompleted ? "bg-[#1A1A2F]/30" : "bg-slate-100"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const RecentOrders = ({ orders }: RecentOrdersProps) => {
    if (orders.length === 0) {
        return (
            <Card className="rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100">
                        <PackageIcon className="size-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No orders yet</p>
                    <p className="text-xs text-muted-foreground/60">
                        Your recent orders will appear here
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                        <PackageIcon className="size-3.5 text-[#1A1A2F]" />
                    </div>
                    Recent Orders
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
                {orders.map((order) => {
                    const itemsSummary = order.items
                        .slice(0, 2)
                        .map((i) => i.name)
                        .join(", ");
                    const moreCount = order.items.length - 2;

                    return (
                        <Link
                            key={order.id}
                            href={`/dashboard/order/${order.id}`}
                            className="group flex items-center gap-4 rounded-full border border-white/70 bg-white/60 px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[#1A1A2F]/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(0,0,0,0.02)]"
                        >
                            {/* Order icon */}
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                <PackageIcon className="size-4 text-[#1A1A2F]/70" />
                            </div>

                            {/* Order info — inline */}
                            <div className="flex flex-1 items-center gap-3 min-w-0">
                                {/* ID + medicines */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                        {itemsSummary}
                                        {moreCount > 0 && (
                                            <span className="text-muted-foreground"> +{moreCount}</span>
                                        )}
                                    </p>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        #{order.id.slice(0, 8)}
                                    </span>
                                </div>

                                {/* Badges */}
                                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                    {order.isAutoRefill && (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full text-[10px] border-amber-300 text-amber-600 px-2"
                                        >
                                            Refill
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "rounded-full text-[10px] px-2",
                                            order.paymentStatus === "PAID" &&
                                            "bg-emerald-500/10 text-emerald-600",
                                            order.paymentStatus === "FAILED" &&
                                            "bg-rose-500/10 text-rose-600",
                                            order.paymentStatus === "PENDING" &&
                                            "bg-amber-500/10 text-amber-600"
                                        )}
                                    >
                                        {order.paymentStatus}
                                    </Badge>
                                </div>

                                {/* Status tracker */}
                                <div className="hidden md:block shrink-0">
                                    <StatusTracker status={order.status} />
                                </div>
                            </div>

                            {/* Amount + date */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                    <p className="text-sm font-semibold">
                                        ₹{order.totalAmount.toFixed(0)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </p>
                                </div>
                                <ChevronRightIcon className="size-4 text-muted-foreground/40 transition-all group-hover:text-[#1A1A2F] group-hover:translate-x-0.5" />
                            </div>
                        </Link>
                    );
                })}
            </CardContent>
        </Card>
    );
};
