import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

export const notify = tool({
  description:
    "Send notifications to users via their preferred channel (WhatsApp, email, or both). Called internally by other tools after key events like order confirmation or refill completion.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    type: z
      .enum([
        "order_confirmed",
        "refill_done",
        "payment_partial",
        "low_stock",
        "refill_reminder",
      ])
      .describe("Notification type"),
    payload: z
      .record(z.string(), z.any())
      .describe("Notification payload data (order details, amounts, etc.)"),
  }),
  execute: async ({ userId, type, payload }) => {
    try {
      // Get user details + notification preference
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          fullName: true,
          mobile: true,
          preference: {
            select: { notificationChannel: true },
          },
        },
      });

      if (!user) {
        return { success: false, error: "User not found", status: 404 };
      }

      const channel = user.preference?.notificationChannel ?? "email";

      // Map to enum values
      const typeMap: Record<string, "ORDER_CONFIRMED" | "PAYMENT_PARTIAL" | "REFILL_DONE" | "LOW_STOCK" | "REFILL_REMINDER"> = {
        order_confirmed: "ORDER_CONFIRMED",
        payment_partial: "PAYMENT_PARTIAL",
        refill_done: "REFILL_DONE",
        low_stock: "LOW_STOCK",
        refill_reminder: "REFILL_REMINDER",
      };

      const channelMap: Record<string, "EMAIL" | "WHATSAPP" | "BOTH"> = {
        email: "EMAIL",
        whatsapp: "WHATSAPP",
        both: "BOTH",
      };

      // Create notification log
      const log = await prisma.notificationLog.create({
        data: {
          userId,
          channel: channelMap[channel] ?? "EMAIL",
          type: typeMap[type],
          status: "PENDING",
          payload: payload as any,
        },
      });

      const results: { email?: any; whatsapp?: any } = {};

      // Send via email
      if (channel === "email" || channel === "both") {
        const emailResult = await sendEmail(
          { email: user.email, name: user.fullName },
          type,
          payload
        );
        results.email = emailResult;
      }

      // Send via WhatsApp
      if (channel === "whatsapp" || channel === "both") {
        if (!user.mobile) {
          results.whatsapp = { success: false, error: "No mobile number on file" };
        } else {
          const waResult = await sendWhatsApp(user.mobile, type, payload);
          results.whatsapp = waResult;
        }
      }

      // Determine overall status
      const emailOk = results.email?.success !== false;
      const whatsappOk = results.whatsapp?.success !== false;
      const allOk = emailOk && whatsappOk;

      // Collect provider message IDs
      const messageIds = [
        results.email?.messageId,
        results.whatsapp?.messageId,
      ].filter(Boolean).join(", ");

      // Collect errors
      const errors = [
        results.email?.error,
        results.whatsapp?.error,
      ].filter(Boolean).join("; ");

      // Update notification log
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: allOk ? "SENT" : "FAILED",
          sentAt: allOk ? new Date() : undefined,
          messageId: messageIds || undefined,
          error: errors || undefined,
        },
      });

      return {
        success: allOk,
        notificationId: log.id,
        channel,
        type,
        results,
        message: allOk
          ? `Notification sent via ${channel}.`
          : `Notification partially failed: ${errors}`,
      };
    } catch (error) {
      return { success: false, error: "Failed to send notification", status: 500 };
    }
  },
});
