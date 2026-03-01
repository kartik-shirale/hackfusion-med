import React from "react";

type Props = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left panel — gradient blobs + glassmorphism + text */}
      <div className="relative hidden overflow-hidden m-2 rounded-3xl lg:flex items-center justify-center bg-[#0f0f1a]">
        {/* Gradient blobs */}
        <div className="absolute -left-20 -top-20 size-[400px] rounded-full bg-gradient-to-br from-indigo-500/60 to-violet-600/40 blur-[100px]" />
        <div className="absolute -right-10 top-1/3 size-[350px] rounded-full bg-gradient-to-br from-purple-500/50 to-pink-500/30 blur-[100px]" />
        <div className="absolute -bottom-16 left-1/4 size-[300px] rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/20 blur-[100px]" />

        {/* Glass card with text */}

        <div className="h-full flex flex-col items-start justify-end p-6">
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            PharmaCare AI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Your intelligent healthcare companion. Manage prescriptions, track
            orders, and get AI-powered health insights — all in one place.
          </p>
        </div>

        {/* Decorative dots */}
        {/* <div className="mt-6 flex justify-center gap-1.5">
            <div className="size-1.5 rounded-full bg-white/30" />
            <div className="size-1.5 rounded-full bg-white/15" />
            <div className="size-1.5 rounded-full bg-white/15" />
          </div> */}
        {/* </div> */}
      </div>

      {/* Right panel — form */}
      <div className="relative flex flex-col gap-4 p-6 md:p-10 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
        {/* Radial gradient overlay — same as main app */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
        <div className="relative flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl h-full overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
