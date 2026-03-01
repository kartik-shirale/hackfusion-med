"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PackageIcon, XCircleIcon, WalletIcon, RepeatIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalOrders: number;
    cancelledOrders: number;
    moneySpent: number;
    activeRefills: number;
  };
}

const cards = [
  {
    key: "totalOrders" as const,
    label: "Total Orders",
    icon: PackageIcon,
    accent: "text-indigo-500",
    bgAccent: "bg-indigo-500/10",
    borderAccent: "border-indigo-500/20",
    format: (v: number) => v.toString(),
  },
  {
    key: "cancelledOrders" as const,
    label: "Cancelled Orders",
    icon: XCircleIcon,
    accent: "text-rose-500",
    bgAccent: "bg-rose-500/10",
    borderAccent: "border-rose-500/20",
    format: (v: number) => v.toString(),
  },
  {
    key: "moneySpent" as const,
    label: "Money Spent",
    icon: WalletIcon,
    accent: "text-emerald-500",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
    format: (v: number) =>
      `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
  },
  {
    key: "activeRefills" as const,
    label: "Active Refills",
    icon: RepeatIcon,
    accent: "text-amber-500",
    bgAccent: "bg-amber-500/10",
    borderAccent: "border-amber-500/20",
    format: (v: number) => v.toString(),
  },
];

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.key}
          className={cn(
            "relative overflow-hidden py-1 rounded-full border-2 bg-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm",
          )}
        >
          <CardContent className="flex items-center gap-4 px-3 py-1">
            <div className={cn("rounded-full p-2.5", card.bgAccent)}>
              <card.icon className={cn("size-5", card.accent)} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {card.format(stats[card.key])}
              </p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
