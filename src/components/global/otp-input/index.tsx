import { InputOTP, InputOTPSlot } from "@/components/ui/input-otp";
import React from "react";

type Props = {
  otp: string;
  setOtp: React.Dispatch<React.SetStateAction<string>>;
};

const OTPInput = ({ otp, setOtp }: Props) => {
  return (
    <InputOTP maxLength={6} value={otp} onChange={(otp) => setOtp(otp)}>
      <div className="flex justify-between w-full  px-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <InputOTPSlot
              index={index}
              className="w-12 h-12 text-center text-2xl"
            />
          </div>
        ))}
      </div>
    </InputOTP>
  );
};

export default OTPInput;
