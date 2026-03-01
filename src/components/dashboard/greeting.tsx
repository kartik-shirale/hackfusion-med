"use client";

import { CalendarDays } from "lucide-react";

interface GreetingProps {
    fullName: string;
}

export const Greeting = ({ fullName }: GreetingProps) => {
    const now = new Date();
    const hour = now.getHours();
    const greeting =
        hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    const dateStr = now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {greeting}, {fullName}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Here&apos;s your pharmacy dashboard overview
                </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/10">
                    <CalendarDays className="size-4 text-[#1A1A2F]" />
                </div>
                <span>{dateStr}</span>
            </div>
        </div>
    );
};
