"use server";
import prisma from "@/lib/prisma/client";
import { auth } from "@clerk/nextjs/server";

// Get cart items scoped to a specific chat
export const getCartItems = async (chatId?: string) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const items = await prisma.cartItem.findMany({
      where: { userId, chatId: chatId ?? undefined },
      include: {
        medicine: {
          include: {
            batches: {
              where: { quantity: { gt: 0 } },
              orderBy: { unitPrice: "asc" as const },
              take: 1,
            },
          },
        },
      },
    });

    return {
      success: true,
      items: items.map((item) => {
        const batch = item.medicine.batches[0];
        return {
          id: item.id,
          medicineId: item.medicineId,
          chatId: item.chatId,
          name: item.medicine.name,
          genericName: item.medicine.genericName,
          brand: item.medicine.brand,
          strength: item.medicine.strength,
          packSize: item.medicine.packSize,
          imageUrl: item.medicine.imageUrl,
          quantity: item.quantity,
          unitPrice: batch?.unitPrice ?? 0,
          stockQty: batch?.quantity ?? 0,
          source: item.source,
        };
      }),
    };
  } catch (error) {
    return { error: "Failed to fetch cart items", status: 500 };
  }
};

// Add items to cart scoped to a chat
export const addToCart = async (
  items: { medicineId: string; quantity: number }[],
  chatId?: string
) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    for (const item of items) {
      await prisma.cartItem.upsert({
        where: {
          userId_medicineId_chatId: {
            userId,
            medicineId: item.medicineId,
            chatId: chatId ?? "",
          },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          userId,
          medicineId: item.medicineId,
          chatId: chatId || null,
          quantity: item.quantity,
          source: "search",
        },
      });
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to add to cart", status: 500 };
  }
};

// Remove a cart item
export const removeCartItem = async (id: string) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    await prisma.cartItem.delete({
      where: { id, userId },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to remove item", status: 500 };
  }
};

// Update cart item quantity
export const updateCartItemQty = async (id: string, quantity: number) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id, userId } });
    } else {
      await prisma.cartItem.update({
        where: { id, userId },
        data: { quantity },
      });
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to update quantity", status: 500 };
  }
};
