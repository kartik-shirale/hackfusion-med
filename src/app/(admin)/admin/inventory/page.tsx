"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminInventory } from "@/actions/admin-inventory.action";
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
    BoxesIcon,
    AlertTriangleIcon,
    PackageIcon,
} from "lucide-react";

type Filter = "all" | "prescription" | "otc" | "low_stock" | "expired";

const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: "All Items" },
    { value: "prescription", label: "Prescription Only" },
    { value: "otc", label: "OTC Only" },
    { value: "low_stock", label: "Low Stock" },
    { value: "expired", label: "Expired" },
];

export default function AdminInventoryPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [category, setCategory] = useState("ALL");
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
        const result = await getAdminInventory({
            page,
            pageSize: 15,
            search: debouncedSearch,
            filter,
            category,
        });
        if (result.success) setData(result.data);
        setLoading(false);
    }, [page, debouncedSearch, filter, category]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        setPage(1);
    }, [filter, category]);

    const paginationPages = data
        ? generatePaginationPages(page, data.totalPages)
        : [];

    return (
        <div className="min-h-full">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Inventory</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Manage medicines, stock levels, and pricing
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search medicines..."
                                className="pl-9 text-sm w-[200px] rounded-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={filter}
                            onValueChange={(v) => setFilter(v as Filter)}
                        >
                            <SelectTrigger className="w-[140px] text-sm rounded-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {filterOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {data?.categories && (
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="w-[140px] text-sm rounded-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Categories</SelectItem>
                                    {data.categories.map((cat: string) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
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

                {/* Inventory Table */}
                <Card className="mt-4 border border-white/60 bg-white/50 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <CardContent className="p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                    <span className="text-sm">Loading inventory...</span>
                                </div>
                            </div>
                        ) : !data || data.medicines.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                                    <BoxesIcon className="size-5 text-slate-400" />
                                </div>
                                <span className="text-sm">No medicines found</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.medicines.map((med: any) => (
                                    <div
                                        key={med.id}
                                        className="flex items-center gap-3 rounded-full border border-white/70 bg-white/60 px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                    >
                                        {med.imageUrl ? (
                                            <img
                                                src={med.imageUrl}
                                                alt={med.name}
                                                className="size-9 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A2F]/8">
                                                <PackageIcon className="size-4 text-[#1A1A2F]/70" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{med.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {med.genericName || med.brand || med.strength}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full text-[10px] shrink-0">
                                            {med.category}
                                        </Badge>
                                        <span className="hidden lg:block text-xs text-muted-foreground shrink-0">
                                            {med.dosageForm}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {med.isLowStock && (
                                                <AlertTriangleIcon className="size-3.5 text-amber-500" />
                                            )}
                                            <span className={`text-xs font-medium ${med.isLowStock ? "text-amber-500" : ""}`}>
                                                {med.totalStock}
                                            </span>
                                        </div>
                                        <span className="shrink-0 text-sm font-semibold">
                                            ₹{med.avgPrice.toFixed(2)}
                                        </span>
                                        {med.prescriptionRequired ? (
                                            <Badge variant="outline" className="rounded-full text-[10px] border-amber-500/30 text-amber-500 shrink-0">
                                                Rx
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="rounded-full text-[10px] border-emerald-500/30 text-emerald-500 shrink-0">
                                                OTC
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {/* Pagination */}
                    {data && data.medicines.length > 0 && (
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
                                items
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
