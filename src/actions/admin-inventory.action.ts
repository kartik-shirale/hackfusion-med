"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

type Filter = "all" | "prescription" | "otc" | "low_stock" | "expired";

export const getAdminInventory = async ({
  page = 1,
  pageSize = 15,
  search = "",
  filter = "all" as Filter,
  category = "ALL",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: Filter;
  category?: string;
}) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    switch (filter) {
      case "prescription":
        where.prescriptionRequired = true;
        break;
      case "otc":
        where.prescriptionRequired = false;
        break;
      case "low_stock":
        where.batches = {
          some: {
            quantity: { lte: prisma.medicineBatch.fields.reorderLevel },
          },
        };
        break;
      case "expired":
        where.batches = {
          some: {
            expiryDate: { lt: new Date() },
          },
        };
        break;
    }

    // For low_stock, use a raw approach since self-referencing fields in where is tricky
    // Let's simplify: fetch all, then filter client-side for low_stock
    let useLowStockFilter = filter === "low_stock";
    if (useLowStockFilter) {
      delete where.batches;
    }

    const [medicines, totalCount] = await Promise.all([
      prisma.medicine.findMany({
        where,
        include: {
          batches: {
            select: {
              id: true,
              batchNumber: true,
              quantity: true,
              unitPrice: true,
              expiryDate: true,
              reorderLevel: true,
            },
            orderBy: { expiryDate: "asc" },
          },
          _count: { select: { orderItems: true } },
        },
        orderBy: { name: "asc" },
        ...(!useLowStockFilter
          ? { skip: (page - 1) * pageSize, take: pageSize }
          : {}),
      }),
      useLowStockFilter
        ? prisma.medicine.count({ where })
        : prisma.medicine.count({ where }),
    ]);

    let formatted = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      const avgPrice =
        med.batches.length > 0
          ? med.batches.reduce((sum, b) => sum + b.unitPrice, 0) /
            med.batches.length
          : 0;
      const nearestExpiry = med.batches[0]?.expiryDate ?? null;
      const isLowStock = med.batches.some((b) => b.quantity <= b.reorderLevel);
      const isExpired = med.batches.some(
        (b) => b.expiryDate < new Date()
      );

      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        brand: med.brand,
        category: med.category,
        dosageForm: med.dosageForm,
        strength: med.strength,
        packSize: med.packSize,
        prescriptionRequired: med.prescriptionRequired,
        imageUrl: med.imageUrl,
        totalStock,
        avgPrice,
        batchCount: med.batches.length,
        nearestExpiry: nearestExpiry?.toISOString() ?? null,
        isLowStock,
        isExpired,
        totalOrders: med._count.orderItems,
      };
    });

    // Client-side low stock filter
    if (useLowStockFilter) {
      formatted = formatted.filter((m) => m.isLowStock);
    }

    const filteredTotal = useLowStockFilter ? formatted.length : totalCount;

    // Manual pagination for low_stock
    if (useLowStockFilter) {
      formatted = formatted.slice((page - 1) * pageSize, page * pageSize);
    }

    // Get unique categories for filter dropdown
    const categories = await prisma.medicine.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return {
      success: true,
      data: {
        medicines: formatted,
        totalCount: filteredTotal,
        totalPages: Math.ceil(filteredTotal / pageSize),
        currentPage: page,
        categories: categories.map((c) => c.category),
      },
    };
  } catch (error) {
    console.error("getAdminInventory error:", error);
    return { error: "INTERNAL_ERROR", status: 500 };
  }
};
