"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { CheckCircle2, Lock, Eye, EyeOff, AlertCircle, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [resetToken, setResetToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resetToken.trim()) {
      setError("Reset authorization token is required.");
      return;
    }
    if (!email) {
      setError("The account email is missing. Start again from Forgot password.");
      return;
    }

    if (password.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(resetToken, password, email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Password reset token is invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white font-mono">
          Set New Password
        </h2>
        <p className="text-xs text-slate-400">
          Enter your verification reset token and configure new secure credentials.
        </p>
      </div>

      {isSuccess ? (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-3 text-center animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="font-semibold text-sm text-white">Credentials Updated Successfully</h4>
          <p className="text-xs text-emerald-300/80">
            Your password has been changed. Your previous sessions have been safely invalidated.
          </p>
          <Button
            size="md"
            variant="primary"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Go to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Password Reset Token"
            required
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            placeholder="e.g. EVT-RST-XXXX-XXXX"
            leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
          />

          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 10 characters"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>

          <Input
            label="Confirm New Password"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Update Password & Login
          </Button>
        </form>
      )}
    </div>
  );
}
