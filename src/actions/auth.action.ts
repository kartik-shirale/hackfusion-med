"use server";
import client from "@/lib/prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "../../generated/prisma/enums";

// Create a new user in the database
export const onSignUpUser = async ({
  fullName,
  email,
  id,
  role,
  mobile,
  profile,
}: {
  fullName: string;
  email: string;
  id: string;
  role: Role;
  mobile: string | null;
  profile: string;
}) => {
  try {
    const user = await client.user.create({
      data: {
        fullName,
        email,
        id,
        role,
        mobile,
        profile,
      },
    });

    if (user) {
      return {
        success: true,
        message: "User created successfully",
        status: 200,
      };
    } else {
      return {
        success: false,
        message: "User creation failed",
        status: 400,
      };
    }
  } catch (error) {
    console.log(error);
  }
};

export async function updateUserProfile({
  fullName,
  bio,
}: {
  fullName: string;
  bio: string | "";
}) {
  try {
    // Validate input
    const clerk = await clerkClient();
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Missing userId");
    }
    const user = await client.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName,
      },
    });
    await clerk.users.updateUser(userId, {
      firstName: fullName.split(" ")[0] || undefined,
      lastName: fullName.split(" ")[1] || undefined,
    });
    return { success: true, data: user };
  } catch (error: any) {
    return {
      error: error.message || "Failed to update profile",
      details: error.name,
    };
  }
}

export const onSignInUser = async (id: string) => {
  try {
    const loggedInUser = await client.user.findUnique({
      where: {
        id,
      },
    });

    if (loggedInUser) {
      return {
        status: 200,
        message: "User successfully logged in",
        id: loggedInUser.id,
      };
    }

    return {
      status: 400,
      message: "User could not be logged in! Try again",
    };
  } catch (error) {
    return {
      status: 400,
      message: "Oops! something went wrong. Try again",
    };
  }
};
