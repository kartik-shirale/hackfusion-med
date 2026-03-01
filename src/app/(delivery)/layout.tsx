import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check delivery role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "DELIVERY") {
    redirect("/chat");
  }

  return (
    <div className="h-dvh overflow-y-auto bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
      {/* Subtle gradient overlay for depth */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
      <div className="relative safe-top safe-bottom">{children}</div>
    </div>
  );
}
