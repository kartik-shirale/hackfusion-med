import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const userPreference = tool({
  description:
    "Manage user preferences. Supports reading, writing, and auto-detecting preferences from conversation messages. Use 'detect' to passively extract preference signals from user messages.",
  inputSchema: z.object({
    action: z
      .enum(["get", "set", "detect"])
      .describe("Preference action to perform"),
    userId: z.string().describe("The user ID"),
    message: z
      .string()
      .optional()
      .describe("Raw user message for detect action"),
    key: z
      .string()
      .optional()
      .describe("Preference key for set action (e.g., pricePreference, notificationChannel)"),
    value: z
      .any()
      .optional()
      .describe("Preference value for set action"),
  }),
  execute: async ({ action, userId, message, key, value }) => {
    try {
      switch (action) {
        case "get": {
          const pref = await prisma.userPreference.findUnique({
            where: { userId },
          });

          if (!pref) {
            return {
              action: "get",
              preferences: null,
              message: "No preferences set yet.",
            };
          }

          return {
            action: "get",
            preferences: {
              pricePreference: pref.pricePreference,
              genericAllowed: pref.genericAllowed,
              preferredBrands: pref.preferredBrands,
              notificationChannel: pref.notificationChannel,
              autoRefillConsent: pref.autoRefillConsent,
              deliveryPreference: pref.deliveryPreference,
              rawNotes: pref.rawNotes,
            },
          };
        }

        case "set": {
          if (!key) {
            return { error: "No key provided for set action", status: 400 };
          }

          const allowedKeys = [
            "pricePreference",
            "genericAllowed",
            "preferredBrands",
            "notificationChannel",
            "autoRefillConsent",
            "deliveryPreference",
            "rawNotes",
          ];

          if (!allowedKeys.includes(key)) {
            return { error: `Invalid preference key: ${key}`, status: 400 };
          }

          await prisma.userPreference.upsert({
            where: { userId },
            update: { [key]: value },
            create: {
              userId,
              [key]: value,
            },
          });

          return {
            action: "set",
            key,
            value,
            message: "Preference updated successfully.",
          };
        }

        case "detect": {
          if (!message) {
            return { action: "detect", detected: false };
          }

          // Detect preferences from natural language
          const lowerMsg = message.toLowerCase();
          const detected: Record<string, unknown> = {};

          // Price preference detection
          if (
            lowerMsg.includes("cheaper") ||
            lowerMsg.includes("cheapest") ||
            lowerMsg.includes("affordable") ||
            lowerMsg.includes("budget")
          ) {
            detected.pricePreference = "cheaper";
          } else if (
            lowerMsg.includes("branded") ||
            lowerMsg.includes("brand") ||
            lowerMsg.includes("original")
          ) {
            detected.pricePreference = "branded";
          }

          // Generic preference
          if (lowerMsg.includes("generic") || lowerMsg.includes("generics")) {
            detected.genericAllowed = true;
          } else if (lowerMsg.includes("no generic") || lowerMsg.includes("not generic")) {
            detected.genericAllowed = false;
          }

          // Delivery preference
          if (lowerMsg.includes("express") || lowerMsg.includes("fast delivery") || lowerMsg.includes("urgent")) {
            detected.deliveryPreference = "express";
          }

          // Notification channel
          if (lowerMsg.includes("whatsapp")) {
            detected.notificationChannel = "whatsapp";
          } else if (lowerMsg.includes("email")) {
            detected.notificationChannel = "email";
          }

          if (Object.keys(detected).length > 0) {
            // Check for conflicts (branded vs cheaper)
            const existing = await prisma.userPreference.findUnique({
              where: { userId },
            });

            if (
              existing?.pricePreference &&
              detected.pricePreference &&
              existing.pricePreference !== detected.pricePreference
            ) {
              return {
                action: "detect",
                detected: true,
                conflict: true,
                existingPreference: existing.pricePreference,
                newPreference: detected.pricePreference,
                message: `You previously preferred ${existing.pricePreference} medicines, but now you seem to want ${detected.pricePreference}. Which would you prefer?`,
              };
            }

            await prisma.userPreference.upsert({
              where: { userId },
              update: { ...detected, rawNotes: message },
              create: { userId, ...detected, rawNotes: message },
            });

            return {
              action: "detect",
              detected: true,
              preferences: detected,
              message: "Preferences updated based on your message.",
            };
          }

          return { action: "detect", detected: false };
        }

        default:
          return { error: "Invalid action", status: 400 };
      }
    } catch (error) {
      return { error: "Preference operation failed", status: 500 };
    }
  },
});
