"use client";

import { useEffect, useState, useCallback } from "react";
import {
    getAdminDashboardStats,
    getAdminChartData,
    getAdminRecentOrders,
} from "@/actions/admin-dashboard.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    BoxesIcon,
    CheckCircle2Icon,
    XCircleIcon,
    RefreshCwIcon,
    SearchIcon,
    CalendarIcon,
    TrendingUpIcon,
    IndianRupeeIcon,
} from "lucide-react";

type Filter = "today" | "week" | "month" | "all";

const filterLabels: { value: Filter; label: string }[] = [
    { value: "today", label: "1d" },
    { value: "week", label: "7d" },
    { value: "month", label: "1m" },
    { value: "all", label: "All" },
];

const chartConfig = {
    pending: { label: "Pending", color: "hsl(45 93% 47%)" },
    confirmed: { label: "Confirmed", color: "hsl(217 91% 60%)" },
    processing: { label: "Processing", color: "hsl(271 76% 53%)" },
    shipped: { label: "Shipped", color: "hsl(199 89% 48%)" },
    delivered: { label: "Delivered", color: "hsl(152 60% 52%)" },
    cancelled: { label: "Cancelled", color: "hsl(0 84% 60%)" },
};

const statusGradients = [
    { id: "fillPending", color: "hsl(45 93% 47%)" },
    { id: "fillConfirmed", color: "hsl(217 91% 60%)" },
    { id: "fillProcessing", color: "hsl(271 76% 53%)" },
    { id: "fillShipped", color: "hsl(199 89% 48%)" },
    { id: "fillDelivered", color: "hsl(152 60% 52%)" },
    { id: "fillCancelled", color: "hsl(0 84% 60%)" },
];

