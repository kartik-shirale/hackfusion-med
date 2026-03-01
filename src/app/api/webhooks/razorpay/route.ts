import { NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

/**
 * Razorpay webhook handler
 * Handles: payment_link.paid → confirms order or creates refill order
 */
export const POST = async (req: Request) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    // Handle payment_link.paid event
    if (eventType === "payment_link.paid") {
      const paymentLink = event.payload?.payment_link?.entity;
      const payment = event.payload?.payment?.entity;

      if (!paymentLink || !payment) {
        return NextResponse.json({ error: "Missing payload" }, { status: 400 });
      }

      const source = paymentLink.notes?.source;
      const userId = paymentLink.notes?.userId;

      if (!userId) {
        return NextResponse.json({ status: "ignored", reason: "No userId in notes" });
      }

      // Route based on source
      if (source === "pharmacare_order") {
        return handleOrderPayment(paymentLink, payment, userId);
      } else if (source === "pharmacare_autorefill") {
        return handleRefillPayment(paymentLink, payment, userId);
      }

      return NextResponse.json({ status: "ignored", reason: "Unknown source" });
    }

    // Other events — acknowledge but ignore
    return NextResponse.json({ status: "ignored", event: eventType });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
};

/**
 * Handle payment for a regular order (placed via chat)
 */
const handleOrderPayment = async (
  paymentLink: any,
  payment: any,
  userId: string
) => {
  const orderId = paymentLink.notes?.orderId;
  if (!orderId) {
    return NextResponse.json({ status: "ignored", reason: "No orderId" });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: { medicine: true } },
      user: {
        select: {
          email: true,
          fullName: true,
          mobile: true,
          preference: { select: { notificationChannel: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotency
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ status: "already_processed", orderId: order.id });
  }

  // Update order to CONFIRMED + PAID
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentId: payment.id,
      warehouseRequestedAt: new Date(),
    },
  });

  // Auto-dispatch to warehouse: deduct stock (FEFO) and transition to PROCESSING
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

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PROCESSING",
      warehouseConfirmedAt: new Date(),
    },
  });

  // Send order_confirmed notification
  const channel = order.user.preference?.notificationChannel ?? "email";
  const itemNames = order.items.map((i) => i.medicine.name).join(", ");
  const notifPayload = {
    orderId: order.id,
    items: itemNames,
    total: order.totalAmount,
  };

  await prisma.notificationLog.create({
    data: {
      userId,
      channel: channel === "both" ? "BOTH" : channel === "whatsapp" ? "WHATSAPP" : "EMAIL",
      type: "ORDER_CONFIRMED",
      status: "SENT",
      sentAt: new Date(),
      payload: notifPayload as any,
    },
  });

  if (channel === "email" || channel === "both") {
    await sendEmail(
      { email: order.user.email, name: order.user.fullName },
      "order_confirmed",
      notifPayload
    );
  }
  if ((channel === "whatsapp" || channel === "both") && order.user.mobile) {
    await sendWhatsApp(order.user.mobile, "order_confirmed", notifPayload);
  }

  return NextResponse.json({ status: "success", orderId: order.id, orderStatus: "PROCESSING" });
};

/**
 * Handle payment for a refill (triggered by cron payment link)
 */
const handleRefillPayment = async (
  paymentLink: any,
  payment: any,
  userId: string
) => {
  const refillAlertId = paymentLink.notes?.refillAlertId;
  if (!refillAlertId) {
    return NextResponse.json({ status: "ignored", reason: "No refillAlertId" });
  }

  const refill = await prisma.refillAlert.findUnique({
    where: { id: refillAlertId },
    include: {
      user: {
        select: {
          email: true,
          fullName: true,
          mobile: true,
          preference: { select: { notificationChannel: true } },
        },
      },
    },
  });

  if (!refill) {
    return NextResponse.json({ error: "Refill alert not found" }, { status: 404 });
  }

  // Idempotency
  const existingOrder = await prisma.order.findFirst({
    where: { refillAlertId: refill.id, paymentId: payment.id },
  });
  if (existingOrder) {
    return NextResponse.json({ status: "already_processed", orderId: existingOrder.id });
  }

  // Get medicine batch for price
  const batch = await prisma.medicineBatch.findFirst({
    where: { medicineId: refill.medicineId, quantity: { gt: 0 } },
    orderBy: { unitPrice: "asc" },
  });
  const unitPrice = batch?.unitPrice ?? payment.amount / 100;

  // Create the refill order
  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount: payment.amount / 100,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentId: payment.id,
      razorpayOrderId: paymentLink.id,
      isAutoRefill: true,
      refillAlertId: refill.id,
      warehouseRequestedAt: new Date(),
      items: {
        create: { medicineId: refill.medicineId, quantity: 1, unitPrice },
      },
    },
  });

  // Reduce stock
  if (batch) {
    await prisma.medicineBatch.update({
      where: { id: batch.id },
      data: { quantity: { decrement: 1 } },
    });
  }

  // Update RefillAlert
  const nextDate = new Date(
    Date.now() + (refill.refillIntervalDays ?? 30) * 24 * 60 * 60 * 1000
  );
  await prisma.refillAlert.update({
    where: { id: refill.id },
    data: {
      nextRefillDate: nextDate,
      status: "ORDERED",
      creditsEarned: { increment: 5 },
      paymentLinkId: null,
      paymentLinkUrl: null,
      prepaidAmount: payment.amount / 100,
    },
  });

  // Send refill_done notification
  const channel = refill.user.preference?.notificationChannel ?? "email";
  const notifPayload = {
    medicineName: refill.medicineName,
    orderId: order.id,
    amount: payment.amount / 100,
  };

  await prisma.notificationLog.create({
    data: {
      userId,
      channel: channel === "both" ? "BOTH" : channel === "whatsapp" ? "WHATSAPP" : "EMAIL",
      type: "REFILL_DONE",
      status: "SENT",
      sentAt: new Date(),
      payload: notifPayload as any,
    },
  });

  if (channel === "email" || channel === "both") {
    await sendEmail(
      { email: refill.user.email, name: refill.user.fullName },
      "refill_done",
      notifPayload
    );
  }
  if ((channel === "whatsapp" || channel === "both") && refill.user.mobile) {
    await sendWhatsApp(refill.user.mobile, "refill_done", notifPayload);
  }

  return NextResponse.json({
    status: "success",
    orderId: order.id,
    nextRefillDate: nextDate.toISOString(),
  });
};
