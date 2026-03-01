"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { TrendingUpIcon } from "lucide-react";

interface OrdersRefillsChartProps {
    data: { month: string; orders: number; refills: number }[];
}

const chartConfig = {
    orders: {
        label: "Orders",
        color: "oklch(0.585 0.233 277.117)",
    },
    refills: {
        label: "Refills",
        color: "oklch(0.696 0.17 162.48)",
    },
} satisfies ChartConfig;

export const OrdersRefillsChart = ({ data }: OrdersRefillsChartProps) => {
    return (
        <Card className="flex-1 rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                        <TrendingUpIcon className="size-3.5 text-[#1A1A2F]" />
                    </div>
                    Orders & Refills
                </CardTitle>
                <CardDescription>Last 6 months activity</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="fillRefills" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-refills)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-refills)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickMargin={8}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickMargin={4}
                            allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                            type="monotone"
                            dataKey="orders"
                            stroke="var(--color-orders)"
                            strokeWidth={2}
                            fill="url(#fillOrders)"
                        />
                        <Area
                            type="monotone"
                            dataKey="refills"
                            stroke="var(--color-refills)"
                            strokeWidth={2}
                            fill="url(#fillRefills)"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
