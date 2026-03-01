"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { ReceiptIcon } from "lucide-react";

interface WeeklyInvoiceChartProps {
    data: { day: string; amount: number }[];
}

const chartConfig = {
    amount: {
        label: "Spent",
        color: "oklch(0.828 0.189 84.429)",
    },
} satisfies ChartConfig;

export const WeeklyInvoiceChart = ({ data }: WeeklyInvoiceChartProps) => {
    const totalWeek = data.reduce((s, d) => s + d.amount, 0);

    return (
        <Card className="flex-1 rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                                <ReceiptIcon className="size-3.5 text-[#1A1A2F]" />
                            </div>
                            Weekly Invoices
                        </CardTitle>
                        <CardDescription>Daily purchases this week</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold">₹{totalWeek.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">This week</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0.4} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            tickMargin={4}
                            tickFormatter={(v) => `₹${v}`}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Amount"]}
                                />
                            }
                        />
                        <Bar
                            dataKey="amount"
                            fill="url(#barGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
