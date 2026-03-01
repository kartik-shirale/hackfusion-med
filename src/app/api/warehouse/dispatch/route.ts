import { NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

/**
 * Warehouse dispatch API
 * Transitions orders through: CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 * Protected by WAREHOUSE_API_SECRET header
 */
export const POST = async (req: Request) => {
  try {
    // Verify warehouse secret
    const authHeader = req.headers.get("authorization");
    const warehouseSecret = process.env.WAREHOUSE_API_SECRET;
    if (warehouseSecret && authHeader !== `Bearer ${warehouseSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, action, trackingNumber, notes } = body as {
      orderId: string;
      action: "confirm" | "dispatch" | "deliver";
      trackingNumber?: string;
      notes?: string;
    };

    if (!orderId || !action) {
      return NextResponse.json(
        { error: "orderId and action are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { medicine: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    switch (action) {
      case "confirm": {
        // Warehouse confirms it can fulfill the order → PROCESSING
        if (order.status !== "CONFIRMED") {
          return NextResponse.json(
            { error: `Cannot confirm: order status is ${order.status}` },
            { status: 400 }
          );
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

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PROCESSING",
            warehouseConfirmedAt: new Date(),
            warehouseNotes: notes,
          },
        });

        return NextResponse.json({
          status: "success",
          orderId,
          orderStatus: "PROCESSING",
          message: "Warehouse confirmed. Stock deducted, order is being prepared.",
        });
      }

      case "dispatch": {
        // Warehouse dispatches the order → SHIPPED
        if (order.status !== "PROCESSING") {
          return NextResponse.json(
            { error: `Cannot dispatch: order status is ${order.status}` },
            { status: 400 }
          );
        }

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "SHIPPED",
            dispatchedAt: new Date(),
            trackingNumber: trackingNumber || null,
            warehouseNotes: notes || order.warehouseNotes,
          },
        });

        // Notify user that order is dispatched
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
          const itemNames = order.items.map((i) => i.medicine.name).join(", ");
          const channel = user.preference?.notificationChannel ?? "email";
          const notifPayload = {
            orderId: order.id,
            items: itemNames,
            trackingNumber: trackingNumber || "N/A",
            total: order.totalAmount,
          };

          await prisma.notificationLog.create({
            data: {
              userId: order.userId,
              channel: channel === "both" ? "BOTH" : channel === "whatsapp" ? "WHATSAPP" : "EMAIL",
              type: "ORDER_CONFIRMED",
              status: "SENT",
              sentAt: new Date(),
              payload: notifPayload as any,
            },
          });

          if (channel === "email" || channel === "both") {
            await sendEmail(
              { email: user.email, name: user.fullName },
              "order_dispatched",
              notifPayload
            );
          }
          if ((channel === "whatsapp" || channel === "both") && user.mobile) {
            await sendWhatsApp(user.mobile, "order_dispatched", notifPayload);
          }
        }

        return NextResponse.json({
          status: "success",
          orderId,
          orderStatus: "SHIPPED",
          trackingNumber,
          message: "Order dispatched. User notified.",
        });
      }

      case "deliver": {
        // Mark order as delivered
        if (order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: `Cannot deliver: order status is ${order.status}` },
            { status: 400 }
          );
        }

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            warehouseNotes: notes || order.warehouseNotes,
          },
        });

        return NextResponse.json({
          status: "success",
          orderId,
          orderStatus: "DELIVERED",
          message: "Order delivered.",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: confirm, dispatch, deliver" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Warehouse dispatch error:", error);
    return NextResponse.json(
      { error: "Warehouse dispatch failed" },
      { status: 500 }
    );
  }
};
