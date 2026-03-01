"use client";

import { Badge } from "@/components/ui/badge";
import {
    RepeatIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    CoinsIcon,
} from "lucide-react";

interface RefillPlanProps {
    data: {
        action: string;
        activeRefills?: {
            id: string;
            medicineName: string;
            enabled: boolean;
            intervalDays?: number;
            nextRefillDate?: string;
            prepaidAmount?: number;
            creditsEarned?: number;
            status: string;
        }[];
        eligibleMedicines?: { name: string; count: number; id: string }[];
        refillId?: string;
        medicineName?: string;
        intervalDays?: number;
        nextRefillDate?: string;
        prepaidAmount?: number;
        executed?: number;
        results?: any[];
        message?: string;
        error?: string;
    };
}

export const RefillPlan = ({ data }: RefillPlanProps) => {
    if (data.error) {
        return (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                {data.error}
            </div>
        );
    }

    // Activate success
    if (data.action === "activate" && data.refillId) {
        return (
            <div className="rounded-xl border bg-gradient-to-b from-[#1A1A2F]/5 to-card p-4 dark:from-[#1A1A2F]/10">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#1A1A2F]/10 p-2 dark:bg-[#1A1A2F]/20">
                        <CheckCircleIcon className="size-5 text-[#1A1A2F]" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Auto-Refill Activated!</h4>
                        <p className="text-xs text-muted-foreground">{data.medicineName}</p>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <RepeatIcon className="size-3" />
                        Every {data.intervalDays} days
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <CalendarIcon className="size-3" />
                        Next: {data.nextRefillDate ? new Date(data.nextRefillDate).toLocaleDateString() : "N/A"}
                    </span>
                    {data.prepaidAmount !== undefined && data.prepaidAmount > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <CoinsIcon className="size-3" />
                            Prepaid: ₹{data.prepaidAmount}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // Execute results
    if (data.action === "execute") {
        return (
            <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <RepeatIcon className="size-4 text-[#1A1A2F]" />
                    Refill Execution: {data.executed} completed
                </div>
                {data.results?.map((r: any, i: number) => (
                    <div key={i} className="mt-2 flex items-center justify-between text-sm">
                        <span>{r.medicineName}</span>
                        {r.executed ? (
                            <Badge variant="default" className="text-xs">
                                <CheckCircleIcon className="mr-1 size-3" />
                                Done (+{r.creditsEarned} credits)
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="text-xs">
                                {r.reason}
                            </Badge>
                        )}
                    </div>
                ))}
                {data.message && (
                    <p className="mt-2 text-xs text-muted-foreground">{data.message}</p>
                )}
            </div>
        );
    }

    // View
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
                <RepeatIcon className="size-4 text-[#1A1A2F]" />
                Auto-Refill Plans
            </div>

            {/* Active refills */}
            {data.activeRefills && data.activeRefills.length > 0 && (
                <div className="space-y-2">
                    {data.activeRefills.map((refill) => (
                        <div key={refill.id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{refill.medicineName}</span>
                                <Badge variant={refill.enabled ? "default" : "secondary"} className="text-xs">
                                    {refill.enabled ? "Active" : "Paused"}
                                </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {refill.intervalDays && (
                                    <span>Every {refill.intervalDays} days</span>
                                )}
                                {refill.nextRefillDate && (
                                    <span>
                                        Next: {new Date(refill.nextRefillDate).toLocaleDateString()}
                                    </span>
                                )}
                                {refill.creditsEarned !== undefined && refill.creditsEarned > 0 && (
                                    <span>Credits: {refill.creditsEarned}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Eligible for refill */}
            {data.eligibleMedicines && data.eligibleMedicines.length > 0 && (
                <div className="rounded-lg border border-dashed p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Eligible for Auto-Refill:
                    </p>
                    {data.eligibleMedicines.map((med) => (
                        <div key={med.id} className="flex items-center justify-between text-sm">
                            <span>{med.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {med.count} past orders
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
