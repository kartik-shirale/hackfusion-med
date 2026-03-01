"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    PackageIcon,
    CreditCardIcon,
    XCircleIcon,
    RepeatIcon,
    CheckCircleIcon,
    BellIcon,
    ActivityIcon,
} from "lucide-react";

interface TimelineEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    color: string;
}

interface ActivityTimelineProps {
    events: TimelineEvent[];
}

const iconMap: Record<string, React.ElementType> = {
    order_created: PackageIcon,
    payment_done: CreditCardIcon,
    order_cancelled: XCircleIcon,
    refill_created: RepeatIcon,
    refill_done: CheckCircleIcon,
    refill_cancelled: XCircleIcon,
    notification: BellIcon,
};

const colorMap: Record<string, { dot: string; bg: string }> = {
    indigo: {
        dot: "bg-indigo-500",
        bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    emerald: {
        dot: "bg-emerald-500",
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    destructive: {
        dot: "bg-rose-500",
        bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    amber: {
        dot: "bg-amber-500",
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    sky: {
        dot: "bg-sky-500",
        bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
};

const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
};

export const ActivityTimeline = ({ events }: ActivityTimelineProps) => {
    if (events.length === 0) {
        return (
            <Card className="h-full rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                            <ActivityIcon className="size-3.5 text-[#1A1A2F]" />
                        </div>
                        Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100">
                        <ActivityIcon className="size-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full rounded-2xl border border-white/60 bg-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                        <ActivityIcon className="size-3.5 text-[#1A1A2F]" />
                    </div>
                    Activity Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="relative space-y-0">
                        {events.map((event, i) => {
                            const Icon = iconMap[event.type] || PackageIcon;
                            const colors = colorMap[event.color] || colorMap.indigo;
                            const isLast = i === events.length - 1;

                            return (
                                <div key={event.id} className="relative flex gap-3 pb-6">
                                    {/* Vertical line */}
                                    {!isLast && (
                                        <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
                                    )}

                                    {/* Dot / Icon */}
                                    <div
                                        className={cn(
                                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                                            colors.bg
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium leading-tight">
                                                {event.title}
                                            </p>
                                            <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                                {formatRelativeTime(event.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
