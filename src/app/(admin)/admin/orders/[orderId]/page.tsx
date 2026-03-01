"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminOrderDetail } from "@/actions/admin-orders.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeftIcon,
    PackageIcon,
    UserIcon,
    FileTextIcon,
    RefreshCwIcon,
    TruckIcon,
    CheckCircle2Icon,
    ClockIcon,
    XCircleIcon,
    IndianRupeeIcon,
    CopyIcon,
} from "lucide-react";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const result = await getAdminOrderDetail(orderId);
            if (result.success) setData(result.data);
            setLoading(false);
        };
        load();
    }, [orderId]);

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-sm">Loading order details...</span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <PackageIcon className="size-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Order not found</p>
                <Button variant="outline" onClick={() => router.push("/admin/orders")}>
                    Back to Orders
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-full">
            <div className="mx-auto max-w-[1200px] p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => router.push("/admin/orders")}
                    >
                        <ArrowLeftIcon className="size-5" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold">Order Details</h1>
                            <OrderStatusBadge status={data.status} />
                            <PaymentBadge status={data.paymentStatus} />
                            {data.isAutoRefill && (
                                <Badge
                                    variant="outline"
                                    className="border-violet-500/30 bg-violet-500/10 text-violet-500 text-[11px]"
                                >
                                    Auto-Refill
                                </Badge>
                            )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{data.id}</span>
                            <button
                                className="hover:text-foreground transition-colors"
                                onClick={() => navigator.clipboard.writeText(data.id)}
                            >
                                <CopyIcon className="size-3" />
                            </button>
                            <span>·</span>
                            <span>
                                {new Date(data.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                    {/* Left column */}
                    <div className="space-y-6">
                        {/* Order Items */}
                        <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <PackageIcon className="size-4" />
                                    Order Items ({data.items.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {data.items.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-4 px-6 py-4"
                                        >
                                            {item.medicine.imageUrl ? (
                                                <img
                                                    src={item.medicine.imageUrl}
                                                    alt={item.medicine.name}
                                                    className="size-10 shrink-0 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                                                    <PackageIcon className="size-5 text-indigo-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{item.medicine.name}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    {item.medicine.genericName && (
                                                        <span>{item.medicine.genericName}</span>
                                                    )}
                                                    {item.medicine.brand && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{item.medicine.brand}</span>
                                                        </>
                                                    )}
                                                    {item.medicine.category && (
                                                        <>
                                                            <span>·</span>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] px-1.5 py-0"
                                                            >
                                                                {item.medicine.category}
                                                            </Badge>
                                                        </>
                                                    )}
                                                    {item.medicine.prescriptionRequired && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500"
                                                        >
                                                            Rx Required
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-medium">
                                                    ₹{item.total.toLocaleString("en-IN")}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.quantity} × ₹{item.unitPrice.toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between px-6 py-4">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Total Amount
                                    </span>
                                    <span className="flex items-center gap-1 text-lg font-bold">
                                        <IndianRupeeIcon className="size-4" />
                                        {data.totalAmount.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Info */}
                        <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserIcon className="size-4" />
                                    Customer
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-12">
                                        <AvatarImage src={data.customer.profile} />
                                        <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-semibold">
                                            {data.customer.fullName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{data.customer.fullName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {data.customer.email}
                                        </p>
                                        {data.customer.mobile && (
                                            <p className="text-sm text-muted-foreground">
                                                {data.customer.mobile}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Prescription */}
                        {data.prescription && (
                            <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileTextIcon className="size-4" />
                                        Prescription
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                                            <FileTextIcon className="size-5 text-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                {data.prescription.fileName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                {data.prescription.doctorName && (
                                                    <span>Dr. {data.prescription.doctorName}</span>
                                                )}
                                                <span>·</span>
                                                <PrescriptionBadge
                                                    status={data.prescription.status}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Refill Info */}
                        {data.refillAlert && (
                            <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <RefreshCwIcon className="size-4" />
                                        Auto-Refill Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Medicine</span>
                                            <span className="font-medium">
                                                {data.refillAlert.medicineName}
                                            </span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Auto-Refill
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    data.refillAlert.autoRefillEnabled
                                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px]"
                                                        : "text-[11px]"
                                                }
                                            >
                                                {data.refillAlert.autoRefillEnabled
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </div>
                                        {data.refillAlert.refillIntervalDays && (
                                            <>
                                                <Separator />
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Interval
                                                    </span>
                                                    <span className="font-medium">
                                                        Every {data.refillAlert.refillIntervalDays} days
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {data.refillAlert.nextRefillDate && (
                                            <>
                                                <Separator />
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Next Refill
                                                    </span>
                                                    <span className="font-medium">
                                                        {new Date(
                                                            data.refillAlert.nextRefillDate
                                                        ).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tracking / Warehouse */}
                        {(data.trackingNumber || data.warehouseNotes) && (
                            <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <TruckIcon className="size-4" />
                                        Shipping Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {data.trackingNumber && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Tracking Number
                                            </span>
                                            <span className="font-mono font-medium">
                                                {data.trackingNumber}
                                            </span>
                                        </div>
                                    )}
                                    {data.warehouseNotes && (
                                        <div>
                                            <span className="text-muted-foreground">
                                                Warehouse Notes
                                            </span>
                                            <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">
                                                {data.warehouseNotes}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column — Timeline */}
                    <div>
                        <Card className="border border-white/60 bg-white/50 backdrop-blur-sm sticky top-8">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Order Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative space-y-0">
                                    {data.timeline.map((step: any, idx: number) => {
                                        const isLast = idx === data.timeline.length - 1;
                                        return (
                                            <div key={idx} className="relative flex gap-4 pb-6">
                                                {/* Line */}
                                                {!isLast && (
                                                    <div
                                                        className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-[2px] ${step.status === "completed"
                                                            ? "bg-emerald-500/30"
                                                            : step.status === "failed"
                                                                ? "bg-rose-500/30"
                                                                : "bg-border"
                                                            }`}
                                                    />
                                                )}
                                                {/* Dot */}
                                                <div className="relative z-10 mt-0.5 shrink-0">
                                                    {step.status === "completed" ? (
                                                        <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15">
                                                            <CheckCircle2Icon className="size-4 text-emerald-500" />
                                                        </div>
                                                    ) : step.status === "failed" ? (
                                                        <div className="flex size-6 items-center justify-center rounded-full bg-rose-500/15">
                                                            <XCircleIcon className="size-4 text-rose-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex size-6 items-center justify-center rounded-full bg-muted">
                                                            <ClockIcon className="size-3.5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={`text-sm font-medium ${step.status === "pending"
                                                            ? "text-muted-foreground"
                                                            : ""
                                                            }`}
                                                    >
                                                        {step.label}
                                                    </p>
                                                    {step.date && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {new Date(step.date).toLocaleDateString(
                                                                "en-IN",
                                                                {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Info */}
                        <Card className="mt-4 border border-white/60 bg-white/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Payment Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <PaymentBadge status={data.paymentStatus} />
                                </div>
                                {data.paymentId && (
                                    <>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment ID</span>
                                            <span className="font-mono text-xs">
                                                {data.paymentId}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {data.razorpayOrderId && (
                                    <>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Razorpay Order
                                            </span>
                                            <span className="font-mono text-xs">
                                                {data.razorpayOrderId}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Badge components
const OrderStatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; className: string }> = {
        PENDING: {
            label: "Pending",
            className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600",
        },
        CONFIRMED: {
            label: "Confirmed",
            className: "border-blue-500/30 bg-blue-500/10 text-blue-500",
        },
        PROCESSING: {
            label: "Processing",
            className: "border-purple-500/30 bg-purple-500/10 text-purple-500",
        },
        SHIPPED: {
            label: "Shipped",
            className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500",
        },
        DELIVERED: {
            label: "Delivered",
            className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
        },
        CANCELLED: {
            label: "Cancelled",
            className: "border-rose-500/30 bg-rose-500/10 text-rose-500",
        },
    };
    const config = map[status] || { label: status, className: "" };
    return (
        <Badge
            variant="outline"
            className={`text-[11px] font-medium ${config.className}`}
        >
            {config.label}
        </Badge>
    );
};

const PaymentBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; className: string }> = {
        PAID: {
            label: "Paid",
            className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
        },
        PENDING: {
            label: "Pending",
            className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600",
        },
        PARTIAL: {
            label: "Partial",
            className: "border-orange-500/30 bg-orange-500/10 text-orange-500",
        },
        FAILED: {
            label: "Failed",
            className: "border-rose-500/30 bg-rose-500/10 text-rose-500",
        },
        REFUNDED: {
            label: "Refunded",
            className: "border-gray-500/30 bg-gray-500/10 text-gray-500",
        },
    };
    const config = map[status] || { label: status, className: "" };
    return (
        <Badge
            variant="outline"
            className={`text-[11px] font-medium ${config.className}`}
        >
            {config.label}
        </Badge>
    );
};

const PrescriptionBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; className: string }> = {
        PENDING: {
            label: "Pending",
            className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600",
        },
        VERIFIED: {
            label: "Verified",
            className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
        },
        REJECTED: {
            label: "Rejected",
            className: "border-rose-500/30 bg-rose-500/10 text-rose-500",
        },
        EXPIRED: {
            label: "Expired",
            className: "border-gray-500/30 bg-gray-500/10 text-gray-500",
        },
    };
    const config = map[status] || { label: status, className: "" };
    return (
        <Badge
            variant="outline"
            className={`text-[11px] font-medium ${config.className}`}
        >
            {config.label}
        </Badge>
    );
};
