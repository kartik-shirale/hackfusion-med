import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const orderManager = tool({
  description:
    "Create an order from cart items. Reads items directly from the user's cart. Creates a PENDING order and returns payment details so the user can complete payment via Razorpay.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    chatId: z.string().optional().describe("The current chat session ID"),
    prescriptionId: z
      .string()
      .optional()
      .describe("Associated prescription ID"),
  }),
  execute: async ({ userId, chatId, prescriptionId }) => {
    try {
      // Read items directly from cart — never trust LLM input for order data
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
        return { error: "Cart is empty. Add items before placing an order.", status: 400 };
      }

      // Build order items with verified prices from DB
      const orderItems = cartItems.map((item) => {
        const batch = item.medicine.batches[0];
        const unitPrice = batch?.unitPrice ?? 0;
        return {
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitPrice,
          name: item.medicine.name,
        };
      });

      const totalAmount = orderItems.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0
      );

      if (totalAmount <= 0) {
        return { error: "Could not calculate order total. Medicine pricing not available.", status: 400 };
      }

      // Create PENDING order
      const order = await prisma.order.create({
        data: {
          userId,
          totalAmount,
          status: "PENDING",
          paymentStatus: "PENDING",
          prescriptionId,
          items: {
            create: orderItems.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: { include: { medicine: true } } },
      });

      return {
        orderId: order.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        totalAmount,
        items: order.items.map((i) => ({
          medicineId: i.medicineId,
          name: i.medicine.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.unitPrice * i.quantity,
        })),
        message:
          "Order created. Please complete payment to confirm your order.",
        requiresPayment: true,
      };
    } catch (error) {
      return { error: "Failed to create order", status: 500 };
    }
  },
});
