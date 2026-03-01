import { onSignInUser } from "@/actions/auth.action";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma/client";

const CompleteSigIn = async () => {
  const user = await currentUser();
  if (!user) return redirect("/sign-in");

  const authenticated = await onSignInUser(user.id);

  if (authenticated.status !== 200) {
    redirect("/sign-in");
  }

  // Redirect based on role
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = dbUser?.role || "USER";

  if (role === "ADMIN") {
    redirect("/admin");
  } else if (role === "DELIVERY") {
    redirect("/delivery");
  } else {
    redirect("/chat");
  }
};

export default CompleteSigIn;
