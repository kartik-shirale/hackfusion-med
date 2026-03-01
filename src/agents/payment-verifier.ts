import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const paymentVerifier = tool({
  description:
    "Check if a payment has been completed for an order. Call this when the user says they have paid or asks to check payment status or wants to generate a bill.",
  inputSchema: z.object({
    orderId: z.string().describe("The order ID to check payment for"),
    userId: z.string().describe("The user ID"),
  }),
  execute: async ({ orderId, userId }) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
      });

      if (!order) {
        return { error: "Order not found", status: 404 };
      }

      if (order.paymentStatus === "PAID") {
        return {
          orderId: order.id,
          paymentStatus: "PAID",
          status: "CONFIRMED",
          paymentId: order.paymentId,
          totalAmount: order.totalAmount,
          message:
            "Payment confirmed! Your order has been sent to our warehouse for preparation. You'll be notified once it's dispatched for delivery.",
        };
      }

      if (order.paymentStatus === "FAILED") {
        return {
          orderId: order.id,
          paymentStatus: "FAILED",
          status: order.status,
          message:
            "Payment failed. Please try again by clicking the Pay button on the payment card above.",
        };
      }

      // Still pending
      return {
        orderId: order.id,
        paymentStatus: "PENDING",
        status: order.status,
        message:
          "Payment is still pending. Please complete the payment by clicking the Pay button on the payment card above.",
      };
    } catch (error) {
      return { error: "Failed to check payment status", status: 500 };
    }
  },
});