const FilterTabs = ({
    value,
    onChange,
}: {
    value: Filter;
    onChange: (f: Filter) => void;
}) => (
    <div className="flex items-center gap-1 rounded-xl border border-white/60 bg-white/40 p-0.5 backdrop-blur-sm">
        {filterLabels.map((f) => (
            <Button
                key={f.value}
                variant={value === f.value ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-3 text-xs rounded-lg ${value === f.value
                    ? "bg-[#1A1A2F] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-white/60"
                    }`}
                onClick={() => onChange(f.value)}
            >
                {f.label}
            </Button>
        ))}
    </div>
);

export default function AdminDashboardPage() {
    const [chartFilter, setChartFilter] = useState<Filter>("week");
    const [ordersFilter, setOrdersFilter] = useState<Filter>("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [statsData, setStatsData] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load stats once
    useEffect(() => {
        const load = async () => {
            const result = await getAdminDashboardStats();
            if (result.success) setStatsData(result.data);
            setLoading(false);
        };
        load();
    }, []);

    // Load chart data when chart filter changes
    useEffect(() => {
        const load = async () => {
            const result = await getAdminChartData(chartFilter);
            if (result.success) setChartData(result.data ?? []);
        };
        load();
    }, [chartFilter]);

    // Load orders when orders filter changes
    useEffect(() => {
        const load = async () => {
            const result = await getAdminRecentOrders(ordersFilter);
            if (result.success) setOrders(result.data ?? []);
        };
        load();
    }, [ordersFilter]);

    if (loading && !statsData) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-sm">Loading dashboard...</span>
                </div>
            </div>
        );
    }

    if (!statsData) return null;

    const { fullName, stats, revenue } = statsData;

    // Filter orders by search
    const filteredOrders = searchQuery
        ? orders.filter(
            (o: any) =>
                o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.items.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        : orders;

    // Greeting
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    const today = new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const statCards = [
        {
            label: "Total Products",
            value: stats.totalProducts,
            icon: BoxesIcon,
            accent: "text-indigo-600",
            bg: "bg-indigo-500/10",
        },
        {
            label: "Completed Orders",
            value: stats.completedOrders,
            icon: CheckCircle2Icon,
            accent: "text-emerald-600",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Cancelled Orders",
            value: stats.cancelledOrders,
            icon: XCircleIcon,
            accent: "text-rose-500",
            bg: "bg-rose-500/10",
        },
        {
            label: "Active Refills",
            value: stats.activeRefills,
            icon: RefreshCwIcon,
            accent: "text-violet-600",
            bg: "bg-violet-500/10",
        },
    ];

    return (
        <div className="min-h-full">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
                {/* Header: Greeting + Date */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {greeting}, {fullName}!
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Here&apos;s what&apos;s happening with your pharmacy today
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                            <CalendarIcon className="size-4 text-[#1A1A2F]" />
                        </div>
                        {today}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((card) => (
                        <Card
                            key={card.label}
                            className="rounded-full py-1 border border-white/60 bg-white/50 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]"
                        >
                            <CardContent className="flex px-3 items-center gap-4 ">
                                <div
                                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${card.bg}`}
                                >
                                    <card.icon className={`size-5 ${card.accent}`} />
                                </div>
                                <div>
                                    <p className="text-[13px] text-muted-foreground">
                                        {card.label}
                                    </p>
                                    <p className="text-2xl font-bold">{card.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Revenue + Chart Row */}
                <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
                    {/* Revenue Card */}
                    <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-baseline gap-1">
                                <IndianRupeeIcon className="size-6 text-foreground" />
                                <span className="text-3xl font-bold">
                                    {revenue.total.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <TrendingUpIcon className="size-4 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">
                                    ₹
                                    {revenue.gst.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                                <span className="text-muted-foreground">GST (18%)</span>
                            </div>

                            {/* Revenue sparkline */}
                            {chartData.length > 0 && (
                                <div className="pt-2">
                                    <ChartContainer
                                        config={{ revenue: { label: "Revenue", color: "hsl(152 60% 52%)" } }}
                                        className="h-[80px] w-full"
                                    >
                                        <AreaChart
                                            data={chartData.map((d: any) => ({
                                                name: d.date || d.label || "",
                                                value: (d.delivered || 0) + (d.shipped || 0) + (d.confirmed || 0),
                                            }))}
                                            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="hsl(152 60% 52%)" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="hsl(152 60% 52%)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="hsl(152 60% 52%)"
                                                strokeWidth={2}
                                                fill="url(#sparkFill)"
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ChartContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chart Card */}
                    <Card className="border border-white/60 bg-white/50 backdrop-blur-sm">
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Orders Overview
                            </CardTitle>
                            <FilterTabs value={chartFilter} onChange={setChartFilter} />
                        </CardHeader>
                        <CardContent>
                            {/* Legend */}
                            <div className="mb-3 flex flex-wrap gap-3">
                                {Object.entries(chartConfig).map(([key, cfg]) => (
                                    <div
                                        key={key}
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                    >
                                        <span
                                            className="inline-block size-2.5 rounded-full"
                                            style={{ background: cfg.color }}
                                        />
                                        {cfg.label}
                                    </div>
                                ))}
                            </div>

                            {chartData.length === 0 ? (
                                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                    No orders in this period
                                </div>
                            ) : (
                                <ChartContainer
                                    config={chartConfig}
                                    className="h-[220px] w-full"
                                >
                                    <AreaChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            className="stroke-border"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fontSize: 11,
                                                fill: "var(--color-muted-foreground)",
                                            }}
                                            tickFormatter={(v) => {
                                                const d = new Date(v);
                                                return d.toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                });
                                            }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fontSize: 11,
                                                fill: "var(--color-muted-foreground)",
                                            }}
                                            width={30}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <defs>
                                            {statusGradients.map((g) => (
                                                <linearGradient
                                                    key={g.id}
                                                    id={g.id}
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor={g.color}
                                                        stopOpacity={0.25}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor={g.color}
                                                        stopOpacity={0.02}
                                                    />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="pending"
                                            stroke="hsl(45 93% 47%)"
                                            fill="url(#fillPending)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="confirmed"
                                            stroke="hsl(217 91% 60%)"
                                            fill="url(#fillConfirmed)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="processing"
                                            stroke="hsl(271 76% 53%)"
                                            fill="url(#fillProcessing)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="shipped"
                                            stroke="hsl(199 89% 48%)"
                                            fill="url(#fillShipped)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="delivered"
                                            stroke="hsl(152 60% 52%)"
                                            fill="url(#fillDelivered)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="cancelled"
                                            stroke="hsl(0 84% 60%)"
                                            fill="url(#fillCancelled)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Orders — independent filter */}
                <Card className="mt-6 border border-white/60 bg-white/50 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4">
                        <div className="flex items-center gap-2 text-base font-semibold">
                            <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                <BoxesIcon className="size-3.5 text-[#1A1A2F]" />
                            </div>
                            Recent Orders
                        </div>
                        <div className="flex items-center gap-2">
                            <FilterTabs value={ordersFilter} onChange={setOrdersFilter} />
                            <div className="relative">
                                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search orders..."
                                    className="h-8 w-[200px] pl-8 text-sm rounded-full"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <CardContent className="space-y-2 px-4 pb-4">
                        {filteredOrders.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                                <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
                                    <BoxesIcon className="size-4 text-slate-400" />
                                </div>
                                <span className="text-sm">No orders found</span>
                            </div>
                        ) : (
                            filteredOrders.map((order: any) => (
                                <div
                                    key={order.id}
                                    className="flex items-center gap-4 rounded-full border border-white/70 bg-white/60 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(0,0,0,0.02)]"
                                >
                                    {/* Icon */}
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                        <BoxesIcon className="size-4 text-[#1A1A2F]/70" />
                                    </div>

                                    {/* Order ID */}
                                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                        #{order.id.slice(0, 8)}
                                    </span>

                                    {/* Customer */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">
                                            {order.customerName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            {order.customerEmail}
                                        </p>
                                    </div>

                                    {/* Items */}
                                    <span className="hidden md:block max-w-[180px] truncate text-xs text-muted-foreground shrink-0">
                                        {order.items}
                                    </span>

                                    {/* Date */}
                                    <span className="hidden sm:block shrink-0 text-xs text-muted-foreground">
                                        {new Date(order.date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </span>

                                    {/* Amount */}
                                    <span className="shrink-0 text-sm font-semibold">
                                        ₹{order.totalAmount.toLocaleString("en-IN")}
                                    </span>

                                    {/* Status */}
                                    <OrderStatusBadge status={order.status} />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const OrderStatusBadge = ({ status }: { status: string }) => {
    const map: Record<
        string,
        {
            label: string;
            variant: "default" | "secondary" | "destructive" | "outline";
        }
    > = {
        PENDING: { label: "Pending", variant: "outline" },
        CONFIRMED: { label: "Confirmed", variant: "secondary" },
        PROCESSING: { label: "Processing", variant: "secondary" },
        SHIPPED: { label: "Shipped", variant: "default" },
        DELIVERED: { label: "Delivered", variant: "default" },
        CANCELLED: { label: "Cancelled", variant: "destructive" },
    };

    const config = map[status] || {
        label: status,
        variant: "outline" as const,
    };

    return (
        <Badge variant={config.variant} className="text-[11px] font-medium">
            {config.label}
        </Badge>
    );
};
