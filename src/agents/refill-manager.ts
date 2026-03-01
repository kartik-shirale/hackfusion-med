import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const refillManager = tool({
  description:
    "Manage auto-refill schedules for recurring medicines. View eligible medicines, activate or deactivate refill plans.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    action: z
      .enum(["view", "activate", "deactivate"])
      .describe("Refill action to perform"),
    medicineId: z
      .string()
      .optional()
      .describe("Medicine ID for activate"),
    refillId: z
      .string()
      .optional()
      .describe("Refill alert ID for deactivate"),
    intervalDays: z
      .number()
      .optional()
      .describe("Refill interval in days (e.g., 30 for monthly, 2 for every 2 days)"),
  }),
  execute: async ({ userId, action, medicineId, refillId, intervalDays }) => {
    try {
      switch (action) {
        case "view": {
          // Fetch active refill alerts
          const refills = await prisma.refillAlert.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
          });

          // Also suggest medicines from order history
          const recentOrders = await prisma.order.findMany({
            where: {
              userId,
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              },
            },
            include: { items: { include: { medicine: true } } },
          });

          // Find medicines ordered multiple times
          const counts: Record<string, { name: string; count: number; id: string }> = {};
          for (const order of recentOrders) {
            for (const item of order.items) {
              if (!counts[item.medicineId]) {
                counts[item.medicineId] = {
                  name: item.medicine.name,
                  count: 0,
                  id: item.medicineId,
                };
              }
              counts[item.medicineId].count++;
            }
          }

          const eligible = Object.values(counts).filter((m) => m.count >= 2);

          return {
            action: "view",
            activeRefills: refills.map((r) => ({
              id: r.id,
              medicineName: r.medicineName,
              enabled: r.autoRefillEnabled,
              intervalDays: r.refillIntervalDays,
              nextRefillDate: r.nextRefillDate?.toISOString(),
              prepaidAmount: r.prepaidAmount,
              creditsEarned: r.creditsEarned,
              status: r.status,
            })),
            eligibleMedicines: eligible,
          };
        }

        case "activate": {
          if (!medicineId) {
            return { error: "Medicine ID required for activation", status: 400 };
          }

          const medicine = await prisma.medicine.findUnique({
            where: { id: medicineId },
          });

          if (!medicine) {
            return { error: "Medicine not found", status: 404 };
          }

          // Check if already has an active refill for this medicine
          const existing = await prisma.refillAlert.findFirst({
            where: { userId, medicineId, autoRefillEnabled: true },
          });

          if (existing) {
            return {
              action: "activate",
              error: `Auto-refill already active for ${medicine.name}. Next refill: ${existing.nextRefillDate?.toLocaleDateString()}.`,
              refillId: existing.id,
              status: 400,
            };
          }

          const interval = intervalDays ?? 30;
          const nextRefill = new Date(
            Date.now() + interval * 24 * 60 * 60 * 1000
          );

          const refillAlert = await prisma.refillAlert.create({
            data: {
              userId,
              medicineId,
              medicineName: medicine.name,
              daysRemaining: interval,
              priority: "HEADS_UP",
              status: "PENDING",
              autoRefillEnabled: true,
              refillIntervalDays: interval,
              nextRefillDate: nextRefill,
              prepaidAmount: 0,
              creditsEarned: 0,
            },
          });

          return {
            action: "activate",
            refillId: refillAlert.id,
            medicineName: medicine.name,
            intervalDays: interval,
            nextRefillDate: nextRefill.toISOString(),
            message: `Auto-refill activated for ${medicine.name} every ${interval} days. You will receive a notification with a payment link on ${nextRefill.toLocaleDateString()}. Once you pay, your order will be placed automatically.`,
          };
        }

        case "deactivate": {
          // Find the refill to deactivate
          let refill;

          if (refillId) {
            refill = await prisma.refillAlert.findFirst({
              where: { id: refillId, userId },
            });
          } else if (medicineId) {
            refill = await prisma.refillAlert.findFirst({
              where: { userId, medicineId, autoRefillEnabled: true },
            });
          } else {
            return {
              error: "Please specify which refill to deactivate (refillId or medicineId required)",
              status: 400,
            };
          }

          if (!refill) {
            return { error: "No active refill found", status: 404 };
          }

          await prisma.refillAlert.update({
            where: { id: refill.id },
            data: {
              autoRefillEnabled: false,
              status: "CANCELLED",
              paymentLinkId: null,
              paymentLinkUrl: null,
            },
          });

          return {
            action: "deactivate",
            refillId: refill.id,
            medicineName: refill.medicineName,
            message: `Auto-refill for ${refill.medicineName} has been deactivated. You will no longer receive refill reminders for this medicine.`,
          };
        }

        default:
          return { error: "Invalid action", status: 400 };
      }
    } catch (error) {
      return { error: "Refill operation failed", status: 500 };
    }
  },
});
