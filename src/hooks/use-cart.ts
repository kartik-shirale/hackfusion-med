"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCartItems,
  addToCart,
  removeCartItem,
  updateCartItemQty,
} from "@/actions/cart.action";

export interface CartItem {
  id: string;
  medicineId: string;
  chatId?: string | null;
  quantity: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  strength: string;
  packSize: string;
  imageUrl: string | null;
  unitPrice: number;
  stockQty: number;
  source: string | null;
}

const CART_KEY = "cart";

export const useCart = (chatId?: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = [CART_KEY, chatId ?? "global"];

  // Fetch cart items
  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<CartItem[]>({
    queryKey,
    queryFn: async () => {
      const result = await getCartItems(chatId ?? undefined);
      if (result.success && result.items) {
        return result.items as CartItem[];
      }
      return [];
    },
  });

  // Derived values
  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const count = items.length;

  // Add to cart — optimistic
  const addMutation = useMutation({
    mutationFn: async (
      newItems: { medicineId: string; quantity: number }[]
    ) => {
      return addToCart(newItems, chatId ?? undefined);
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CartItem[]>(queryKey);

      queryClient.setQueryData<CartItem[]>(queryKey, (old = []) => {
        const updated = [...old];
        for (const item of newItems) {
          const existing = updated.find(
            (c) => c.medicineId === item.medicineId
          );
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            // Optimistic placeholder — will be replaced by server data
            updated.push({
              id: `temp-${item.medicineId}`,
              medicineId: item.medicineId,
              chatId: chatId ?? null,
              quantity: item.quantity,
              name: "Adding...",
              genericName: null,
              brand: null,
              strength: "",
              packSize: "",
              imageUrl: null,
              unitPrice: 0,
              stockQty: 0,
              source: "search",
            });
          }
        }
        return updated;
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Remove from cart — optimistic
  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return removeCartItem(itemId);
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CartItem[]>(queryKey);

      queryClient.setQueryData<CartItem[]>(queryKey, (old = []) =>
        old.filter((item) => item.id !== itemId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update quantity — optimistic
  const updateQtyMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return updateCartItemQty(id, quantity);
    },
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CartItem[]>(queryKey);

      if (quantity <= 0) {
        queryClient.setQueryData<CartItem[]>(queryKey, (old = []) =>
          old.filter((item) => item.id !== id)
        );
      } else {
        queryClient.setQueryData<CartItem[]>(queryKey, (old = []) =>
          old.map((item) => (item.id === id ? { ...item, quantity } : item))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    items,
    total,
    count,
    isLoading,
    refetch,
    addItem: (newItems: { medicineId: string; quantity: number }[]) =>
      addMutation.mutate(newItems),
    removeItem: (itemId: string) => removeMutation.mutate(itemId),
    updateQty: (id: string, quantity: number) =>
      updateQtyMutation.mutate({ id, quantity }),
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isUpdating: updateQtyMutation.isPending,
  };
};
