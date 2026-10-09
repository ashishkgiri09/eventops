"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api/auth";
import { ShieldCheck, ArrowRight, RotateCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "user@organization.com";
  const purpose = searchParams.get("purpose") || "onboarding";
  const initialCode = searchParams.get("code") || "";

  const [otp, setOtp] = useState(() => Array.from({ length: 6 }, (_, index) => initialCode[index] || ""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(59);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const code = otp.join("");
      if (purpose === "onboarding") throw new Error("This verification flow is not available on the live backend yet.");
      await authApi.verifyOtp(email, code);
      router.push(`/reset-password?email=${encodeURIComponent(email)}&token=EVT-OTP-${code}`);
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleResend = async () => {
    try {
      const result = await authApi.forgotPassword(email);
      if (result.debugCode) setOtp(result.debugCode.split(""));
      setTimer(59);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the reset code.");
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white font-mono">
          Security OTP Verification
        </h2>
        <p className="text-xs text-slate-400">
          Enter the 6-digit confirmation code dispatched to <span className="text-slate-200 font-semibold">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {resendSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>New verification code dispatched to your inbox.</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center gap-2">
          {otp.map((digit, i) => (
            <input
              id={`otp-${i}`}
              key={i}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              className="w-11 h-12 text-center text-lg font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Confirm & Proceed
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <span>Didn&apos;t receive code?</span>
        {timer > 0 ? (
          <span className="font-mono text-slate-500">Resend in {timer}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" /> Resend Code
          </button>
        )}
      </div>
    </div>
  );
}
