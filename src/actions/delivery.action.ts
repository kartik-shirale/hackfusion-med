"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";
import { sendEmail, sendWhatsApp } from "@/lib/notification-service";

// ─── Types ──────────────────────────────────────────────────────────

export type DeliveryOrder = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  warehouseConfirmedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  trackingNumber: string | null;
  deliveryUserId: string | null;
  user: {
    fullName: string;
    email: string;
    mobile: string | null;
  };
  items: {
    medicine: { name: string; strength: string; brand: string | null };
    quantity: number;
    unitPrice: number;
  }[];
};

// ─── Helpers ────────────────────────────────────────────────────────

const verifyDeliveryRole = async (): Promise<{ userId: string } | { error: string; status: number }> => {
  const { userId } = await auth();
  if (!userId) return { error: "UNAUTHORIZED", status: 401 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "DELIVERY") return { error: "FORBIDDEN", status: 403 };
  return { userId };
};

const notifyCustomer = async (
  userId: string,
  type: "order_dispatched" | "order_delivered",
  payload: Record<string, any>
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        mobile: true,
        preference: { select: { notificationChannel: true } },
      },
    });

    if (!user) return;

    const channel = user.preference?.notificationChannel ?? "email";
    console.log(`[Delivery] Sending ${type} via ${channel} to user ${userId}`);

    await prisma.notificationLog.create({
      data: {
        userId,
        channel:
          channel === "both"
            ? "BOTH"
            : channel === "whatsapp"
              ? "WHATSAPP"
              : "EMAIL",
        type: type === "order_dispatched" ? "ORDER_DISPATCHED" : "ORDER_DELIVERED",
        status: "SENT",
        sentAt: new Date(),
        payload: payload as any,
      },
    });

    if (channel === "email" || channel === "both") {
      const emailResult = await sendEmail(
        { email: user.email, name: user.fullName },
        type,
        payload
      );
      console.log("[Delivery] Email result:", emailResult);
    }
    if ((channel === "whatsapp" || channel === "both") && user.mobile) {
      const waResult = await sendWhatsApp(user.mobile, type, payload);
      console.log("[Delivery] WhatsApp result:", waResult);
    }
  } catch (error) {
    console.error(`[Delivery] Notification error (${type}):`, error);
  }
};

// ─── Actions ────────────────────────────────────────────────────────

/**
 * Get all orders available for pickup (PROCESSING, unassigned)
 * and orders assigned to the current delivery user (SHIPPED)
 */
export const getDeliveryOrders = async () => {
  try {
    const roleCheck = await verifyDeliveryRole();
    if ("error" in roleCheck) return roleCheck;
    const { userId: deliveryUserId } = roleCheck;

    const [available, myDeliveries] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: "PROCESSING",
          deliveryUserId: null,
        },
        include: {
          user: {
            select: { fullName: true, email: true, mobile: true },
          },
          items: {
            include: {
              medicine: {
                select: { name: true, strength: true, brand: true },
              },
            },
          },
        },
        orderBy: { warehouseConfirmedAt: "asc" },
      }),

      prisma.order.findMany({
        where: {
          deliveryUserId,
          status: { in: ["SHIPPED"] },
        },
        include: {
          user: {
            select: { fullName: true, email: true, mobile: true },
          },
          items: {
            include: {
              medicine: {
                select: { name: true, strength: true, brand: true },
              },
            },
          },
        },
        orderBy: { dispatchedAt: "desc" },
      }),
    ]);

    return {
      success: true as const,
      available: available as DeliveryOrder[],
      myDeliveries: myDeliveries as DeliveryOrder[],
    };
  } catch (error: any) {
    console.error("getDeliveryOrders error:", error);
    return { error: error?.message ?? "Failed to fetch delivery orders", status: 500 };
  }
};

/**
 * Take an order for delivery — PROCESSING → SHIPPED
 */
export const takeOrder = async (orderId: string) => {
  try {
    const roleCheck = await verifyDeliveryRole();
    if ("error" in roleCheck) return roleCheck;
    const { userId: deliveryUserId } = roleCheck;

    const order = await prisma.order.findFirst({
      where: { id: orderId, status: "PROCESSING", deliveryUserId: null },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
      },
    });

    if (!order) {
      return { error: "Order not found or already taken", status: 404 };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        deliveryUserId,
        dispatchedAt: new Date(),
      },
    });

    // Notify customer
    const itemNames = order.items.map((i) => i.medicine.name).join(", ");
    await notifyCustomer(order.userId, "order_dispatched", {
      orderId: order.id,
      items: itemNames,
      total: order.totalAmount,
    });

    return { success: true, orderId };
  } catch (error: any) {
    console.error("takeOrder error:", error);
    return { error: error?.message ?? "Failed to take order", status: 500 };
  }
};

/**
 * Mark an order as delivered — SHIPPED → DELIVERED
 */
export const markDelivered = async (orderId: string) => {
  try {
    const roleCheck = await verifyDeliveryRole();
    if ("error" in roleCheck) return roleCheck;
    const { userId: deliveryUserId } = roleCheck;

    const order = await prisma.order.findFirst({
      where: { id: orderId, status: "SHIPPED", deliveryUserId },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
      },
    });

    if (!order) {
      return { error: "Order not found or not assigned to you", status: 404 };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    // Notify customer
    const itemNames = order.items.map((i) => i.medicine.name).join(", ");
    await notifyCustomer(order.userId, "order_delivered", {
      orderId: order.id,
      items: itemNames,
      total: order.totalAmount,
    });

    return { success: true, orderId };
  } catch (error: any) {
    console.error("markDelivered error:", error);
    return { error: error?.message ?? "Failed to mark as delivered", status: 500 };
  }
};
