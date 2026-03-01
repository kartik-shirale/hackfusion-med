import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const prescriptionHandler = tool({
  description:
    "Manage prescriptions. Use action='request' to show an upload button to the user. Use action='submit' to validate a prescription AFTER extracting data from an uploaded image using vision. The image is uploaded to cloud storage separately — pass imageUrl and fileKey if available.",
  inputSchema: z.object({
    userId: z.string().describe("The user ID"),
    action: z.enum(["request", "submit"]).default("submit").describe("Whether to request an upload or submit extracted data"),
    imageUrl: z.string().optional().describe("UploadThing URL of the prescription image (if uploaded)"),
    fileKey: z.string().optional().describe("UploadThing file key for the prescription image"),
    doctorName: z
      .string()
      .optional()
      .describe("Doctor name extracted from the prescription image (only needed for submit)"),
    issueDate: z
      .string()
      .optional()
      .describe("Issue date extracted from the prescription (ISO format) (only needed for submit)"),
    medicines: z
      .array(
        z.object({
          name: z.string().describe("Medicine name"),
          dosage: z.string().optional().describe("Dosage info"),
          qty: z.number().optional().describe("Quantity prescribed"),
        })
      )
      .describe("List of medicines requested or extracted"),
  }),
  execute: async ({ userId, action, imageUrl, fileKey, doctorName, issueDate, medicines }) => {
    try {
      if (action === "request") {
        return {
          status: "awaiting_upload",
          medicines,
          message:
            "Please upload your prescription to proceed. I will verify it automatically.",
        };
      }

      // Validate extracted data (submit action)
      const validationErrors: string[] = [];

      if (!doctorName) {
        validationErrors.push("Could not find doctor name on prescription");
      }

      if (issueDate) {
        const parsed = new Date(issueDate);
        const daysDiff = Math.floor(
          (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 10) {
          validationErrors.push(
            `Prescription is ${daysDiff} days old (max 10 days allowed)`
          );
        }
      } else {
        validationErrors.push("Could not find issue date on prescription");
      }

      if (!medicines || medicines.length === 0) {
        validationErrors.push("No medicines found on prescription");
      }

      // Create prescription record with UploadThing URL
      const prescription = await prisma.prescription.create({
        data: {
          userId,
          imageUrl: imageUrl ?? null,
          fileKey: fileKey ?? null,
          fileName: "prescription.jpg",
          mimeType: "image/jpeg",
          doctorName: doctorName ?? null,
          extractedData: { doctorName, issueDate, medicines } as any,
          validUntil: issueDate
            ? new Date(
                new Date(issueDate).getTime() + 10 * 24 * 60 * 60 * 1000
              )
            : null,
          status: validationErrors.length > 0 ? "REJECTED" : "VERIFIED",
        },
      });

      if (validationErrors.length > 0) {
        return {
          status: "invalid",
          prescriptionId: prescription.id,
          errors: validationErrors,
          medicines,
          message:
            "The prescription has validation issues. Please upload a valid prescription.",
        };
      }

      return {
        status: "verified",
        prescriptionId: prescription.id,
        doctorName,
        medicines,
        message:
          "Prescription verified successfully. I'll now search for the medicines.",
      };
    } catch (error) {
      return { error: "Failed to process prescription", status: 500 };
    }
  },
});
