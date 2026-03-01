"use client";

import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/authentication";
import { Google } from "./google-icon";
import { Loader } from "../loader";

type GoogleAuthButtonProps = {
  method: "signup" | "signin";
};

export const GoogleAuthButton = ({ method }: GoogleAuthButtonProps) => {
  const { signUpWith, signInWith } = useGoogleAuth();
  return (
    <Button
      type="button"
      formNoValidate
      {...(method === "signin"
        ? {
          onClick: () => signInWith("oauth_google"),
        }
        : {
          onClick: () => signUpWith("oauth_google"),
        })}
      className="w-full  flex gap-3 bg-themeBlack border-themeGray"
      variant="outline"
    >
      <Loader loading={false}>
        <Google />
        Google
      </Loader>
    </Button>
  );
};
