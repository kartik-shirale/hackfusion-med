"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

type RoleFilter = "ALL" | "USER" | "ADMIN";

export const getAdminCustomers = async ({
  page = 1,
  pageSize = 15,
  search = "",
  roleFilter = "ALL" as RoleFilter,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  roleFilter?: RoleFilter;
}) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleFilter !== "ALL") {
      where.role = roleFilter;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true,
              prescriptions: true,
              refillAlerts: true,
            },
          },
          orders: {
            select: { totalAmount: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((user) => {
      const totalSpent = user.orders.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );
      const completedOrders = user.orders.filter(
        (o) => o.status === "DELIVERED"
      ).length;

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        profile: user.profile,
        role: user.role,
        totalOrders: user._count.orders,
        completedOrders,
        prescriptions: user._count.prescriptions,
        refillAlerts: user._count.refillAlerts,
        totalSpent,
        joinedAt: user.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        customers: formatted,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("getAdminCustomers error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
