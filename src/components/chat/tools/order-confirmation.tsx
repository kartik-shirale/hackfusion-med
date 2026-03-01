"use client";

import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2Icon,
    CreditCardIcon,
    PackageIcon,
    ExternalLinkIcon,
} from "lucide-react";

interface OrderConfirmationProps {
    data: {
        orderId?: string;
        razorpayOrderId?: string;
        status?: string;
        paymentStatus?: string;
        totalAmount?: number;
        items?: {
            name: string;
            quantity: number;
            unitPrice: number;
            total: number;
        }[];
        message?: string;
        error?: string;
    };
}

export const OrderConfirmation = ({ data }: OrderConfirmationProps) => {
    if (data.error) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {data.error}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-gradient-to-b from-[#1A1A2F]/5 to-card p-4 dark:from-[#1A1A2F]/10">
            {/* Success Header */}
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-[#1A1A2F]/10 p-2 dark:bg-[#1A1A2F]/20">
                    <CheckCircle2Icon className="size-6 text-[#1A1A2F]" />
                </div>
                <div>
                    <h4 className="font-semibold">Order Placed!</h4>
                    <p className="text-xs text-muted-foreground">
                        Order ID: {data.orderId}
                    </p>
                </div>
            </div>

            {/* Status badges */}
            <div className="mb-3 flex gap-2">
                <Badge variant="outline" className="text-xs">
                    <PackageIcon className="mr-1 size-3" />
                    {data.status}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                    <CreditCardIcon className="mr-1 size-3" />
                    {data.paymentStatus}
                </Badge>
            </div>

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="mb-3 space-y-1.5">
                    {data.items.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                        >
                            <span>
                                {item.name} × {item.quantity}
                            </span>
                            <span className="text-muted-foreground">
                                ₹{item.total.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Total Paid</span>
                <span className="text-lg font-bold text-[#1A1A2F]">
                    ₹{(
                        (data as any).total ??
                        data.totalAmount ??
                        (data.items ?? []).reduce((sum, i) => sum + (i.total || i.unitPrice * i.quantity), 0)
                    ).toFixed(2)}
                </span>
            </div>

            {data.message && (
                <p className="mt-3 text-xs text-muted-foreground">{data.message}</p>
            )}
        </div>
    );
};
