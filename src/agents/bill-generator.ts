import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const billGenerator = tool({
  description:
    "Generate an invoice/bill for a confirmed and paid order. Shows itemized bill with subtotal, tax, and total.",
  inputSchema: z.object({
    orderId: z.string().describe("The order ID to generate bill for"),
    userId: z.string().describe("The user ID"),
  }),
  execute: async ({ orderId, userId }) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { items: { include: { medicine: true } } },
      });

      if (!order) {
        return { error: "Order not found", status: 404 };
      }

      if (order.paymentStatus !== "PAID") {
        return {
          error: "Payment not completed yet",
          status: 400,
          paymentStatus: order.paymentStatus,
        };
      }

      const items = order.items.map((i) => ({
        name: i.medicine.name,
        brand: i.medicine.brand,
        strength: i.medicine.strength,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.unitPrice * i.quantity,
      }));

      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;

      return {
        billNumber: `INV-${order.id.slice(-8).toUpperCase()}`,
        orderId: order.id,
        date: order.createdAt.toISOString(),
        paymentId: order.paymentId,
        status: "PAID",
        items,
        subtotal,
        tax,
        taxRate: "18% GST",
        total,
      };
    } catch (error) {
      return { error: "Failed to generate bill", status: 500 };
    }
  },
});
