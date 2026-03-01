"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader } from "lucide-react";
import { useForgotPassword } from "@/hooks/authentication";
import OTPInput from "../../global/otp-input";

export default function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const {
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
  } = useForgotPassword();

  const [code, setCode] = useState<string>("");
  const [step, setStep] = useState<"email" | "verify">("email");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValue("code", code);
    handleVerifySubmit();
  };

  const handleInitializeReset = (e: React.FormEvent) => {
    e.preventDefault();
    const email = getValues("email");
    handleEmailSubmit(email);
    setStep("verify");
  };

  return (
    <form
      onSubmit={step === "email" ? handleInitializeReset : handleSubmit}
      className={cn(
        "w-full h-full flex items-center max-w-md mx-auto  p-2 py-10",
        className
      )}
      {...props}
    >
      <FieldGroup>
        {/* HEADER */}
        <div className="flex flex-col h-full text-left items- gap-1">
          <h1 className="text-2xl font-medium">
            {step === "email" ? "Forgot your password?" : "Verify your code"}
          </h1>
          <p className="text-sm text-muted-foreground text-balance">
            {step === "email"
              ? "Enter your email and set a new password."
              : "Enter the 6-digit code we sent to your email."}
          </p>
        </div>

        {/* STEP 1: EMAIL + PASSWORD */}
        {step === "email" && (
          <>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
                required
              />
            </Field>

            {/* New Password */}
            <Field>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...register("password")}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              disabled={isInitializing}
              className="py-0 rounded-ful text-[13px] font-medium text-white bg-gradient-to-b from-violet-600 to-violet-800 hover:from-violet-700 hover:to-violet-900 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.2)] transition-all duration-200 mt-4 "
            >
              {isInitializing ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                "Send Verification Code"
              )}
            </Button>

            <Field>
              <FieldDescription className="text-center">
                Remembered your password?{" "}
                <a href="/sign-in" className="underline underline-offset-4">
                  Sign in
                </a>
              </FieldDescription>
            </Field>
          </>
        )}

        {/* STEP 2: OTP ONLY */}
        {step === "verify" && (
          <>
            <Field>
              <FieldLabel>Verification Code</FieldLabel>
              <OTPInput otp={code} setOtp={setCode} />
              {errors.code && (
                <FieldDescription className="text-red-500 text-sm">
                  {errors.code.message}
                </FieldDescription>
              )}
            </Field>

            <Button
              type="submit"
              disabled={isVerifying}
              className="py-0 rounded-ful text-[13px] font-medium text-white bg-gradient-to-b from-violet-600 to-violet-800 hover:from-violet-700 hover:to-violet-900 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.2)] transition-all duration-200"
            >
              {isVerifying ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Reset"
              )}
            </Button>

            <FieldDescription className="text-center text-sm mt-3">
              Didn’t receive a code?{" "}
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  reset();
                }}
                className="underline underline-offset-4"
              >
                Try again
              </button>
            </FieldDescription>
          </>
        )}
      </FieldGroup>
    </form>
  );
}
