"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAdminOrders } from "@/actions/admin-orders.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import {
    SearchIcon,
    RefreshCwIcon,
    PackageIcon,
} from "lucide-react";

type Filter = "today" | "week" | "month" | "all";
type StatusFilter =
    | "ALL"
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

const timeLabels: { value: Filter; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
];

const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
];

export default function AdminOrdersPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [timeFilter, setTimeFilter] = useState<Filter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        const result = await getAdminOrders({
            page,
            pageSize: 15,
            search: debouncedSearch,
            timeFilter,
            statusFilter,
        });
        if (result.success) setData(result.data);
        setLoading(false);
    }, [page, debouncedSearch, timeFilter, statusFilter]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [timeFilter, statusFilter]);

    return (
        <div className="min-h-full">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
                {/* Header with inline search + filters */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Orders</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Manage and track all customer orders
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search orders..."
                                className="pl-9 text-sm w-[220px] rounded-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                        >
                            <SelectTrigger className="w-[140px] text-sm rounded-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={timeFilter}
                            onValueChange={(v) => setTimeFilter(v as Filter)}
                        >
                            <SelectTrigger className="w-[130px] text-sm rounded-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {timeLabels.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-full"
                            onClick={loadOrders}
                        >
                            <RefreshCwIcon className="size-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Orders Table */}
                <Card className="mt-4 border border-white/60 bg-white/50 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <CardContent className="p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                    <span className="text-sm">Loading orders...</span>
                                </div>
                            </div>
                        ) : !data || data.orders.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                                    <PackageIcon className="size-5 text-slate-400" />
                                </div>
                                <span className="text-sm">No orders found</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.orders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center gap-3 rounded-full border border-white/70 bg-white/60 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer"
                                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                            <PackageIcon className="size-4 text-[#1A1A2F]/70" />
                                        </div>
                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                            #{order.id.slice(0, 8)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{order.customerName}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{order.customerEmail}</p>
                                        </div>
                                        <span className="hidden lg:block max-w-[150px] truncate text-xs text-muted-foreground shrink-0">
                                            {order.items}
                                        </span>
                                        <span className="hidden sm:block shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(order.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </span>
                                        <span className="shrink-0 text-sm font-semibold whitespace-nowrap">
                                            ₹{order.totalAmount.toLocaleString("en-IN")}
                                        </span>
                                        <PaymentBadge status={order.paymentStatus} />
                                        <OrderStatusBadge status={order.status} />
                                        {order.isAutoRefill && (
                                            <Badge variant="outline" className="rounded-full border-violet-500/30 bg-violet-500/10 text-violet-500 text-[10px] shrink-0">
                                                Auto
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {/* Pagination */}
                    {data && data.orders.length > 0 && (
                        <div className="flex items-center justify-between border-t px-6 py-3">
                            <p className="text-xs text-muted-foreground">
                                Showing{" "}
                                <span className="font-medium text-foreground">
                                    {(data.currentPage - 1) * 15 + 1}–
                                    {Math.min(data.currentPage * 15, data.totalCount)}
                                </span>{" "}
                                of{" "}
                                <span className="font-medium text-foreground">
                                    {data.totalCount}
                                </span>{" "}
                                orders
                            </p>
                            <Pagination className="w-auto mx-0">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => page > 1 && setPage(page - 1)}
                                            className={
                                                page <= 1
                                                    ? "pointer-events-none opacity-50"
                                                    : "cursor-pointer"
                                            }
                                        />
                                    </PaginationItem>
                                    {generatePaginationPages(page, data.totalPages).map(
                                        (p, i) =>
                                            p === "ellipsis" ? (
                                                <PaginationItem key={`e${i}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        isActive={page === p}
                                                        onClick={() => setPage(p as number)}
                                                        className="cursor-pointer"
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() =>
                                                page < data.totalPages &&
                                                setPage(page + 1)
                                            }
                                            className={
                                                page >= data.totalPages
                                                    ? "pointer-events-none opacity-50"
                                                    : "cursor-pointer"
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

const OrderStatusBadge = ({ status }: { status: string }) => {
    const map: Record<
        string,
        { label: string; className: string }
    > = {
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
        <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
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
        <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
            {config.label}
        </Badge>
    );
};

// Generate page numbers with ellipsis
function generatePaginationPages(
    current: number,
    total: number
): (number | "ellipsis")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [1];

    if (current > 3) pages.push("ellipsis");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (current < total - 2) pages.push("ellipsis");

    pages.push(total);

    return pages;
}
