"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

export const getUserProfile = async () => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preference: true,
        _count: {
          select: {
            orders: true,
            prescriptions: true,
            refillAlerts: true,
            chats: true,
            fileUploads: true,
          },
        },
        orders: {
          select: { totalAmount: true, status: true },
        },
      },
    });

    if (!user) return { error: "NOT_FOUND", status: 404 };

    const totalSpent = user.orders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );
    const deliveredOrders = user.orders.filter(
      (o) => o.status === "DELIVERED"
    ).length;

    return {
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        profile: user.profile,
        role: user.role,
        joinedAt: user.createdAt.toISOString(),
        stats: {
          totalOrders: user._count.orders,
          deliveredOrders,
          prescriptions: user._count.prescriptions,
          refillAlerts: user._count.refillAlerts,
          chats: user._count.chats,
          files: user._count.fileUploads,
          totalSpent,
        },
        preference: user.preference
          ? {
              pricePreference: user.preference.pricePreference,
              genericAllowed: user.preference.genericAllowed,
              preferredBrands: user.preference.preferredBrands,
              notificationChannel: user.preference.notificationChannel,
              autoRefillConsent: user.preference.autoRefillConsent,
              deliveryPreference: user.preference.deliveryPreference,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("getUserProfile error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};

export const updateUserProfile = async (data: {
  fullName?: string;
  mobile?: string;
}) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.mobile && { mobile: data.mobile }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
