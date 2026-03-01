"use client";

import { useEffect, useState, useTransition } from "react";
import {
    getDeliveryOrders,
    takeOrder,
    markDelivered,
    type DeliveryOrder,
} from "@/actions/delivery.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    PackageIcon,
    TruckIcon,
    CheckCircleIcon,
    Loader2Icon,
    RefreshCwIcon,
    ClockIcon,
    UserIcon,
    PillIcon,
    MapPinIcon,
    PhoneIcon,
    IndianRupeeIcon,
} from "lucide-react";

export default function DeliveryPage() {
    const [tab, setTab] = useState<"available" | "my">("available");
    const [available, setAvailable] = useState<DeliveryOrder[]>([]);
    const [myDeliveries, setMyDeliveries] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        const result = await getDeliveryOrders();
        if ("success" in result) {
            setAvailable(result.available ?? []);
            setMyDeliveries(result.myDeliveries ?? []);
        } else {
            setError(result.error ?? "Unknown error");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleTake = (orderId: string) => {
        setActioningId(orderId);
        startTransition(async () => {
            const result = await takeOrder(orderId);
            if ("success" in result) {
                await fetchOrders();
            }
            setActioningId(null);
        });
    };

    const handleDeliver = (orderId: string) => {
        setActioningId(orderId);
        startTransition(async () => {
            const result = await markDelivered(orderId);
            if ("success" in result) {
                await fetchOrders();
            }
            setActioningId(null);
        });
    };

    const formatTime = (date: Date | string | null) => {
        if (!date) return "—";
        return new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const orders = tab === "available" ? available : myDeliveries;

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                        Delivery Dashboard
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage your pickups and deliveries
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOrders}
                    disabled={loading}
                    className="rounded-full border-white/60 bg-white/40 backdrop-blur-sm gap-1.5"
                >
                    <RefreshCwIcon
                        className={`size-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {/* Tabs */}
            <div className="mb-5 flex gap-2">
                <Button
                    variant={tab === "available" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTab("available")}
                    className={`rounded-full gap-1.5 ${tab === "available"
                            ? "bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white"
                            : "border-white/60 bg-white/40 backdrop-blur-sm"
                        }`}
                >
                    <PackageIcon className="size-3.5" />
                    Available
                    {available.length > 0 && (
                        <Badge
                            variant="secondary"
                            className={`ml-0.5 size-5 items-center justify-center rounded-full p-0 text-[10px] ${tab === "available"
                                    ? "bg-white/20 text-white"
                                    : "bg-[#1A1A2F]/10 text-[#1A1A2F]"
                                }`}
                        >
                            {available.length}
                        </Badge>
                    )}
                </Button>
                <Button
                    variant={tab === "my" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTab("my")}
                    className={`rounded-full gap-1.5 ${tab === "my"
                            ? "bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white"
                            : "border-white/60 bg-white/40 backdrop-blur-sm"
                        }`}
                >
                    <TruckIcon className="size-3.5" />
                    My Deliveries
                    {myDeliveries.length > 0 && (
                        <Badge
                            variant="secondary"
                            className={`ml-0.5 size-5 items-center justify-center rounded-full p-0 text-[10px] ${tab === "my"
                                    ? "bg-white/20 text-white"
                                    : "bg-[#1A1A2F]/10 text-[#1A1A2F]"
                                }`}
                        >
                            {myDeliveries.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-2xl border border-red-200/60 bg-red-50/60 backdrop-blur-sm p-4 text-sm text-red-700">
                    <p className="font-medium">Error: {error}</p>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2Icon className="mb-3 size-6 animate-spin text-[#1A1A2F]" />
                    <p className="text-sm">Loading orders...</p>
                </div>
            ) : orders.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm py-16 text-muted-foreground shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                    {tab === "available" ? (
                        <PackageIcon className="mb-3 size-10 opacity-30" />
                    ) : (
                        <TruckIcon className="mb-3 size-10 opacity-30" />
                    )}
                    <p className="text-sm font-medium">
                        {tab === "available" ? "No orders available" : "No active deliveries"}
                    </p>
                    <p className="mt-1 text-xs">
                        {tab === "available"
                            ? "Check back soon for new orders to deliver"
                            : 'Take an order from the "Available" tab to get started'}
                    </p>
                </div>
            ) : (
                /* Order list */
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)] transition-shadow hover:shadow-md"
                        >
                            {/* Order Header */}
                            <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-white/40">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex size-9 items-center justify-center rounded-full ${tab === "available"
                                                ? "bg-amber-100/80 text-amber-700"
                                                : "bg-blue-100/80 text-blue-700"
                                            }`}
                                    >
                                        {tab === "available" ? (
                                            <PackageIcon className="size-4" />
                                        ) : (
                                            <TruckIcon className="size-4" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">
                                            #{order.id.slice(-8).toUpperCase()}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <ClockIcon className="size-3" />
                                            {formatTime(order.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                <Badge
                                    variant="outline"
                                    className={`rounded-full text-[11px] px-2.5 ${tab === "my"
                                            ? "bg-blue-100/60 text-blue-700 border-blue-200/60"
                                            : "border-white/60 bg-white/40"
                                        }`}
                                >
                                    {order.status}
                                </Badge>
                            </div>

                            {/* Customer + Items */}
                            <div className="px-4 md:px-5 py-4">
                                {/* Customer */}
                                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon className="size-3.5 text-muted-foreground" />
                                        <span className="font-medium">{order.user.fullName}</span>
                                    </div>
                                    {order.user.mobile && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <PhoneIcon className="size-3" />
                                            {order.user.mobile}
                                        </span>
                                    )}
                                </div>

                                {/* Items */}
                                <div className="space-y-1.5">
                                    {order.items.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-xl bg-white/40 border border-white/50 px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <PillIcon className="size-3.5 text-muted-foreground shrink-0" />
                                                <span className="text-sm truncate">{item.medicine.name}</span>
                                                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                                    {item.medicine.strength}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm shrink-0 ml-2">
                                                <span className="text-muted-foreground text-xs">
                                                    ×{item.quantity}
                                                </span>
                                                <span className="font-medium text-emerald-600">
                                                    ₹{(item.unitPrice * item.quantity).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total + Timestamps */}
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/40 pt-3">
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {order.warehouseConfirmedAt && (
                                            <span className="flex items-center gap-1">
                                                <PackageIcon className="size-3" />
                                                Packed {formatTime(order.warehouseConfirmedAt)}
                                            </span>
                                        )}
                                        {order.dispatchedAt && (
                                            <span className="flex items-center gap-1">
                                                <TruckIcon className="size-3" />
                                                Picked {formatTime(order.dispatchedAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-base font-bold text-emerald-600">
                                        <IndianRupeeIcon className="size-3.5" />
                                        {order.totalAmount.toFixed(0)}
                                    </div>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="border-t border-white/40 px-4 md:px-5 py-3">
                                {tab === "available" ? (
                                    <Button
                                        className="w-full gap-2 rounded-full bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.1)]"
                                        onClick={() => handleTake(order.id)}
                                        disabled={isPending && actioningId === order.id}
                                    >
                                        {isPending && actioningId === order.id ? (
                                            <Loader2Icon className="size-4 animate-spin" />
                                        ) : (
                                            <MapPinIcon className="size-4" />
                                        )}
                                        Take for Delivery
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleDeliver(order.id)}
                                        disabled={isPending && actioningId === order.id}
                                    >
                                        {isPending && actioningId === order.id ? (
                                            <Loader2Icon className="size-4 animate-spin" />
                                        ) : (
                                            <CheckCircleIcon className="size-4" />
                                        )}
                                        Mark as Delivered
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
