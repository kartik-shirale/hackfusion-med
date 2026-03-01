"use server";
import prisma from "@/lib/prisma/client";
import { auth } from "@clerk/nextjs/server";
import { utapi } from "@/lib/uploadthing";

export const getUserFiles = async () => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    const files = await prisma.fileUpload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileUrl: true,
        size: true,
        createdAt: true,
      },
    });

    const prescriptions = await prisma.prescription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        imageUrl: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      files: files.map((f) => ({
        id: f.id,
        name: f.fileName,
        mimeType: f.mimeType,
        size: f.size,
        url: f.fileUrl,
        type: "file" as const,
        createdAt: f.createdAt.toISOString(),
      })),
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        name: p.fileName,
        mimeType: p.mimeType,
        url: p.imageUrl,
        status: p.status,
        type: "prescription" as const,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { error: "Failed to fetch files", status: 500 };
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    const file = await prisma.fileUpload.findUnique({
      where: { id: fileId, userId },
      select: { fileKey: true },
    });

    if (!file) return { error: "Not found", status: 404 };

    // Delete from UploadThing cloud
    if (file.fileKey) {
      await utapi.deleteFiles(file.fileKey).catch(() => {});
    }

    // Delete from DB
    await prisma.fileUpload.delete({
      where: { id: fileId, userId },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete file", status: 500 };
  }
};

export const getFilePreview = async (fileId: string, type: "file" | "prescription") => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    if (type === "prescription") {
      const prescription = await prisma.prescription.findUnique({
        where: { id: fileId, userId },
        select: { imageUrl: true, mimeType: true },
      });
      if (!prescription?.imageUrl) return { error: "Not found", status: 404 };
      // Return UploadThing URL directly
      return { success: true, url: prescription.imageUrl };
    }

    const file = await prisma.fileUpload.findUnique({
      where: { id: fileId, userId },
      select: { fileUrl: true, mimeType: true },
    });
    if (!file?.fileUrl) return { error: "Not found", status: 404 };
    // Return UploadThing URL directly
    return { success: true, url: file.fileUrl };
  } catch (error) {
    return { error: "Failed to fetch preview", status: 500 };
  }
};
