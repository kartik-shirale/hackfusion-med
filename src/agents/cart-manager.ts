import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const cartManager = tool({
  description:
    "Manage the user's shopping cart scoped to the current chat session. Supports adding, removing, updating quantities, viewing cart contents, and initiating checkout.",
  inputSchema: z.object({
    action: z
      .enum(["add", "remove", "update", "view", "checkout", "clear"])
      .describe("Cart action to perform"),
    items: z
      .array(
        z.object({
          medicineId: z.string(),
          quantity: z.number().default(1),
          source: z.enum(["search", "prescription"]).optional(),
          prescriptionId: z.string().optional(),
        })
      )
      .optional()
      .describe("Items to add/update/remove"),
    userId: z.string().describe("The user ID"),
    chatId: z.string().optional().describe("The current chat session ID"),
  }),
  execute: async ({ action, items, userId, chatId }) => {
    try {
      switch (action) {
        case "view": {
          const cartItems = await prisma.cartItem.findMany({
            where: { userId, chatId: chatId ?? undefined },
            include: {
              medicine: {
                include: {
                  batches: {
                    where: { quantity: { gt: 0 } },
                    orderBy: { unitPrice: "asc" },
                    take: 1,
                  },
                },
              },
            },
          });

          const formatted = cartItems.map((item) => {
            const batch = item.medicine.batches[0];
            return {
              id: item.id,
              medicineId: item.medicineId,
              name: item.medicine.name,
              brand: item.medicine.brand,
              strength: item.medicine.strength,
              packSize: item.medicine.packSize,
              imageUrl: item.medicine.imageUrl,
              quantity: item.quantity,
              unitPrice: batch?.unitPrice ?? 0,
              totalPrice: (batch?.unitPrice ?? 0) * item.quantity,
              inStock: (batch?.quantity ?? 0) >= item.quantity,
              source: item.source,
            };
          });

          const total = formatted.reduce((sum, i) => sum + i.totalPrice, 0);

          return {
            action: "view",
            items: formatted,
            totalItems: formatted.length,
            totalAmount: total,
          };
        }

        case "add": {
          if (!items?.length) {
            return { error: "No items provided to add", status: 400 };
          }

          const added = await Promise.all(
            items.map(async (item) => {
              // Check stock
              const batch = await prisma.medicineBatch.findFirst({
                where: { medicineId: item.medicineId, quantity: { gt: 0 } },
                orderBy: { unitPrice: "asc" },
              });

              if (!batch || batch.quantity < item.quantity) {
                return {
                  medicineId: item.medicineId,
                  added: false,
                  reason: "Insufficient stock",
                };
              }

              // Check if prescription required
              const medicine = await prisma.medicine.findUnique({
                where: { id: item.medicineId },
              });

              if (medicine?.prescriptionRequired && !item.prescriptionId) {
                return {
                  medicineId: item.medicineId,
                  name: medicine.name,
                  added: false,
                  reason: "Prescription required",
                  prescriptionRequired: true,
                };
              }

              // Upsert cart item scoped to chat
              const cartItem = await prisma.cartItem.upsert({
                where: {
                  userId_medicineId_chatId: {
                    userId,
                    medicineId: item.medicineId,
                    chatId: chatId ?? "",
                  },
                },
                update: {
                  quantity: { increment: item.quantity },
                  source: item.source,
                  prescriptionId: item.prescriptionId,
                },
                create: {
                  userId,
                  medicineId: item.medicineId,
                  chatId: chatId || null,
                  quantity: item.quantity,
                  source: item.source,
                  prescriptionId: item.prescriptionId,
                },
              });

              return {
                medicineId: item.medicineId,
                name: medicine?.name,
                added: true,
                quantity: cartItem.quantity,
              };
            })
          );

          return { action: "add", results: added };
        }

        case "remove": {
          if (!items?.length) {
            return { error: "No items provided to remove", status: 400 };
          }

          await Promise.all(
            items.map((item) =>
              prisma.cartItem.deleteMany({
                where: { userId, medicineId: item.medicineId, chatId: chatId ?? undefined },
              })
            )
          );

          return {
            action: "remove",
            removed: items.map((i) => i.medicineId),
          };
        }

        case "update": {
          if (!items?.length) {
            return { error: "No items provided to update", status: 400 };
          }

          const updated = await Promise.all(
            items.map(async (item) => {
              if (item.quantity <= 0) {
                await prisma.cartItem.deleteMany({
                  where: { userId, medicineId: item.medicineId, chatId: chatId ?? undefined },
                });
                return { medicineId: item.medicineId, removed: true };
              }

              const batch = await prisma.medicineBatch.findFirst({
                where: { medicineId: item.medicineId, quantity: { gt: 0 } },
              });

              if (!batch || batch.quantity < item.quantity) {
                return {
                  medicineId: item.medicineId,
                  updated: false,
                  reason: "Insufficient stock",
                  availableQty: batch?.quantity ?? 0,
                };
              }

              await prisma.cartItem.updateMany({
                where: { userId, medicineId: item.medicineId, chatId: chatId ?? undefined },
                data: { quantity: item.quantity },
              });

              return {
                medicineId: item.medicineId,
                updated: true,
                quantity: item.quantity,
              };
            })
          );

          return { action: "update", results: updated };
        }

        case "checkout": {
          const cartItems = await prisma.cartItem.findMany({
            where: { userId, chatId: chatId ?? undefined },
            include: {
              medicine: {
                include: {
                  batches: {
                    where: { quantity: { gt: 0 } },
                    orderBy: { unitPrice: "asc" },
                    take: 1,
                  },
                },
              },
            },
          });

          if (!cartItems.length) {
            return { error: "Cart is empty", status: 400 };
          }

          const checkoutItems = cartItems.map((item) => {
            const batch = item.medicine.batches[0];
            return {
              medicineId: item.medicineId,
              name: item.medicine.name,
              quantity: item.quantity,
              unitPrice: batch?.unitPrice ?? 0,
              totalPrice: (batch?.unitPrice ?? 0) * item.quantity,
            };
          });

          const totalAmount = checkoutItems.reduce(
            (sum, i) => sum + i.totalPrice,
            0
          );

          return {
            action: "checkout",
            items: checkoutItems,
            totalAmount,
            message: "Ready for checkout. Proceeding to payment.",
          };
        }

        case "clear": {
          const deleted = await prisma.cartItem.deleteMany({
            where: { userId, chatId: chatId ?? undefined },
          });

          return {
            action: "clear",
            deletedCount: deleted.count,
            message: "Cart has been cleared.",
          };
        }

        default:
          return { error: "Invalid action", status: 400 };
      }
    } catch (error) {
      return { error: "Cart operation failed", status: 500 };
    }
  },
});
