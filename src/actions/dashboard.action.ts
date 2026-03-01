"use server";

import client from "@/lib/prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";

// WIP: Dashboard data fetcher
export const getDashboardData = async () => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const user = await currentUser();
    const fullName = user?.firstName || "there";

    const now = new Date();

    // --- KPI Stats ---
    const [totalOrders, cancelledOrders, totalSpentResult, activeRefills] =
      await Promise.all([
        client.order.count({ where: { userId } }),
        client.order.count({
          where: { userId, status: "CANCELLED" },
        }),
        client.order.aggregate({
          where: { userId, paymentStatus: "PAID" },
          _sum: { totalAmount: true },
        }),
        client.refillAlert.count({
          where: {
            userId,
            autoRefillEnabled: true,
            status: { in: ["PENDING", "NOTIFIED", "ACKNOWLEDGED"] },
          },
        }),
      ]);

    const moneySpent = totalSpentResult._sum.totalAmount || 0;

    // --- Orders & Refills chart (last 6 months) ---
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [ordersRaw, refillsRaw] = await Promise.all([
      client.order.findMany({
        where: { userId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      client.refillAlert.findMany({
        where: { userId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Build 6-month buckets
    const ordersRefillsChart: {
      month: string;
      orders: number;
      refills: number;
    }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      ordersRefillsChart.push({ month: key, orders: 0, refills: 0 });
    }

    for (const o of ordersRaw) {
      const key = `${monthNames[o.createdAt.getMonth()]} ${o.createdAt.getFullYear()}`;
      const bucket = ordersRefillsChart.find((b) => b.month === key);
      if (bucket) bucket.orders++;
    }
    for (const r of refillsRaw) {
      const key = `${monthNames[r.createdAt.getMonth()]} ${r.createdAt.getFullYear()}`;
      const bucket = ordersRefillsChart.find((b) => b.month === key);
      if (bucket) bucket.refills++;
    }

    // --- Weekly Invoice chart (last 7 days) ---
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekOrders = await client.order.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
        paymentStatus: { in: ["PAID", "PARTIAL"] },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyInvoice: { day: string; amount: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      weeklyInvoice.push({ day: dayNames[d.getDay()], amount: 0 });
    }

    for (const o of weekOrders) {
      const dayIdx = Math.floor(
        (o.createdAt.getTime() - sevenDaysAgo.getTime()) / 86400000
      );
      if (dayIdx >= 0 && dayIdx < 7) {
        weeklyInvoice[dayIdx].amount += o.totalAmount;
      }
    }

    // --- Recent Orders (last 5) ---
    const recentOrders = await client.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          include: {
            medicine: { select: { name: true, strength: true, brand: true } },
          },
        },
      },
    });

    const recentOrdersMapped = recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      isAutoRefill: o.isAutoRefill,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((item) => ({
        name: item.medicine.name,
        strength: item.medicine.strength,
        brand: item.medicine.brand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }));

    // --- Activity Timeline (last 15 events) ---
    const [timelineOrders, timelineRefills, timelineNotifs] = await Promise.all(
      [
        client.order.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            isAutoRefill: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        client.refillAlert.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            medicineName: true,
            status: true,
            autoRefillEnabled: true,
            createdAt: true,
          },
        }),
        client.notificationLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            status: true,
            channel: true,
            createdAt: true,
          },
        }),
      ]
    );

    type TimelineEvent = {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      color: string;
    };

    const timeline: TimelineEvent[] = [];

    for (const o of timelineOrders) {
      if (o.status === "CANCELLED") {
        timeline.push({
          id: `order-cancel-${o.id}`,
          type: "order_cancelled",
          title: "Order Cancelled",
          description: `Order #${o.id.slice(0, 8)} was cancelled`,
          timestamp: o.updatedAt.toISOString(),
          color: "destructive",
        });
      } else if (o.paymentStatus === "PAID") {
        timeline.push({
          id: `payment-${o.id}`,
          type: "payment_done",
          title: "Payment Completed",
          description: `₹${o.totalAmount.toFixed(2)} paid for order #${o.id.slice(0, 8)}`,
          timestamp: o.updatedAt.toISOString(),
          color: "emerald",
        });
      }

      timeline.push({
        id: `order-${o.id}`,
        type: "order_created",
        title: o.isAutoRefill ? "Auto-Refill Order" : "Order Created",
        description: `Order #${o.id.slice(0, 8)} — ₹${o.totalAmount.toFixed(2)}`,
        timestamp: o.createdAt.toISOString(),
        color: "indigo",
      });
    }

    for (const r of timelineRefills) {
      const statusLabel =
        r.status === "ORDERED"
          ? "Refill Completed"
          : r.status === "CANCELLED"
            ? "Refill Cancelled"
            : "Refill Created";
      timeline.push({
        id: `refill-${r.id}`,
        type:
          r.status === "ORDERED"
            ? "refill_done"
            : r.status === "CANCELLED"
              ? "refill_cancelled"
              : "refill_created",
        title: statusLabel,
        description: r.medicineName,
        timestamp: r.createdAt.toISOString(),
        color:
          r.status === "ORDERED"
            ? "emerald"
            : r.status === "CANCELLED"
              ? "destructive"
              : "amber",
      });
    }

    for (const n of timelineNotifs) {
      timeline.push({
        id: `notif-${n.id}`,
        type: "notification",
        title: n.type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
        description: `Sent via ${n.channel.toLowerCase()}`,
        timestamp: n.createdAt.toISOString(),
        color: "sky",
      });
    }

    // Sort by timestamp desc and take 15
    timeline.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const timelineSliced = timeline.slice(0, 15);

    return {
      success: true,
      data: {
        fullName,
        stats: {
          totalOrders,
          cancelledOrders,
          moneySpent,
          activeRefills,
        },
        ordersRefillsChart,
        weeklyInvoice,
        recentOrders: recentOrdersMapped,
        timeline: timelineSliced,
      },
    };
  } catch (error) {
    console.error("getDashboardData error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
