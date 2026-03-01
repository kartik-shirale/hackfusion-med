"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

type Filter = "today" | "week" | "month" | "all";

const getDateFrom = (filter: Filter): Date | undefined => {
  const now = new Date();
  switch (filter) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "all":
      return undefined;
  }
};

export const getAdminDashboardStats = async () => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const user = await currentUser();
    const fullName = user?.firstName || "Admin";

    const [
      totalProducts,
      completedOrders,
      cancelledOrders,
      activeRefills,
    ] = await Promise.all([
      prisma.medicine.count(),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.refillAlert.count({ where: { autoRefillEnabled: true } }),
    ]);

    // Revenue (all time)
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: "PAID" },
      select: { totalAmount: true },
    });

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalGST = totalRevenue * 0.18;

    return {
      success: true,
      data: {
        fullName,
        stats: { totalProducts, completedOrders, cancelledOrders, activeRefills },
        revenue: { total: totalRevenue, gst: totalGST },
      },
    };
  } catch (error) {
    console.error("getAdminDashboardStats error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};

export const getAdminChartData = async (filter: Filter = "week") => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const dateFrom = getDateFrom(filter);
    const dateFilter = dateFrom ? { gte: dateFrom } : undefined;

    const allOrders = await prisma.order.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by day with all statuses
    const chartMap = new Map<
      string,
      {
        date: string;
        pending: number;
        confirmed: number;
        processing: number;
        shipped: number;
        delivered: number;
        cancelled: number;
      }
    >();

    for (const order of allOrders) {
      const day = order.createdAt.toISOString().split("T")[0];
      if (!chartMap.has(day)) {
        chartMap.set(day, {
          date: day,
          pending: 0,
          confirmed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        });
      }
      const entry = chartMap.get(day)!;
      const status = order.status.toLowerCase() as keyof typeof entry;
      if (status in entry && status !== "date") {
        (entry[status] as number)++;
      }
    }

    return { success: true, data: Array.from(chartMap.values()) };
  } catch (error) {
    console.error("getAdminChartData error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};

export const getAdminRecentOrders = async (filter: Filter = "week") => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const dateFrom = getDateFrom(filter);
    const dateFilter = dateFrom ? { gte: dateFrom } : undefined;

    const recentOrders = await prisma.order.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      include: {
        items: { include: { medicine: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formatted = recentOrders.map((order) => ({
      id: order.id,
      customerName: order.user.fullName,
      customerEmail: order.user.email,
      items: order.items.map((i) => i.medicine.name).join(", "),
      itemCount: order.items.length,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      date: order.createdAt.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("getAdminRecentOrders error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
