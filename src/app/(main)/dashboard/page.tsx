import { getDashboardData } from "@/actions/dashboard.action";
import { Greeting } from "@/components/dashboard/greeting";
import { OrdersRefillsChart } from "@/components/dashboard/orders-refills-chart";
import { WeeklyInvoiceChart } from "@/components/dashboard/weekly-invoice-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const result = await getDashboardData();

  if ("error" in result) {
    if (result.status === 401) redirect("/sign-in");
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">
          Something went wrong. Please try again.
        </p>
      </div>
    );
  }

  const {
    fullName,
    stats,
    ordersRefillsChart,
    weeklyInvoice,
    recentOrders,
    timeline,
  } = result.data!;

  return (
    <div className="flex-1 p-3">
      <div className="h-full overflow-y-auto rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          {/* Greeting */}
          <Greeting fullName={fullName} />

          {/* Main grid: content left + timeline right */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Charts row */}

              {/* Stats cards */}
              <StatsCards stats={stats} />
              <div className="grid gap-6 md:grid-cols-2">
                <OrdersRefillsChart data={ordersRefillsChart} />
                <WeeklyInvoiceChart data={weeklyInvoice} />
              </div>
              {/* Recent orders */}
              <RecentOrders orders={recentOrders} />
            </div>

            {/* Right column — Timeline */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <ActivityTimeline events={timeline} />
              </div>
            </div>
          </div>

          {/* Mobile timeline (shown below on small screens) */}
          <div className="mt-6 lg:hidden">
            <ActivityTimeline events={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
