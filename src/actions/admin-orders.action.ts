"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

type Filter = "today" | "week" | "month" | "all";
type OrderStatusFilter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

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

export const getAdminOrders = async ({
  page = 1,
  pageSize = 15,
  search = "",
  timeFilter = "all" as Filter,
  statusFilter = "ALL" as OrderStatusFilter,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  timeFilter?: Filter;
  statusFilter?: OrderStatusFilter;
}) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const dateFrom = getDateFrom(timeFilter);

    // Build where clause
    const where: any = {};

    if (dateFrom) {
      where.createdAt = { gte: dateFrom };
    }

    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        {
          items: {
            some: {
              medicine: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { medicine: { select: { name: true } } } },
          user: { select: { fullName: true, email: true, profile: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const formatted = orders.map((order) => ({
      id: order.id,
      customerName: order.user.fullName,
      customerEmail: order.user.email,
      customerAvatar: order.user.profile,
      items: order.items.map((i) => i.medicine.name).join(", "),
      itemCount: order.items.length,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      isAutoRefill: order.isAutoRefill,
      trackingNumber: order.trackingNumber,
      date: order.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        orders: formatted,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("getAdminOrders error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};

export const getAdminOrderDetail = async (orderId: string) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        user: true,
        prescription: true,
        refillAlert: true,
      },
    });

    if (!order) return { error: "NOT_FOUND", status: 404 };

    // Build timeline
    const timeline: { label: string; date: string | null; status: string }[] = [
      {
        label: "Order Placed",
        date: order.createdAt.toISOString(),
        status: "completed",
      },
    ];

    if (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIAL") {
      timeline.push({
        label: "Payment Confirmed",
        date: order.updatedAt.toISOString(),
        status: "completed",
      });
    } else if (order.paymentStatus === "FAILED") {
      timeline.push({
        label: "Payment Failed",
        date: order.updatedAt.toISOString(),
        status: "failed",
      });
    }

    if (order.warehouseRequestedAt) {
      timeline.push({
        label: "Sent to Warehouse",
        date: order.warehouseRequestedAt.toISOString(),
        status: "completed",
      });
    }

    if (order.warehouseConfirmedAt) {
      timeline.push({
        label: "Warehouse Confirmed",
        date: order.warehouseConfirmedAt.toISOString(),
        status: "completed",
      });
    }

    if (order.dispatchedAt) {
      timeline.push({
        label: "Dispatched",
        date: order.dispatchedAt.toISOString(),
        status: "completed",
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        label: "Delivered",
        date: order.deliveredAt.toISOString(),
        status: "completed",
      });
    }

    if (order.status === "CANCELLED") {
      timeline.push({
        label: "Cancelled",
        date: order.updatedAt.toISOString(),
        status: "failed",
      });
    }

    // Pending statuses
    const statusOrder = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
    ];
    const currentIdx = statusOrder.indexOf(order.status);
    if (order.status !== "CANCELLED") {
      if (!order.warehouseRequestedAt && currentIdx < 2) {
        timeline.push({
          label: "Awaiting Warehouse",
          date: null,
          status: "pending",
        });
      }
      if (!order.dispatchedAt && currentIdx < 3) {
        timeline.push({
          label: "Awaiting Dispatch",
          date: null,
          status: "pending",
        });
      }
      if (!order.deliveredAt && currentIdx < 4) {
        timeline.push({
          label: "Awaiting Delivery",
          date: null,
          status: "pending",
        });
      }
    }

    return {
      success: true,
      data: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paymentId: order.paymentId,
        razorpayOrderId: order.razorpayOrderId,
        isAutoRefill: order.isAutoRefill,
        trackingNumber: order.trackingNumber,
        warehouseNotes: order.warehouseNotes,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        customer: {
          id: order.user.id,
          fullName: order.user.fullName,
          email: order.user.email,
          mobile: order.user.mobile,
          profile: order.user.profile,
        },
        items: order.items.map((i: any) => ({
          id: i.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
          medicine: {
            id: i.medicine.id,
            name: i.medicine.name,
            genericName: i.medicine.genericName,
            brand: i.medicine.brand,
            category: i.medicine.category,
            prescriptionRequired: i.medicine.prescriptionRequired,
            imageUrl: i.medicine.imageUrl,
          },
        })),
        prescription: order.prescription
          ? {
              id: order.prescription.id,
              fileName: order.prescription.fileName,
              status: order.prescription.status,
              doctorName: order.prescription.doctorName,
              createdAt: order.prescription.createdAt.toISOString(),
            }
          : null,
        refillAlert: order.refillAlert
          ? {
              id: order.refillAlert.id,
              medicineName: order.refillAlert.medicineName,
              autoRefillEnabled: order.refillAlert.autoRefillEnabled,
              refillIntervalDays: order.refillAlert.refillIntervalDays,
              nextRefillDate: order.refillAlert.nextRefillDate?.toISOString() ?? null,
              status: order.refillAlert.status,
            }
          : null,
        timeline,
      },
    };
  } catch (error) {
    console.error("getAdminOrderDetail error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
