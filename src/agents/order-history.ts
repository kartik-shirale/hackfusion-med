import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const orderHistory = tool({
  description:
    "Fetch past orders. Supports filtering by date range, status, and limit. Shows max 5 orders by default with clickable links. Ask user for specific dates or status if they want filtered results.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    query: z
      .string()
      .optional()
      .describe("Natural language query like 'last month' or 'recent orders'"),
    dateRange: z
      .object({
        from: z.string().describe("Start date (ISO string)"),
        to: z.string().describe("End date (ISO string)"),
      })
      .optional()
      .describe("Specific date range"),
    status: z
      .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
      .optional()
      .describe("Filter by order status"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max number of orders to return (default 5)"),
  }),
  execute: async ({ userId, query, dateRange, status, limit = 5 }) => {
    try {
      // Build date filter
      let dateFilter: { gte?: Date; lte?: Date } = {};

      if (dateRange) {
        dateFilter = {
          gte: new Date(dateRange.from),
          lte: new Date(dateRange.to),
        };
      } else if (query) {
        const now = new Date();
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes("last month") || lowerQuery.includes("past month")) {
          dateFilter.gte = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (lowerQuery.includes("last week") || lowerQuery.includes("past week")) {
          dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (lowerQuery.includes("last 3 months") || lowerQuery.includes("past 3 months")) {
          dateFilter.gte = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (lowerQuery.includes("this year")) {
          dateFilter.gte = new Date(now.getFullYear(), 0, 1);
        } else if (lowerQuery.includes("today")) {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          dateFilter.gte = start;
        } else if (lowerQuery.includes("yesterday")) {
          const start = new Date(now);
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          dateFilter = { gte: start, lte: end };
        } else {
          // Default: last 30 days
          dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        if (!dateFilter.lte) dateFilter.lte = now;
      }

      const orders = await prisma.order.findMany({
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          items: {
            include: { medicine: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 10), // Cap at 10
      });

      // Format orders
      const formatted = orders.map((order) => ({
        orderId: order.id,
        date: order.createdAt.toISOString(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        isAutoRefill: order.isAutoRefill,
        items: order.items.map((item) => ({
          name: item.medicine.name,
          brand: item.medicine.brand,
          strength: item.medicine.strength,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }));

      // Detect recurring medicines (appear in 2+ orders)
      const medicineCounts: Record<string, { name: string; count: number; medicineId: string }> = {};
      for (const order of orders) {
        for (const item of order.items) {
          const key = item.medicineId;
          if (!medicineCounts[key]) {
            medicineCounts[key] = { name: item.medicine.name, count: 0, medicineId: key };
          }
          medicineCounts[key].count++;
        }
      }

      const recurring = Object.values(medicineCounts).filter((m) => m.count >= 2);

      return {
        orders: formatted,
        totalOrders: formatted.length,
        recurringMedicines: recurring,
        hasRefillSuggestions: recurring.length > 0,
        message:
          recurring.length > 0
            ? `Found ${recurring.length} medicine(s) you order regularly. Would you like to set up auto-refill?`
            : undefined,
      };
    } catch (error) {
      return { error: "Failed to fetch order history", status: 500 };
    }
  },
});
