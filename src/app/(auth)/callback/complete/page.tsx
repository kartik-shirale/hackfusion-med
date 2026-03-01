import { onSignUpUser } from "@/actions/auth.action";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Role } from "../../../../../generated/prisma/enums";
import prisma from "@/lib/prisma/client";

const CompleteOAuthAfterCallback = async () => {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }
  console.log("mobile", user.primaryPhoneNumber, user.phoneNumbers);

  await onSignUpUser({
    fullName: user.fullName as string,
    email: user.emailAddresses[0].emailAddress,
    role: Role.USER,
    mobile: user.primaryPhoneNumber?.phoneNumber || "",
    profile: user.imageUrl || "",
    id: user.id,
  });

  // Get the user's role from DB to redirect correctly
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

export default CompleteOAuthAfterCallback;
