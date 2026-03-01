import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

const STAGES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export const orderTracker = tool({
  description:
    "Track an order's real-time status with a visual timeline. Use when the user asks to track their order, check delivery status, or wants to know where their order is. Can also find the user's most recent order if no orderId is provided.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    orderId: z
      .string()
      .optional()
      .describe("The order ID to track. If not provided, fetches the most recent order."),
  }),
  execute: async ({ userId, orderId }) => {
    try {
      let order;

      if (orderId) {
        order = await prisma.order.findFirst({
          where: { id: orderId, userId },
          include: {
            items: {
              include: { medicine: { select: { name: true, strength: true, imageUrl: true } } },
            },
          },
        });
      } else {
        // Get the most recent paid order
        order = await prisma.order.findFirst({
          where: { userId, paymentStatus: "PAID" },
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { medicine: { select: { name: true, strength: true, imageUrl: true } } },
            },
          },
        });
      }

      if (!order) {
        return { error: "No order found to track.", status: 404 };
      }

      // Build timeline stages
      const currentIdx = STAGES.indexOf(order.status as (typeof STAGES)[number]);
      const timeline = STAGES.map((stage, idx) => {
        let timestamp: Date | null = null;
        switch (stage) {
          case "PENDING":
            timestamp = order.createdAt;
            break;
          case "CONFIRMED":
            timestamp = order.warehouseRequestedAt;
            break;
          case "PROCESSING":
            timestamp = order.warehouseConfirmedAt;
            break;
          case "SHIPPED":
            timestamp = order.dispatchedAt;
            break;
          case "DELIVERED":
            timestamp = order.deliveredAt;
            break;
        }

        return {
          stage,
          label: stage === "PENDING" ? "Order Placed" :
                 stage === "CONFIRMED" ? "Payment Confirmed" :
                 stage === "PROCESSING" ? "Warehouse Processing" :
                 stage === "SHIPPED" ? "Shipped" : "Delivered",
          status: idx < currentIdx ? "completed" as const :
                  idx === currentIdx ? "current" as const : "upcoming" as const,
          timestamp: timestamp?.toISOString() ?? null,
        };
      });

      // Handle cancelled/failed states
      if (order.status === "CANCELLED") {
        return {
          orderId: order.id,
          status: "CANCELLED",
          paymentStatus: order.paymentStatus,
          timeline: [],
          items: order.items.map((i) => ({
            name: i.medicine.name,
            strength: i.medicine.strength,
            quantity: i.quantity,
          })),
          message: "This order has been cancelled.",
        };
      }

      return {
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt.toISOString(),
        timeline,
        items: order.items.map((i) => ({
          name: i.medicine.name,
          strength: i.medicine.strength,
          quantity: i.quantity,
          imageUrl: i.medicine.imageUrl,
        })),
        message:
          order.status === "DELIVERED"
            ? "Your order has been delivered! We hope you're satisfied."
            : order.status === "SHIPPED"
            ? "Your order is on its way! You'll receive it soon."
            : order.status === "PROCESSING"
            ? "Your order is being prepared at our warehouse."
            : "Your order is confirmed and will be processed shortly.",
      };
    } catch (error) {
      return { error: "Failed to track order", status: 500 };
    }
  },
});
