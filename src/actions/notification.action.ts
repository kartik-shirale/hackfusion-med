"use server";

import prisma from "@/lib/prisma/client";
import { auth } from "@clerk/nextjs/server";

/**
 * Get current notification preferences for the authenticated user
 */
export const getNotificationPreferences = async () => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        mobile: true,
        preference: {
          select: {
            notificationChannel: true,
          },
        },
      },
    });

    if (!user) return { error: "User not found", status: 404 };

    return {
      success: true,
      data: {
        email: user.email,
        mobile: user.mobile,
        channel: user.preference?.notificationChannel ?? "email",
      },
    };
  } catch (error) {
    return { error: "Failed to get preferences", status: 500 };
  }
};

/**
 * Update notification preferences (channel + mobile number)
 */
export const updateNotificationPreferences = async (data: {
  channel: "email" | "whatsapp" | "both";
  mobile?: string;
}) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    // If enabling WhatsApp, mobile number is required
    if ((data.channel === "whatsapp" || data.channel === "both") && !data.mobile?.trim()) {
      return { error: "Mobile number is required for WhatsApp notifications", status: 400 };
    }

    // Update mobile on User table
    if (data.mobile !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { mobile: data.mobile.trim() || null },
      });
    }

    // Upsert UserPreference with notification channel
    await prisma.userPreference.upsert({
      where: { userId },
      update: { notificationChannel: data.channel },
      create: {
        userId,
        notificationChannel: data.channel,
      },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to update preferences", status: 500 };
  }
};
