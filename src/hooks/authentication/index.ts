"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { OAuthStrategy } from "@clerk/types";

import { zodResolver } from "@hookform/resolvers/zod";
import { onSignUpUser, updateUserProfile } from "@/actions/auth.action";
import { SignUpSchema } from "@/components/forms/sign-up/schema";
import { SignInSchema } from "@/components/forms/sign-in/schema";
import { ResetPasswordSchema } from "@/components/forms/forget-pass/schema";
import { Role } from "../../../generated/prisma/enums";

export const useSignUpMethod = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const {
    formState: { errors },
    register,
    getValues,
    trigger,
  } = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    mode: "onChange",
  });

  const [currentStep, setCurrentStep] = useState<"signUp" | "verifyCode">(
    "signUp"
  );

  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);

  // OTP code state
  const [otpCode, setOtpCode] = useState<string>("");

  const handleSignUpSubmit = async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }) => {
    if (!isLoaded) return;

    setIsSubmittingSignUp(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: name.split(" ")[0],
        lastName: name.split(" ")[1] || "",
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      // Move to OTP verification step
      setCurrentStep("verifyCode");
    } catch (error) {
      console.error("Sign-up error:", JSON.stringify(error, null, 2));
    } finally {
      setIsSubmittingSignUp(false);
    }
  };

  // Step 2: Handle OTP code verification
  const handleOtpVerification = async (code: string) => {
    if (!isLoaded) return;

    setIsVerifyingCode(true);

    try {
      const verificationAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (verificationAttempt.status === "complete") {
        const {
          firstName,
          lastName,
          emailAddress,
          createdUserId,
          phoneNumber,
        } = verificationAttempt;
        console.log(verificationAttempt);

        if (!emailAddress || !firstName || !createdUserId) {
          console.error("Missing required user data after verification");
          return;
        }

        await onSignUpUser({
          fullName: `${firstName} ${lastName || ""}`.trim(),
          email: emailAddress,
          role: Role.USER,
          id: createdUserId,
          mobile: phoneNumber || "",
          profile: "",
        });

        console.log("step 2");

        await setActive({
          session: verificationAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log("Current task:", session.currentTask);
              return;
            }
            router.push("/");
          },
        });

        console.log("step 3");
      } else {
        console.error(
          "Verification incomplete:",
          JSON.stringify(verificationAttempt, null, 2)
        );
      }
    } catch (error) {
      console.error("OTP verification error:", JSON.stringify(error, null, 2));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const submitOtpCode = () => handleOtpVerification(otpCode);

  return {
    // Form management
    register,
    errors,
    getValues,
    trigger,

    // Step 1: Sign-up form
    handleSignUpSubmit,
    isSubmittingSignUp,

    // Step 2: OTP verification
    otpCode,
    setOtpCode,
    submitOtpCode,
    isVerifyingCode,

    // Current UI step
    currentStep,
  };
};
export const useSignInMethod = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const {
    formState: { errors },
    register,
    handleSubmit,
  } = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    mode: "onBlur",
  });

  const onClerkAuth = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    if (!isLoaded) {
      return;
    }

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }

            router.push("/");
          },
        });
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
    }
  };

  const onAuthenticateUser = handleSubmit(async (values) => {
    try {
      setLoading(true);
      await onClerkAuth(values);
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  });

  return {
    onAuthenticateUser,
    loading,
    register,
    errors,
  };
};
export const useForgotPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState<"email" | "verify">("email");

  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const {
    formState: { errors },
    register,
    handleSubmit,
    getValues,
    reset,
    setValue,
  } = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onBlur",
  });

  // Initialize reset password flow
  const initializeResetPasswordFlow = async (email: string) => {
    if (!signIn) {
      throw new Error("SignIn not loaded");
    }

    setIsInitializing(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setCurrentStep("verify"); // Move to verification step
      return true;
    } catch (err: any) {
      console.error("error", err.errors?.[0]?.longMessage || err.message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  // Reset password with code
  const resetPassword = async (code: string, password: string) => {
    if (!isLoaded || !signIn) {
      throw new Error("SignIn not loaded");
    }

    setIsVerifying(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      // Check if password reset is complete
      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
            router.push("/dashboard");
          },
        });
      } else {
        console.log(result);
      }

      return result;
    } catch (err: any) {
      console.error("error", err.errors?.[0]?.longMessage || err.message);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle form submission for email step
  const handleEmailSubmit = async (email: string) => {
    try {
      await initializeResetPasswordFlow(email);
      setCurrentStep("verify");
    } catch (error) {
      console.error("Failed to initialize reset password flow:", error);
    }
  };

  // Handle form submission for verification step
  const handleVerifySubmit = handleSubmit(async (data) => {
    try {
      await resetPassword(data.code, data.password);
    } catch (error) {
      console.error("Failed to verify code:", error);
    }
  });

  return {
    // Functions
    handleEmailSubmit,
    handleVerifySubmit,

    // Loading states
    isInitializing,
    isVerifying,

    // UI state
    currentStep,
    showPassword,
    setShowPassword,

    // Form helpers
    register,
    errors,
    reset,
    setValue,
    getValues,
  };
};

export const useGoogleAuth = () => {
  const { signIn, isLoaded: LoadedSignIn } = useSignIn();
  const { signUp, isLoaded: LoadedSignUp } = useSignUp();

  const signInWith = (strategy: OAuthStrategy) => {
    if (!LoadedSignIn) return;
    try {
      return signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/callback",
        redirectUrlComplete: "/callback/sign-in",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const signUpWith = (strategy: OAuthStrategy) => {
    if (!LoadedSignUp) return;
    try {
      return signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/callback",
        redirectUrlComplete: "/callback/complete",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return { signUpWith, signInWith };
};
