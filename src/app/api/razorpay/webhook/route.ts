import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { NextResponse } from "next/server";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

export const POST = async (req: Request) => {
  console.log("[Webhook] ✅ Request received at /api/razorpay/webhook");
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    console.log("[Webhook] Body length:", body.length, "| Signature present:", !!signature);

    if (!signature) {
      console.log("[Webhook] ❌ Missing signature — rejecting");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    console.log("[Webhook] RAZORPAY_WEBHOOK_SECRET defined:", !!secret, "| Length:", secret?.length ?? 0);

    if (!secret) {
      console.log("[Webhook] ❌ RAZORPAY_WEBHOOK_SECRET env var is missing!");
      return NextResponse.json(
        { error: "Server misconfigured — missing webhook secret" },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    console.log("[Webhook] Signature match:", signature === expectedSignature);
    if (signature !== expectedSignature) {
      console.log("[Webhook] ❌ Signature mismatch — rejecting");
      console.log("[Webhook]   received:", signature.slice(0, 20) + "...");
      console.log("[Webhook]   expected:", expectedSignature.slice(0, 20) + "...");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log("[Webhook] Event type:", event.event);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      console.log("[Webhook] payment.captured — Razorpay order ID:", razorpayOrderId, "| Payment ID:", payment.id);

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
        include: { items: { include: { medicine: true } } },
      });

      console.log("[Webhook] Order found:", !!order, order ? `(id: ${order.id}, status: ${order.status}, payment: ${order.paymentStatus})` : "");

      if (order) {
        // ── Idempotency guard ──
        if (order.paymentStatus === "PAID") {
          console.log(`[Webhook] ⏭️ Duplicate — order ${order.id} already PAID, skipping.`);
          return NextResponse.json({ success: true });
        }

        // Mark as PAID + CONFIRMED
        console.log(`[Webhook] 💰 Updating order ${order.id} → PAID + CONFIRMED`);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentId: payment.id,
            paymentStatus: "PAID",
            status: "CONFIRMED",
            warehouseRequestedAt: new Date(),
          },
        });

        // Warehouse processing: FEFO stock deduction
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
            console.log(`[Webhook] 📦 Stock deducted: ${item.quantity}x from batch ${batch.id}`);
          } else {
            console.log(`[Webhook] ⚠️ No stock batch found for medicine ${item.medicineId}`);
          }
        }

        // Transition to PROCESSING
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PROCESSING",
            warehouseConfirmedAt: new Date(),
          },
        });
        console.log(`[Webhook] ✅ Order ${order.id} → PROCESSING`);

        // Clear ordered items from cart
        await prisma.cartItem.deleteMany({
          where: {
            userId: order.userId,
            medicineId: { in: order.items.map((i) => i.medicineId) },
          },
        });
        console.log(`[Webhook] 🛒 Cart cleared for user ${order.userId}`);

        // Send notification
        try {
          const user = await prisma.user.findUnique({
            where: { id: order.userId },
            select: {
              email: true,
              fullName: true,
              mobile: true,
              preference: { select: { notificationChannel: true } },
            },
          });

          if (user) {
            const channel = user.preference?.notificationChannel ?? "email";
            const itemNames = order.items.map((i) => i.medicine.name).join(", ");
            const notifPayload = {
              orderId: order.id,
              items: itemNames,
              total: order.totalAmount.toString(),
            };

            console.log(`[Webhook] 📧 Sending ${channel} notification for order ${order.id}`);

            if (channel === "email" || channel === "both") {
              const emailResult = await sendEmail(
                { email: user.email, name: user.fullName },
                "order_confirmed",
                notifPayload
              );
              console.log("[Webhook] Email result:", emailResult);
            }

            if (channel === "whatsapp" || channel === "both") {
              if (user.mobile) {
                const waResult = await sendWhatsApp(
                  user.mobile,
                  "order_confirmed",
                  notifPayload
                );
                console.log("[Webhook] WhatsApp result:", waResult);
              } else {
                console.log("[Webhook] No mobile number — skipping WhatsApp");
              }
            }
          }
        } catch (notifError) {
          console.error("[Webhook] Notification error (non-fatal):", notifError);
        }
      } else {
        console.log("[Webhook] ❌ No order found with razorpayOrderId:", razorpayOrderId);
      }
    }

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      console.log("[Webhook] payment.failed — Razorpay order ID:", razorpayOrderId);

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
      });

      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
          },
        });
        console.log(`[Webhook] ❌ Order ${order.id} → FAILED + CANCELLED`);
      }
    }

    console.log("[Webhook] ✅ Response: 200 OK");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] 💥 Fatal error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
};
