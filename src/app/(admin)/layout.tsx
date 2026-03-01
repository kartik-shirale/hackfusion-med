import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    // Check admin role
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
        redirect("/chat");
    }

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
            {/* Subtle gradient overlay for depth */}
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
            <AdminSidebar />
            <main className="relative flex flex-1 min-h-0 flex-col overflow-y-auto p-3">
                <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
