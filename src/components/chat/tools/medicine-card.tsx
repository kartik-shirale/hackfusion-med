"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/actions/cart.action";
import { updateMessageToolOutput } from "@/actions/chat.action";
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
    PillIcon,
    ShoppingCartIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    Loader2Icon,
    MinusIcon,
    PlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";

interface MedicineCardProps {
    data: {
        source: string;
        medicines: any[];
        total?: number;
        userPreference?: string;
        lowStockAlerts?: string[];
        addedToCartIds?: string[];
        quantities?: Record<string, number>;
        locked?: boolean;
    };
    messageId?: string;
    partIndex?: number;
    onSendMessage?: (text: string) => void;
}

export const MedicineCard = ({
    data,
    messageId,
    partIndex,
    onSendMessage,
}: MedicineCardProps) => {
    const params = useParams();
    const chatId = params?.id as string;
    const queryClient = useQueryClient();

    const [isLocked, setIsLocked] = useState(data.locked ?? false);
    const [adding, setAdding] = useState(false);

    const [quantities, setQuantities] = useState<Record<string, number>>(() => {
        const q: Record<string, number> = {};
        data.medicines.forEach((med: any) => {
            const m = med.medicine ?? med;
            if (m?.id) q[m.id] = data.quantities?.[m.id] ?? 1;
        });
        return q;
    });

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [addedIds] = useState<Set<string>>(new Set(data.addedToCartIds ?? []));

    // Scroll navigation for medicine cards
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", checkScroll, { passive: true });
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", checkScroll);
            ro.disconnect();
        };
    }, [checkScroll]);

    const scroll = useCallback((dir: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
    }, []);

    const updateQty = useCallback((id: string, delta: number) => {
        setQuantities((prev) => ({
            ...prev,
            [id]: Math.max(1, (prev[id] ?? 1) + delta),
        }));
    }, []);

    const toggleSelect = useCallback(
        (id: string) => {
            if (isLocked || addedIds.has(id)) return;
            setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        },
        [isLocked, addedIds]
    );

    // Check if any selected medicine requires prescription
    const getSelectedRxMedicines = useCallback(() => {
        return data.medicines.filter((med: any) => {
            const m = med.medicine ?? med;
            return m?.id && selected.has(m.id) && m.prescriptionRequired;
        });
    }, [data.medicines, selected]);

    const handleAddToCart = useCallback(async () => {
        if (selected.size === 0 || isLocked) return;

        const rxMeds = getSelectedRxMedicines();
        const nonRxIds = Array.from(selected).filter(
            (id) => !rxMeds.some((r: any) => (r.medicine ?? r).id === id)
        );

        // Add Non-Rx medicines directly
        if (nonRxIds.length > 0) {
            setAdding(true);
            try {
                const items = nonRxIds.map((id) => ({
                    medicineId: id,
                    quantity: quantities[id] ?? 1,
                }));
                const result = await addToCart(items, chatId);
                if (result.success) {
                    queryClient.invalidateQueries({
                        queryKey: ["cart", chatId ?? "global"],
                    });

                    // If ONLY non-rx items were selected, we can lock and clear
                    if (rxMeds.length === 0) {
                        setIsLocked(true);
                        setSelected(new Set());
                        if (messageId && partIndex !== undefined) {
                            await updateMessageToolOutput(messageId, partIndex, {
                                addedToCartIds: nonRxIds,
                                quantities: { ...quantities },
                                locked: true,
                            });
                        }
                    }

                    // Trigger checkout prompt if only non-Rx items were added
                    if (rxMeds.length === 0 && onSendMessage) {
                        onSendMessage(
                            `__TRIGGER__ I just added ${nonRxIds.length} item(s) to my cart. What should I do next?`
                        );
                    }
                }
            } finally {
                setAdding(false);
            }
        }

        // Trigger AI to show prescription uploader for Rx medicines
        if (rxMeds.length > 0 && onSendMessage) {
            const rxNames = rxMeds
                .map((med: any) => (med.medicine ?? med).name)
                .join(", ");
            const nonRxNamesText = nonRxIds.length > 0
                ? `I just added ${nonRxIds.length} non-prescription items to my cart. `
                : "";

            onSendMessage(
                `__TRIGGER__ ${nonRxNamesText}I also want to add ${rxNames} to my cart, but they require a prescription. Please request a prescription upload for these medicines.`
            );

            // We lock the card since we processed the click
            setIsLocked(true);
            setSelected(new Set());
        }
    }, [
        selected,
        quantities,
        isLocked,
        chatId,
        messageId,
        partIndex,
        queryClient,
        getSelectedRxMedicines,
        onSendMessage,
    ]);

    if (!data?.medicines?.length) {
        return (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <PillIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                No medicines found. Try a different search term.
            </div>
        );
    }

    const isPrescription = data.source === "prescription";

    let selectedTotal = 0;
    data.medicines.forEach((med: any) => {
        const m = med.medicine ?? med;
        if (m?.id && selected.has(m.id)) {
            selectedTotal += (m.price ?? 0) * (quantities[m.id] ?? 1);
        }
    });

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <PillIcon className="size-4 text-[#1A1A2F]" />
                    {isPrescription
                        ? "Prescribed Medicines"
                        : `Found ${data.total ?? data.medicines.length} medicine(s)`}
                    {data.userPreference && (
                        <Badge variant="outline" className="text-xs">
                            {data.userPreference}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Locked banner */}
            {isLocked && (
                <div className="flex items-center gap-2 rounded-lg bg-[#1A1A2F]/5 px-3 py-2.5 text-xs font-medium text-[#1A1A2F] dark:bg-[#1A1A2F]/10 dark:text-[#A8A8C0]">
                    <CheckCircleIcon className="size-4" />
                    Selected medicines have been added to your cart
                </div>
            )}

            {/* Low stock alerts */}
            {!isLocked && data.lowStockAlerts && data.lowStockAlerts.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <AlertTriangleIcon className="size-3.5" />
                    Low stock: {data.lowStockAlerts.join(", ")}
                </div>
            )}

            {/* Horizontal scrollable medicine cards */}
            <div className="relative group/slider">
                {/* Left arrow */}
                {canScrollLeft && (
                    <button
                        type="button"
                        onClick={() => scroll("left")}
                        className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border bg-background/90 shadow-md backdrop-blur-sm transition-opacity hover:bg-accent"
                    >
                        <ChevronLeftIcon className="size-4" />
                    </button>
                )}

                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scroll-smooth"
                >
                    {data.medicines.map((med: any, i: number) => {
                        const medicine = med.medicine ?? med;
                        const notFound = med.found === false;
                        const isInCart = medicine?.id && addedIds.has(medicine.id);
                        const isRx = !!medicine?.prescriptionRequired;
                        const canSelect =
                            !isLocked &&
                            medicine?.id &&
                            medicine?.inStock !== false &&
                            !notFound &&
                            !isInCart;
                        const isSelected = medicine?.id && selected.has(medicine.id);
                        const qty = quantities[medicine?.id] ?? 1;

                        return (
                            <div
                                key={medicine?.id ?? i}
                                onClick={() => canSelect && toggleSelect(medicine.id)}
                                className={cn(
                                    "flex-shrink-0 w-52 rounded-xl border bg-card transition-all",
                                    canSelect && "cursor-pointer hover:shadow-md",
                                    notFound && "border-dashed opacity-60",
                                    isLocked && "pointer-events-none",
                                    isInCart &&
                                    "border-[#1A1A2F]/30 bg-[#1A1A2F]/5 dark:bg-[#1A1A2F]/10",
                                    isSelected &&
                                    "border-[#1A1A2F] ring-1 ring-[#1A1A2F]/20 bg-[#1A1A2F]/5 dark:bg-[#1A1A2F]/10"
                                )}
                            >
                                {/* Medicine Image */}
                                <div className="relative h-32 w-full overflow-hidden rounded-t-xl bg-muted/50">
                                    {medicine?.imageUrl ? (
                                        <img
                                            src={medicine.imageUrl}
                                            alt={medicine.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <PillIcon className="size-12 text-muted-foreground/30" />
                                        </div>
                                    )}

                                    {isInCart && (
                                        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#1A1A2F] px-2 py-0.5 text-[10px] font-medium text-white">
                                            <CheckCircleIcon className="size-3" />
                                            In Cart
                                        </div>
                                    )}
                                    {isSelected && !isInCart && (
                                        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#1A1A2F] px-2 py-0.5 text-[10px] font-medium text-white">
                                            <CheckCircleIcon className="size-3" />
                                            Selected
                                        </div>
                                    )}
                                    {isRx && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute left-2 top-2 text-[10px]"
                                        >
                                            Rx
                                        </Badge>
                                    )}
                                </div>

                                {/* Medicine Info */}
                                <div className="p-3 space-y-1.5">
                                    <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                                        {medicine?.name ?? med.requested}
                                    </h4>

                                    {medicine?.genericName && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                                            {medicine.genericName}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                        {medicine?.brand && (
                                            <span className="truncate">{medicine.brand}</span>
                                        )}
                                        {medicine?.strength && (
                                            <span>• {medicine.strength}</span>
                                        )}
                                    </div>

                                    {medicine?.inStock === false && (
                                        <Badge variant="secondary" className="text-[10px]">
                                            Out of Stock
                                        </Badge>
                                    )}

                                    {notFound && (
                                        <p className="text-[11px] text-amber-600">Not found</p>
                                    )}

                                    {medicine?.price > 0 && (
                                        <p className="text-base font-bold text-[#1A1A2F]">
                                            ₹{(medicine.price * qty).toFixed(2)}
                                            {qty > 1 && (
                                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                                    (₹{medicine.price.toFixed(2)} × {qty})
                                                </span>
                                            )}
                                        </p>
                                    )}

                                    {/* Quantity selector */}
                                    {canSelect && !isLocked && (
                                        <div
                                            className="flex items-center gap-2 mt-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() => updateQty(medicine.id, -1)}
                                                disabled={qty <= 1}
                                            >
                                                <MinusIcon className="size-3" />
                                            </Button>
                                            <span className="text-sm font-medium w-6 text-center">
                                                {qty}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() => updateQty(medicine.id, 1)}
                                                disabled={
                                                    medicine?.stockQty
                                                        ? qty >= medicine.stockQty
                                                        : false
                                                }
                                            >
                                                <PlusIcon className="size-3" />
                                            </Button>
                                            {medicine?.stockQty > 0 && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {medicine.stockQty} avail
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Locked quantity */}
                                    {isLocked && isInCart && (
                                        <p className="text-xs text-muted-foreground">
                                            Qty: {data.quantities?.[medicine?.id] ?? 1}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right arrow */}
                {canScrollRight && (
                    <button
                        type="button"
                        onClick={() => scroll("right")}
                        className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border bg-background/90 shadow-md backdrop-blur-sm transition-opacity hover:bg-accent"
                    >
                        <ChevronRightIcon className="size-4" />
                    </button>
                )}
            </div>

            {/* Alternatives */}
            {!isLocked &&
                data.medicines.some(
                    (med: any) => (med.medicine ?? med)?.alternatives?.length > 0
                ) && (
                    <div className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Available Alternatives:
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {data.medicines.flatMap((med: any) => {
                                const m = med.medicine ?? med;
                                return (m?.alternatives ?? []).map((alt: any) => (
                                    <Badge key={alt.id} variant="outline" className="text-xs">
                                        {alt.name} — {alt.reason}
                                    </Badge>
                                ));
                            })}
                        </div>
                    </div>
                )}

            {/* Selection Summary + Add to Cart */}
            {!isLocked && selected.size > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#1A1A2F]/30 bg-[#1A1A2F]/5 px-4 py-3 transition-all dark:border-[#1A1A2F]/20 dark:bg-[#1A1A2F]/10">
                    <div className="text-sm">
                        <span className="font-medium">{selected.size} selected</span>
                        <span className="ml-2 text-muted-foreground">
                            Total: ₹{selectedTotal.toFixed(2)}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={adding}
                        className="bg-[#1A1A2F] hover:bg-[#1A1A2F]/90"
                    >
                        {adding ? (
                            <Loader2Icon className="mr-2 size-3.5 animate-spin" />
                        ) : (
                            <ShoppingCartIcon className="mr-2 size-3.5" />
                        )}
                        Add to Cart
                    </Button>
                </div>
            )}
        </div>
    );
};
