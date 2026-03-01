"use client";

import { useChatStore } from "@/stores/chat-store";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  Trash2Icon,
  Loader2Icon,
  PackageIcon,
} from "lucide-react";

export const CartSheet = () => {
  const { cartOpen, setCartOpen, chatId } = useChatStore();
  const { items, total, count, isLoading, removeItem, updateQty } =
    useCart(chatId);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="absolute bottom-20 right-4 md:right-10 md:bottom-9 z-50 size-10 rounded-full bg-[#1A1A2F] shadow-lg hover:bg-[#1A1A2F]/90"
        >
          <ShoppingCartIcon className="size-5" />
          {count > 0 && (
            <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white">
              {count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[380px] flex-col sm:w-[420px] bg-[#ece5f3] border-white/50 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="size-5" />
            Your Cart
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count} items
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <ShoppingCartIcon className="mb-3 size-10 text-muted-foreground/30" />
            <p>Your cart is empty.</p>
            <p className="mt-1 text-xs">
              Search for medicines and add them to your cart.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-full border bg-card p-3"
                  >
                    <div className="rounded-full bg-muted p-2">
                      <PackageIcon className="size-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1  min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      {/* <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {item.strength && <span>{item.strength}</span>}
                        {item.brand && <span>• {item.brand}</span>}
                      </div> */}
                      {/* <p className="text-xs text-[#1A1A2F] font-medium">
                        ₹{item.unitPrice.toFixed(2)} each
                      </p> */}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex  items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7"
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                      >
                        <MinusIcon className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7"
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    </div>

                    {/* Total + Remove */}
                    <div className="flex gap-4 items-center">
                      <p className="text-sm font-semibold text-[#1A1A2F]">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer total */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-[#1A1A2F]">
                  ₹{total.toFixed(2)}
                </span>
              </div>
              <Button className="w-full bg-[#1A1A2F] hover:bg-[#1A1A2F]/90">
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
