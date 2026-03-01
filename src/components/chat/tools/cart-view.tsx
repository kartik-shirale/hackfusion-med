"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/stores/chat-store";
import {
    ShoppingCartIcon,
    PackageIcon,
    Trash2Icon,
    CheckIcon,
} from "lucide-react";

interface CartViewProps {
    data: {
        action: string;
        items?: any[];
        totalItems?: number;
        totalAmount?: number;
        results?: any[];
        removed?: string[];
        error?: string;
        message?: string;
    };
}

export const CartView = ({ data }: CartViewProps) => {
    const queryClient = useQueryClient();
    const chatId = useChatStore((s) => s.chatId);

    // Invalidate cart cache when agent modifies cart
    useEffect(() => {
        if (
            data.action === "add" ||
            data.action === "remove" ||
            data.action === "update" ||
            data.action === "checkout" ||
            data.action === "clear"
        ) {
            queryClient.invalidateQueries({
                queryKey: ["cart", chatId ?? "global"],
            });
        }
    }, [data.action, queryClient, chatId]);

    if (data.error) {
        return (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                <ShoppingCartIcon className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                {data.error}
            </div>
        );
    }

    // Add results
    if (data.action === "add" && data.results) {
        return (
            <div className="rounded-xl border bg-[#1A1A2F]/5 p-4 dark:bg-[#1A1A2F]/10">
                <div className="flex items-center gap-2 text-sm font-medium text-[#1A1A2F] dark:text-[#A8A8C0]">
                    <CheckIcon className="size-4" />
                    Items added to cart
                </div>
                <div className="mt-2 space-y-1">
                    {data.results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            {r.added ? (
                                <CheckIcon className="size-3 text-[#1A1A2F]" />
                            ) : (
                                <span className="size-3 text-red-500">✗</span>
                            )}
                            <span>{r.name ?? r.medicineId}</span>
                            {!r.added && (
                                <Badge variant="destructive" className="text-[10px]">
                                    {r.reason}
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Clear results
    if (data.action === "clear") {
        return (
            <div className="rounded-xl border p-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Trash2Icon className="size-4" />
                    {(data as any).deletedCount ?? 0} item(s) cleared from cart
                </div>
            </div>
        );
    }

    // Remove results
    if (data.action === "remove") {
        return (
            <div className="rounded-xl border p-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Trash2Icon className="size-4" />
                    {data.removed?.length ?? 0} item(s) removed from cart
                </div>
            </div>
        );
    }

    // View / Checkout — show cart items
    if (data.items && data.items.length > 0) {
        return (
            <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ShoppingCartIcon className="size-4 text-[#1A1A2F]" />
                        {data.action === "checkout" ? "Order Summary" : "Your Cart"}
                    </div>
                    <Badge variant="secondary">{data.totalItems ?? data.items.length} items</Badge>
                </div>

                <div className="space-y-2">
                    {data.items.map((item: any, i: number) => (
                        <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <PackageIcon className="size-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.strength ?? ""} • Qty: {item.quantity}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-[#1A1A2F]">
                                ₹{(item.totalPrice ?? item.unitPrice * item.quantity).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold text-[#1A1A2F]">
                        ₹{(data.totalAmount ?? 0).toFixed(2)}
                    </span>
                </div>

                {data.message && (
                    <p className="mt-2 text-xs text-muted-foreground">{data.message}</p>
                )}
            </div>
        );
    }

    return null;
};
