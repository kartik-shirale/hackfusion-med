import { NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { createRefillPaymentLink } from "@/lib/razorpay";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

/**
 * Cron endpoint: find due refill alerts, create Razorpay payment links, send notifications
 * Also handles expired/failed payment links by resetting and pushing to next cycle
 * Protected by CRON_SECRET header
 */
export const GET = async (req: Request) => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 1: Clean up expired/failed payment links (older than 7 days)
    // Reset them and push nextRefillDate forward by one cycle
    const expiredRefills = await prisma.refillAlert.findMany({
      where: {
        autoRefillEnabled: true,
        paymentLinkId: { not: null },
        status: "PENDING",
      },
    });

    let resetCount = 0;
    for (const refill of expiredRefills) {
      // Check if payment link was created more than 7 days ago (expired)
      const linkAge = Date.now() - new Date(refill.createdAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (linkAge > sevenDaysMs && refill.paymentLinkId) {
        // Push nextRefillDate forward by one interval cycle
        const interval = refill.refillIntervalDays ?? 30;
        const newNextDate = new Date(
          Date.now() + interval * 24 * 60 * 60 * 1000
        );

        await prisma.refillAlert.update({
          where: { id: refill.id },
          data: {
            paymentLinkId: null,
            paymentLinkUrl: null,
            nextRefillDate: newNextDate,
            status: "PENDING",
          },
        });
        resetCount++;
      }
    }

    // Step 2: Find all due refill alerts (no existing payment link)
    const dueRefills = await prisma.refillAlert.findMany({
      where: {
        autoRefillEnabled: true,
        nextRefillDate: { lte: new Date() },
        status: { not: "ORDERED" },
        paymentLinkId: null, // Don't re-create links
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            mobile: true,
            preference: {
              select: { notificationChannel: true },
            },
          },
        },
      },
    });

    if (!dueRefills.length) {
      return NextResponse.json({ processed: 0, resetExpired: resetCount, message: "No refills due" });
    }

    const results = await Promise.all(
      dueRefills.map(async (refill) => {
        try {
          // Get current medicine price
          const batch = await prisma.medicineBatch.findFirst({
            where: {
              medicineId: refill.medicineId,
              quantity: { gt: 0 },
            },
            orderBy: { unitPrice: "asc" },
          });

          if (!batch) {
            return {
              refillId: refill.id,
              medicineName: refill.medicineName,
              success: false,
              reason: "Out of stock",
            };
          }

          // Create Razorpay payment link
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const paymentResult = await createRefillPaymentLink({
            amount: batch.unitPrice,
            description: `Auto-refill: ${refill.medicineName}`,
            refillAlertId: refill.id,
            userId: refill.userId,
            medicineName: refill.medicineName,
            customer: {
              name: refill.user.fullName,
              email: refill.user.email,
              contact: refill.user.mobile ?? undefined,
            },
            callbackUrl: `${baseUrl}/chat`,
          });

          if (!paymentResult.success) {
            return {
              refillId: refill.id,
              medicineName: refill.medicineName,
              success: false,
              reason: paymentResult.error,
            };
          }

          // Store payment link on RefillAlert
          await prisma.refillAlert.update({
            where: { id: refill.id },
            data: {
              paymentLinkId: paymentResult.paymentLinkId,
              paymentLinkUrl: paymentResult.shortUrl,
              status: "PENDING",
            },
          });

          // Send notification with payment link
          const channel = refill.user.preference?.notificationChannel ?? "email";
          console.log(`[Refill Cron] Sending refill_reminder for ${refill.medicineName} via ${channel} to ${refill.user.email}`);
          const notifPayload = {
            medicineName: refill.medicineName,
            amount: batch.unitPrice,
            paymentLink: paymentResult.shortUrl,
            daysLeft: 0,
          };

          // Create notification log
          const log = await prisma.notificationLog.create({
            data: {
              userId: refill.userId,
              channel: channel === "both" ? "BOTH" : channel === "whatsapp" ? "WHATSAPP" : "EMAIL",
              type: "REFILL_REMINDER",
              status: "PENDING",
              payload: notifPayload as any,
            },
          });

          // Send via preferred channels
          if (channel === "email" || channel === "both") {
            const emailResult = await sendEmail(
              { email: refill.user.email, name: refill.user.fullName },
              "refill_reminder",
              notifPayload
            );
            console.log("[Refill Cron] Email result:", emailResult);
          }
          if ((channel === "whatsapp" || channel === "both") && refill.user.mobile) {
            const waResult = await sendWhatsApp(refill.user.mobile, "refill_reminder", notifPayload);
            console.log("[Refill Cron] WhatsApp result:", waResult);
          }

          // Mark notification as sent
          await prisma.notificationLog.update({
            where: { id: log.id },
            data: { status: "SENT", sentAt: new Date() },
          });

          return {
            refillId: refill.id,
            medicineName: refill.medicineName,
            success: true,
            paymentLink: paymentResult.shortUrl,
          };
        } catch (error: any) {
          return {
            refillId: refill.id,
            medicineName: refill.medicineName,
            success: false,
            reason: error.message,
          };
        }
      })
    );

    return NextResponse.json({
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error("Cron refill error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
};
