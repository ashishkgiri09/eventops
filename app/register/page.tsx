"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { useAppStore } from "@/store";
import { ArrowRight, ShieldCheck, Mail, Building2, Info, Check, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setCurrentUser } = useAppStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  }>({});
  const [apiError, setApiError] = useState("");
  const [invitationCode, setInvitationCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInvitationCode(params.get("invite") || "");
    setEmail(params.get("email") || "");
  }, []);

  // Calculate password strength
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "None", color: "bg-slate-700" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-sky-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please provide a valid work or academic email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 10) {
      errors.password = "Password must be at least 10 characters.";
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = "Please confirm your password.";
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const res = await authApi.register({ name, email, password, invitationCode: invitationCode || undefined });

      setCurrentUser(res.user);
      const roleHomes: Record<string, string> = {
        JUDGE: "/judge", PARTICIPANT: "/participant", TECHNICAL_STAFF: "/technical-staff",
        RESOURCE_MANAGER: "/resource-manager", VOLUNTEER: "/volunteers",
      };
      router.push(roleHomes[res.user.role] || "/workspace");
    } catch (err: any) {
      setApiError(err?.message || "Registration failed. Please review input fields.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-mono font-bold text-xl shadow-lg shadow-indigo-500/30">
          EO
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
          {invitationCode ? "Activate your EVENTOPS account" : "Create EventOps Account"}
        </h2>
        <p className="text-xs text-slate-400">
          Universal event operations SaaS platform for colleges, enterprises, and communities.
        </p>
      </div>

      {apiError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{apiError}</span>
        </div>
      )}

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-white"><Building2 className="h-4 w-4 text-indigo-400" /> {invitationCode ? "Invited account" : "Organizer account"}</div>
        <p className="mt-1">{invitationCode ? "Create a password for the email address on your invitation. Use the shared sign-in page for future visits." : "Students and staff join with an invitation link. Their assigned role opens the correct workspace after sign-in."}</p>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <Input
            label="Full Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Dr. Maya Lin or Alex Sterling"
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <Input
            label="Corporate / University Email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="name@organization.com"
          />
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
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
          {/* Password Strength Meter */}
          {password && (
            <div className="space-y-1 mt-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Strength: <span className="font-bold text-white">{strength.label}</span></span>
                <span>{strength.score}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.score}%` }} />
              </div>
            </div>
          )}
          {fieldErrors.password && (
            <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <Input
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            required
            value={passwordConfirmation}
            onChange={(e) => {
              setPasswordConfirmation(e.target.value);
              setFieldErrors((prev) => ({ ...prev, passwordConfirmation: undefined }));
            }}
          />
          {fieldErrors.passwordConfirmation && (
            <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.passwordConfirmation}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create Account & Verify OTP
        </Button>
      </form>

      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Joining as Judge, Volunteer, or Staff?</span>
          <p className="mt-0.5 text-slate-400">
            Privileged roles cannot be self-selected at registration. Please use the official invitation code or link issued by your Event Director.
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Already registered with EventOps?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
          Sign In
        </Link>
      </div>
    </div>
  );
}
