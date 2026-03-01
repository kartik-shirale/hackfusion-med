import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const warehouseDispatch = tool({
  description:
    "Request the warehouse to process a paid order. Call this IMMEDIATELY after paymentVerifier confirms payment is PAID. Supports: 'confirm' (start processing), 'status' (check current warehouse status). The warehouse will handle stock deduction, packing, and dispatch.",
  inputSchema: z.object({
    orderId: z.string().describe("The order ID to dispatch"),
    userId: z.string().describe("The user ID"),
    action: z
      .enum(["confirm", "status"])
      .describe(
        "confirm = send order to warehouse for processing, status = check warehouse progress"
      ),
  }),
  execute: async ({ orderId, userId, action }) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          items: {
            include: {
              medicine: { select: { name: true, strength: true } },
            },
          },
        },
      });

      if (!order) {
        return { error: "Order not found", status: 404 };
      }

      if (action === "status") {
        return {
          orderId: order.id,
          orderStatus: order.status,
          warehouseRequestedAt: order.warehouseRequestedAt,
          warehouseConfirmedAt: order.warehouseConfirmedAt,
          dispatchedAt: order.dispatchedAt,
          deliveredAt: order.deliveredAt,
          trackingNumber: order.trackingNumber,
          items: order.items.map((i) => ({
            name: i.medicine.name,
            strength: i.medicine.strength,
            quantity: i.quantity,
          })),
        };
      }

      // action === "confirm"
      if (order.paymentStatus !== "PAID") {
        return {
          error: "Cannot dispatch: payment not confirmed yet",
          orderId: order.id,
          paymentStatus: order.paymentStatus,
          status: 400,
        };
      }

      if (
        order.status === "PROCESSING" ||
        order.status === "SHIPPED" ||
        order.status === "DELIVERED"
      ) {
        return {
          orderId: order.id,
          orderStatus: order.status,
          message: `Order is already ${order.status.toLowerCase()}. No action needed.`,
          warehouseConfirmedAt: order.warehouseConfirmedAt,
          dispatchedAt: order.dispatchedAt,
          trackingNumber: order.trackingNumber,
        };
      }

      // Deduct stock (FEFO — first expiry, first out)
      for (const item of order.items) {
        const batch = await prisma.medicineBatch.findFirst({
          where: {
            medicineId: item.medicineId,
            quantity: { gte: item.quantity },
          },
          orderBy: { expiryDate: "asc" },
        });

        if (batch) {
          await prisma.medicineBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Transition CONFIRMED → PROCESSING
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PROCESSING",
          warehouseRequestedAt:
            order.warehouseRequestedAt ?? new Date(),
          warehouseConfirmedAt: new Date(),
        },
      });

      return {
        orderId: order.id,
        orderStatus: "PROCESSING",
        message:
          "Order sent to warehouse! Stock has been reserved and your order is being prepared for dispatch. You'll be notified once it ships.",
        items: order.items.map((i) => ({
          name: i.medicine.name,
          strength: i.medicine.strength,
          quantity: i.quantity,
        })),
      };
    } catch (error) {
      return { error: "Warehouse dispatch failed", status: 500 };
    }
  },
});
