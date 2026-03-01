import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import client from "@/lib/prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ArrowLeftIcon,
    PackageIcon,
    CreditCardIcon,
    CalendarIcon,
    CheckCircle2Icon,
    TruckIcon,
    ClockIcon,
    CircleDotIcon,
    XCircleIcon,
    RepeatIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const trackingSteps = [
    { key: "PENDING", label: "Pending", icon: ClockIcon },
    { key: "CONFIRMED", label: "Confirmed", icon: CircleDotIcon },
    { key: "PROCESSING", label: "Processing", icon: PackageIcon },
    { key: "SHIPPED", label: "Shipped", icon: TruckIcon },
    { key: "DELIVERED", label: "Delivered", icon: CheckCircle2Icon },
];

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ orderId: string }>;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const { orderId } = await params;

    const order = await client.order.findUnique({
        where: { id: orderId, userId },
        include: {
            items: {
                include: {
                    medicine: {
                        select: { name: true, strength: true, brand: true, dosageForm: true, imageUrl: true },
                    },
                },
            },
            prescription: { select: { id: true, status: true } },
        },
    });

    if (!order) notFound();

    const currentStepIdx =
        order.status === "CANCELLED"
            ? -1
            : trackingSteps.findIndex((s) => s.key === order.status);

    return (
        <div className="flex-1 p-3">
            <div className="h-full overflow-y-auto rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
                <div className="mx-auto max-w-7xl p-6 lg:p-8">
                    {/* Back link */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm text-muted-foreground shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:text-foreground hover:shadow-[0_4px_10px_rgba(0,0,0,0.08)] mb-6"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Back to Dashboard
                    </Link>

                    {/* Order header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                    <PackageIcon className="size-4 text-[#1A1A2F]" />
                                </div>
                                Order #{order.id.slice(0, 8)}
                            </h1>
                            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                                    <CalendarIcon className="size-3.5" />
                                    {order.createdAt.toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                                {order.isAutoRefill && (
                                    <Badge
                                        variant="outline"
                                        className="rounded-full border-amber-300 text-amber-600 text-[10px]"
                                    >
                                        <RepeatIcon className="mr-1 size-2.5" />
                                        Auto-Refill
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">₹{order.totalAmount.toFixed(2)}</p>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "rounded-full text-xs mt-1",
                                    order.paymentStatus === "PAID" &&
                                    "bg-emerald-500/10 text-emerald-600",
                                    order.paymentStatus === "FAILED" &&
                                    "bg-rose-500/10 text-rose-600",
                                    order.paymentStatus === "PENDING" &&
                                    "bg-amber-500/10 text-amber-600"
                                )}
                            >
                                <CreditCardIcon className="mr-1 size-3" />
                                {order.paymentStatus}
                            </Badge>
                        </div>
                    </div>

                    {/* Tracking stepper */}
                    <Card className="mb-6 rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                    <TruckIcon className="size-3.5 text-[#1A1A2F]" />
                                </div>
                                Order Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {order.status === "CANCELLED" ? (
                                <div className="flex items-center gap-2 py-2">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-rose-100">
                                        <XCircleIcon className="size-4 text-rose-500" />
                                    </div>
                                    <span className="font-medium text-rose-500">This order has been cancelled</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    {trackingSteps.map((step, i) => {
                                        const isCompleted = i <= currentStepIdx;
                                        const isCurrent = i === currentStepIdx;
                                        return (
                                            <div key={step.key} className="flex flex-1 items-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-center rounded-full transition-all",
                                                            isCurrent
                                                                ? "size-10 bg-[#1A1A2F] text-white shadow-[0_4px_12px_rgba(26,26,47,0.3)]"
                                                                : isCompleted
                                                                    ? "size-8 bg-[#1A1A2F]/20 text-[#1A1A2F]"
                                                                    : "size-8 bg-slate-100 text-slate-300"
                                                        )}
                                                    >
                                                        <step.icon
                                                            className={cn(isCurrent ? "size-5" : "size-4")}
                                                        />
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-medium",
                                                            isCurrent
                                                                ? "text-[#1A1A2F]"
                                                                : isCompleted
                                                                    ? "text-foreground"
                                                                    : "text-muted-foreground/50"
                                                        )}
                                                    >
                                                        {step.label}
                                                    </span>
                                                </div>
                                                {i < trackingSteps.length - 1 && (
                                                    <div
                                                        className={cn(
                                                            "mx-2 h-0.5 flex-1 rounded-full",
                                                            isCompleted ? "bg-[#1A1A2F]/30" : "bg-slate-100"
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order items */}
                    <Card className="rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                    <PackageIcon className="size-3.5 text-[#1A1A2F]" />
                                </div>
                                Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between rounded-full border border-white/70 bg-white/60 px-4 py-3 shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)]"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                            <PackageIcon className="size-4 text-[#1A1A2F]/60" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{item.medicine.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {item.medicine.brand && `${item.medicine.brand} · `}
                                                {item.medicine.strength} · {item.medicine.dosageForm}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right pl-4 shrink-0">
                                        <p className="text-xs text-muted-foreground">
                                            {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                                        </p>
                                        <p className="text-sm font-semibold text-[#1A1A2F]">
                                            ₹{(item.quantity * item.unitPrice).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Total */}
                            <div className="flex items-center justify-between rounded-full bg-[#1A1A2F]/5 px-5 py-3 mt-2">
                                <span className="font-medium text-sm">Total Amount</span>
                                <span className="text-lg font-bold text-[#1A1A2F]">
                                    ₹{order.totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prescription info */}
                    {order.prescription && (
                        <Card className="mt-4 rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
                            <CardContent className="flex items-center gap-3 p-4">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "rounded-full text-xs",
                                        order.prescription.status === "VERIFIED" &&
                                        "border-emerald-300 text-emerald-600",
                                        order.prescription.status === "REJECTED" &&
                                        "border-rose-300 text-rose-600",
                                        order.prescription.status === "PENDING" &&
                                        "border-amber-300 text-amber-600"
                                    )}
                                >
                                    Prescription: {order.prescription.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    ID: {order.prescription.id.slice(0, 8)}
                                </span>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
