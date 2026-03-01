"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSignInMethod } from "@/hooks/authentication";
import { Eye, EyeOff, Loader } from "lucide-react";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/global/google-oauth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { onAuthenticateUser, loading, register, errors } = useSignInMethod();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAuthenticateUser();
      }}
      className={cn(
        "w-full h-full flex items-center max-w-md mx-auto  p-2 py-10",
        className
      )}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-start gap-1 text-center">
          <h1 className="text-2xl font-medium">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to access your account
          </p>
        </div>

        {/* Email */}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            className="rounded-full"
            {...register("email")}
          />
          {errors.email && (
            <FieldDescription className="text-red-300 text-sm">
              {errors.email.message}
            </FieldDescription>
          )}
        </Field>

        {/* Password */}
        <Field>
          <div className="flex items-center ">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forget-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              {...register("password")}
              className="pr-10 rounded-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition rounded-full p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {errors.password && (
            <FieldDescription className="text-red-500 text-sm">
              {errors.password.message}
            </FieldDescription>
          )}
        </Field>

        {/* Submit */}
        <Field>
          <Button
            type="submit"
            disabled={loading}
            className="rounded-full text-[13px] font-medium text-white bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.1)] transition-all duration-200"
          >
            {loading ? <Loader strokeWidth={2} /> : "Login"}
          </Button>
          <FieldSeparator></FieldSeparator>
          <GoogleAuthButton method="signin" />
        </Field>

        {/* Separator */}

        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/sign-up" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
