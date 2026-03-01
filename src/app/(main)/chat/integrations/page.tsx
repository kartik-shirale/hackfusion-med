import { redirect } from "next/navigation";
import { getNotificationPreferences } from "@/actions/notification.action";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
    const result = await getNotificationPreferences();

    if ("error" in result) {
        if (result.status === 401) redirect("/sign-in");
    }

    const data = result.success
        ? {
            email: result.data?.email ?? "",
            mobile: result.data?.mobile ?? "",
            channel: (result.data?.channel as "email" | "whatsapp" | "both") ?? "email",
        }
        : { email: "", mobile: "", channel: "email" as const };

    return <IntegrationsClient initialData={data} />;
}
