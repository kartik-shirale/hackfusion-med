"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    LayoutDashboardIcon,
    PackageIcon,
    BoxesIcon,
    UsersIcon,
    PillIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CiSettings } from "react-icons/ci";

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
}

const navItems: NavItem[] = [
    { icon: LayoutDashboardIcon, label: "Dashboard", href: "/admin" },
    { icon: PackageIcon, label: "Orders", href: "/admin/orders" },
    { icon: BoxesIcon, label: "Inventory", href: "/admin/inventory" },
    { icon: UsersIcon, label: "Customers", href: "/admin/customers" },
];

export const AdminSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    const isActive = (href: string) => {
        if (href === "/admin") return pathname === "/admin";
        return pathname.startsWith(href);
    };

    return (
        <aside className="relative z-10 flex h-full w-[60px] flex-col py-3 transition-all duration-200">
            {/* Brand icon */}
            <div className="flex items-center justify-center pb-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/60 text-indigo-600 shadow-sm">
                    <PillIcon className="size-5" />
                </div>
            </div>

            {/* Nav items */}
            <div className="flex flex-1 flex-col items-center gap-1 pt-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Tooltip key={item.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "size-10 rounded-xl text-muted-foreground/70 transition-colors hover:bg-white/50 hover:text-foreground",
                                        active &&
                                        "bg-white/60 text-indigo-600 shadow-sm hover:bg-white/80 hover:text-indigo-700"
                                    )}
                                    onClick={() => router.push(item.href)}
                                >
                                    <item.icon className="size-[18px]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Settings + Profile at bottom */}
            <div className="flex flex-col items-center gap-2 py-2">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-10 rounded-xl text-muted-foreground/70 hover:bg-white/50 hover:text-foreground"
                            onClick={() => router.push("/admin")}
                        >
                            <CiSettings className="size-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        Settings
                    </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            className="rounded-full ring-2 ring-transparent transition-all hover:ring-indigo-400/40"
                            onClick={() => router.push("/admin")}
                        >
                            <Avatar className="size-9">
                                <AvatarImage src={user?.imageUrl} />
                                <AvatarFallback className="bg-indigo-500/10 text-indigo-600 text-xs font-semibold">
                                    {user?.firstName?.[0]}
                                    {user?.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        {user?.fullName || "Admin"}
                    </TooltipContent>
                </Tooltip>
            </div>
        </aside>
    );
};
