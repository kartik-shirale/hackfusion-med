import { z } from "zod";

export const ResetPasswordSchema = z.object({
  email: z.email("You must give a valid email"),
  code: z.string().nonempty("Code is required"),
  password: z
    .string()
    .min(8, { message: " password must be at least 8 characters long" })
    .max(64, { message: " password cannot be longer than 64 characters" })
    .refine(
      (value) => /^[a-zA-Z0-9_.-]*$/.test(value ?? ""),
      "Password should contain only alphabets and numbers"
    ),
});
