"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminCustomers } from "@/actions/admin-customers.action";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    UsersIcon,
    IndianRupeeIcon,
} from "lucide-react";

type RoleFilter = "ALL" | "USER" | "ADMIN";

const roleOptions: { value: RoleFilter; label: string }[] = [
    { value: "ALL", label: "All Roles" },
    { value: "USER", label: "Users" },
    { value: "ADMIN", label: "Admins" },
];

export default function AdminCustomersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
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

    const loadData = useCallback(async () => {
        setLoading(true);
        const result = await getAdminCustomers({
            page,
            pageSize: 15,
            search: debouncedSearch,
            roleFilter,
        });
        if (result.success) setData(result.data);
        setLoading(false);
    }, [page, debouncedSearch, roleFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        setPage(1);
    }, [roleFilter]);

    const paginationPages = data
        ? generatePaginationPages(page, data.totalPages)
        : [];

    return (
        <div className="min-h-full">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
                {/* Header with inline search + filters */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Customers</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            View and manage registered users
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search customers..."
                                className="pl-9 text-sm w-[220px] rounded-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={roleFilter}
                            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
                        >
                            <SelectTrigger className="w-[130px] text-sm rounded-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map((opt) => (
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
                            onClick={loadData}
                        >
                            <RefreshCwIcon className="size-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Customer Table */}
                <Card className="mt-4 border border-white/60 bg-white/50 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <CardContent className="p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                    <span className="text-sm">Loading customers...</span>
                                </div>
                            </div>
                        ) : !data || data.customers.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                                    <UsersIcon className="size-5 text-slate-400" />
                                </div>
                                <span className="text-sm">No customers found</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.customers.map((customer: any) => (
                                    <div
                                        key={customer.id}
                                        className="flex items-center gap-3 rounded-full border border-white/70 bg-white/60 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                    >
                                        <Avatar className="size-9 shrink-0">
                                            <AvatarImage src={customer.profile} />
                                            <AvatarFallback className="bg-[#1A1A2F]/10 text-[#1A1A2F] text-xs font-semibold">
                                                {customer.fullName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{customer.fullName}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{customer.email}</p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full text-[10px] shrink-0 ${customer.role === "ADMIN"
                                                ? "border-violet-500/30 bg-violet-500/10 text-violet-500"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {customer.role}
                                        </Badge>
                                        <div className="hidden md:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                            <span>{customer.totalOrders} orders</span>
                                            <span>•</span>
                                            <span>{customer.completedOrders} done</span>
                                        </div>
                                        <span className="shrink-0 text-sm font-semibold flex items-center gap-0.5">
                                            <IndianRupeeIcon className="size-3" />
                                            {customer.totalSpent.toLocaleString("en-IN")}
                                        </span>
                                        <span className="hidden sm:block shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(customer.joinedAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {/* Pagination */}
                    {data && data.customers.length > 0 && (
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
                                customers
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
                                    {paginationPages.map((p, i) =>
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
                                                page < data.totalPages && setPage(page + 1)
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
