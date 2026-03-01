"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import { useSignUpMethod } from "@/hooks/authentication";
import Link from "next/link";
import { Eye, EyeOff, Loader, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { GoogleAuthButton } from "@/components/global/google-oauth";
import { Separator } from "@/components/ui/separator";

const OtpInput = dynamic(
  () => import("@/components/global/otp-input").then((m) => m.default),
  { ssr: true },
);

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const {
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
  } = useSignUpMethod();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitOtpCode();
      }}
      className={cn("w-full max-w-md mx-auto p-2 py-10 ", className)}
      {...props}
    >
      <FieldGroup>
        {/* Header: changes based on currentStep */}
        <div className="flex flex-col items-start gap-2 w-full text-left mb-8">
          <AnimatePresence mode="wait">
            {currentStep === "verifyCode" ? (
              <motion.div
                key="verify-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                <h1 className="text-2xl font-medium font-poppins">
                  Verify your email
                </h1>
                <p className="text-muted-foreground text-sm mt-2">
                  We've sent a verification code to your email. Please enter it
                  below to complete your registration.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="signup-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                <h1 className="text-2xl font-medium font-poppins">
                  Create your account
                </h1>
                <p className="text-muted-foreground text-sm mt-2">
                  Join a network of visionaries and unlock premium design
                  resources tailored for you.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {/* OTP Verification */}
          {currentStep === "verifyCode" ? (
            <motion.div
              key="verifyCode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="w-full mb-8">
                <OtpInput otp={otpCode} setOtp={setOtpCode} />
              </div>

              <Field>
                <Button
                  type="submit"
                  className="py-0 rounded-full text-[13px] font-medium text-white bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] transition-all duration-200"
                >
                  {isVerifyingCode ? (
                    <Loader className="animate-spin" />
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </Field>
            </motion.div>
          ) : (
            <motion.div
              key="signupForm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full flex flex-col gap-4"
            >
              {/* Full name */}
              <Field>
                <FieldLabel htmlFor="name" className="mb-1">
                  Full Name
                </FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Andrew Thomas"
                  required
                  className="w-full rounded-full py-3"
                  {...register("name")}
                />
                {errors.name && (
                  <FieldDescription className="text-red-500 text-sm">
                    {errors.name.message}
                  </FieldDescription>
                )}
              </Field>

              {/* Email */}
              <Field>
                <FieldLabel htmlFor="email" className="mb-1">
                  Email address
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="andrew@example.com"
                  required
                  className="w-full rounded-full py-3"
                  {...register("email")}
                />
                {errors.email && (
                  <FieldDescription className="text-red-500 text-sm">
                    {errors.email.message}
                  </FieldDescription>
                )}
              </Field>

              {/* Password + Confirm Password with InputGroup + show/hide */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="password" className="">
                    Password
                  </FieldLabel>
                  <InputGroup className="w-full rounded-full">
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full rounded-full py-3"
                      {...register("password")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword" className="">
                    Confirm password
                  </FieldLabel>
                  <InputGroup className="w-full rounded-full">
                    <InputGroupInput
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full  py-3"
                      {...register("confirmPassword")}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>

              {(errors.password || errors.confirmPassword) && (
                <FieldDescription className="text-red-500 text-sm -mt-4">
                  {errors.password?.message || errors.confirmPassword?.message}
                </FieldDescription>
              )}


              {/* Create account button */}
              <Field>
                <Button
                  type="button"
                  className="py-0 rounded-full text-[13px] font-medium text-white bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] transition-all duration-200 "
                  onClick={async () => {
                    const isValid = await trigger();
                    if (isValid) {
                      handleSignUpSubmit({
                        email: getValues("email"),
                        password: getValues("password"),
                        name: getValues("name"),
                      });
                    }
                  }}
                  disabled={isSubmittingSignUp}
                >
                  {isSubmittingSignUp ? (
                    <Loader className="animate-spin" />
                  ) : (
                    "Create account"
                  )}
                </Button>
                <Separator />
                <GoogleAuthButton method="signup" />
              </Field>
              {/* Bottom auth link */}
              <div className="text-center mt-4 text-sm">
                <p>
                  Already have an account?{" "}
                  <Link href="/sign-in" className="underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clerk CAPTCHA — must be outside AnimatePresence to be in DOM at init */}
        <div id="clerk-captcha" className="my-1" />
      </FieldGroup>
    </form>
  );
}
