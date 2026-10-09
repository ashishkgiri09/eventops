"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await authApi.forgotPassword(email.trim());
      setResetCode(response.debugCode || "");
      setIsSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a reset code. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
      <div className="space-y-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-white font-mono">
          Reset EventOps Credentials
        </h2>
        <p className="text-xs text-slate-400">
          Enter your account email to create a one-time password reset code.
        </p>
      </div>

      {isSubmitted ? (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Recovery Dispatched</span>
          </div>
          <p className="text-xs text-emerald-300/80">
            {resetCode ? `Local development reset code: ${resetCode}. It expires in 10 minutes; email delivery is not configured.` : `If an active account matches ${email || "this email"}, reset instructions will be sent.`}
          </p>
          <Button
            size="sm"
            variant="success"
            className="w-full"
            onClick={() => router.push(`/verify-otp?purpose=password_reset&email=${encodeURIComponent(email)}${resetCode ? `&code=${resetCode}` : ""}`)}
          >
            Enter Reset Code
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
          <Input
            label="Verified Account Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.sterling@eventops.io"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Send OTP Verification
          </Button>
        </form>
      )}
    </div>
  );
}
