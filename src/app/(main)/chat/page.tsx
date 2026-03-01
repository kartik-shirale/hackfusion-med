import { redirect } from "next/navigation";

// Redirect base /chat to /chat/new
export default function ChatIndexPage() {
    redirect("/chat/new");
}
