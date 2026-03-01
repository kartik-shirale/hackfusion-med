import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const medicineSearch = tool({
  description:
    "Search for medicines by name, generic name, or symptoms. Also handles adding prescribed medicines directly. Use source='search' for user queries and source='prescription' for prescription-extracted lists. Can search for multiple distinct medicines at once using 'queries'.",
  inputSchema: z.object({
    queries: z.array(z.string()).optional().describe("List of search queries for medicines (e.g. ['paracetamol', 'metformin'])"),
    medicines: z
      .array(
        z.object({
          name: z.string(),
          dosage: z.string().optional(),
          qty: z.number().default(1),
        })
      )
      .optional()
      .describe("Pre-extracted medicine list from prescription"),
    userId: z.string().describe("The user ID"),
    source: z
      .enum(["search", "prescription"])
      .describe("Whether this is a search or prescription flow"),
  }),
  execute: async ({ queries, medicines, userId, source }) => {
    try {
      // Fetch user preference for price sorting
      const preference = await prisma.userPreference.findUnique({
        where: { userId },
      });

      if (source === "prescription" && medicines?.length) {
        // Prescription flow: look up each medicine by name
        const found = await Promise.all(
          medicines.map(async (med) => {
            const matches = await prisma.medicine.findMany({
              where: {
                OR: [
                  { name: { contains: med.name, mode: "insensitive" } },
                  { genericName: { contains: med.name, mode: "insensitive" } },
                ],
              },
              include: {
                batches: {
                  where: { quantity: { gt: 0 } },
                  orderBy: { expiryDate: "asc" },
                  take: 1,
                },
              },
            });

            const bestMatch = matches[0];
            if (!bestMatch) {
              return {
                requested: med.name,
                found: false,
                alternatives: [],
              };
            }

            const batch = bestMatch.batches[0];
            return {
              requested: med.name,
              found: true,
              medicine: {
                id: bestMatch.id,
                name: bestMatch.name,
                genericName: bestMatch.genericName,
                brand: bestMatch.brand,
                dosageForm: bestMatch.dosageForm,
                strength: bestMatch.strength,
                packSize: bestMatch.packSize,
                prescriptionRequired: bestMatch.prescriptionRequired,
                imageUrl: bestMatch.imageUrl,
                price: batch?.unitPrice ?? 0,
                inStock: (batch?.quantity ?? 0) > 0,
                stockQty: batch?.quantity ?? 0,
              },
              requestedQty: med.qty,
            };
          })
        );

        // Check stock and flag low inventory
        const lowStock = found.filter(
          (f) => f.found && f.medicine && f.medicine.stockQty < 10
        );

        return {
          source: "prescription",
          medicines: found,
          lowStockAlerts: lowStock.map((l) => l.medicine?.name),
          userPreference: preference?.pricePreference ?? "balanced",
        };
      }

      // Search flow
      if (!queries || queries.length === 0) {
        return { source: "search", medicines: [], error: "No queries provided" };
      }

      // Perform searches for all queries in parallel
      const allResultsPromises = queries.map(async (query) => {
        return prisma.medicine.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { genericName: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
            ],
          },
          include: {
            batches: {
              where: { quantity: { gt: 0 } },
              orderBy: { unitPrice: "asc" },
              take: 1,
            },
            alternatives: {
              include: { alternative: true },
              take: 3,
            },
          },
          take: 5, // Take top 5 for each query
        });
      });

      const resultsArrays = await Promise.all(allResultsPromises);
      
      // Flatten and deduplicate by medicine ID
      const uniqueResultsMap = new Map();
      for (const resultsGroup of resultsArrays) {
        for (const med of resultsGroup) {
          if (!uniqueResultsMap.has(med.id)) {
            uniqueResultsMap.set(med.id, med);
          }
        }
      }
      const aggregatedResults = Array.from(uniqueResultsMap.values());

      // Format results
      const sortedResults = aggregatedResults.map((med) => {
        const batch = med.batches[0];
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
          description: med.description,
          imageUrl: med.imageUrl,
          price: batch?.unitPrice ?? 0,
          inStock: (batch?.quantity ?? 0) > 0,
          stockQty: batch?.quantity ?? 0,
          alternatives: med.alternatives.map((alt: any) => ({
            id: alt.alternative.id,
            name: alt.alternative.name,
            reason: alt.reason,
          })),
        };
      });

      // Sort: cheaper first if preference is "cheaper", branded first otherwise
      if (preference?.pricePreference === "cheaper") {
        sortedResults.sort((a, b) => a.price - b.price);
      }

      return {
        source: "search",
        medicines: sortedResults,
        total: sortedResults.length,
        userPreference: preference?.pricePreference ?? "balanced",
      };
    } catch (error) {
      console.error("Medicine search error:", error);
      return { error: "Failed to search medicines", status: 500 };
    }
  },
});
