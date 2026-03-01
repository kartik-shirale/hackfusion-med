import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/client";
import { NavSidebar } from "@/components/chat/nav-sidebar";
import { QueryProvider } from "@/providers/query-provider";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    // Check role — only USER can access main routes
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (!user) {
        redirect("/sign-in");
    }

    if (user.role === "ADMIN") {
        redirect("/admin");
    }

    if (user.role === "DELIVERY") {
        redirect("/delivery");
    }

    return (
        <QueryProvider>
            <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
                {/* Subtle gradient overlay for depth */}
                <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
                {/* Hide nav sidebar on mobile for clean chat experience */}
                <div className="hidden md:flex">
                    <NavSidebar />
                </div>
                <main className="relative flex flex-1 flex-col overflow-y-auto">{children}</main>
            </div>
        </QueryProvider>
    );
}
