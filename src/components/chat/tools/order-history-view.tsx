"use client";

import { Badge } from "@/components/ui/badge";
import {
    HistoryIcon,
    PackageIcon,
    RepeatIcon,
    CalendarIcon,
    ChevronRightIcon,
    IndianRupeeIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface OrderHistoryViewProps {
    data: {
        orders?: {
            orderId: string;
            date: string;
            status: string;
            paymentStatus: string;
            totalAmount: number;
            isAutoRefill: boolean;
            items: {
                name: string;
                brand?: string;
                strength?: string;
                quantity: number;
                unitPrice: number;
            }[];
        }[];
        totalOrders?: number;
        recurringMedicines?: { name: string; count: number; medicineId: string }[];
        hasRefillSuggestions?: boolean;
        message?: string;
        error?: string;
    };
}

const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    PROCESSING: "bg-violet-100 text-violet-700",
    SHIPPED: "bg-cyan-100 text-cyan-700",
    DELIVERED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-rose-100 text-rose-700",
};

export const OrderHistoryView = ({ data }: OrderHistoryViewProps) => {
    const router = useRouter();

    if (data.error) {
        return (
            <div className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-center text-sm text-rose-600">
                {data.error}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                    <HistoryIcon className="size-3 text-[#1A1A2F]" />
                </div>
                <span className="text-sm font-medium">
                    Order History
                </span>
                <span className="text-xs text-muted-foreground">
                    ({data.totalOrders ?? 0})
                </span>
            </div>

            {/* Orders — clickable inline pills */}
            {data.orders?.map((order) => (
                <div
                    key={order.orderId}
                    onClick={() => router.push(`/dashboard/order/${order.orderId}`)}
                    className="group flex items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                    {/* Icon */}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/5">
                        <PackageIcon className="size-3.5 text-[#1A1A2F]/60" />
                    </div>

                    {/* Items summary */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {order.items.map((i) => i.name).join(", ")}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                                <CalendarIcon className="size-2.5" />
                                {new Date(order.date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </span>
                            <span>·</span>
                            <span>{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
                            {order.isAutoRefill && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5">
                                        <RepeatIcon className="size-2.5" />
                                        Refill
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Status + Amount + Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge
                            className={`rounded-full text-[10px] px-2 py-0 border-0 ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}
                        >
                            {order.status}
                        </Badge>
                        <span className="flex items-center text-sm font-semibold text-[#1A1A2F]">
                            <IndianRupeeIcon className="size-3" />
                            {order.totalAmount.toFixed(0)}
                        </span>
                        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            ))}

            {/* Refill Suggestions */}
            {data.hasRefillSuggestions && data.recurringMedicines && (
                <div className="rounded-2xl border border-[#1A1A2F]/15 bg-[#1A1A2F]/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#1A1A2F]">
                        <div className="flex size-5 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                            <RepeatIcon className="size-2.5" />
                        </div>
                        Auto-Refill Suggestions
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {data.recurringMedicines.map((med) => (
                            <Badge
                                key={med.medicineId}
                                variant="outline"
                                className="rounded-full text-[10px] gap-1"
                            >
                                {med.name}
                                <span className="text-muted-foreground">×{med.count}</span>
                            </Badge>
                        ))}
                    </div>
                    {data.message && (
                        <p className="mt-2 text-[11px] text-[#1A1A2F]/60">
                            {data.message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
