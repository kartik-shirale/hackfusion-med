import { z } from "zod";

export const SignUpSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: "First name must be at least 3 characters" }),
    email: z.email("You must give a valid email"),

    password: z
      .string()
      .min(8, { message: " password must be at least 8 characters long" })
      .max(64, { message: " password cannot be longer than 64 characters" })
      .refine(
        (value) => /^[a-zA-Z0-9_.-]*$/.test(value ?? ""),
        "Password should contain only alphabets and numbers"
      ),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
    }
  });
