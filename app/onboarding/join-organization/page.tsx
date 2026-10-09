"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { organizationsApi } from "@/lib/api/organizations";
import { useAppStore } from "@/store";
import { Building, ShieldCheck, Check, ArrowRight, AlertTriangle, XCircle, ArrowLeft, Clock } from "lucide-react";
import { Organization, UserRole } from "@/types";
import Link from "next/link";

export default function JoinOrganizationPage() {
  const router = useRouter();
  const { setCurrentOrganization, setCurrentRole, selectOrganizationWorkspace } = useAppStore();

  const [inviteCode, setInviteCode] = useState("");
  const [previewOrg, setPreviewOrg] = useState<Organization | null>(null);
  const [assignedRole, setAssignedRole] = useState<UserRole>("COORDINATOR");
  const [isLoading, setIsLoading] = useState(false);
  const [stateStatus, setStateStatus] = useState<"IDLE" | "SUCCESS" | "INVALID" | "EXPIRED">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const handleVerify = async (codeToTest?: string) => {
    const code = codeToTest || inviteCode;
    if (!code.trim()) {
      setStateStatus("INVALID");
      setErrorMessage("Please enter an invitation code.");
      return;
    }

    setIsLoading(true);
    setPreviewOrg(null);
    setErrorMessage("");

    try {
      const res = await organizationsApi.joinWithCode(code);
      if (res.isExpired) {
        setStateStatus("EXPIRED");
        setErrorMessage(res.message);
      } else if (res.isInvalid || !res.success) {
        setStateStatus("INVALID");
        setErrorMessage(res.message);
      } else {
        setStateStatus("SUCCESS");
        setPreviewOrg(res.organization);
        setAssignedRole(res.role || "COORDINATOR");
      }
    } catch (err: any) {
      setStateStatus("INVALID");
      setErrorMessage(err?.message || "Failed to verify invitation code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmJoin = () => {
    if (previewOrg) {
      setCurrentOrganization(previewOrg);
      setCurrentRole(assignedRole);
      selectOrganizationWorkspace(previewOrg.id);
      router.push("/workspace");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 md:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md space-y-6">
      <div className="space-y-2">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Onboarding
        </Link>
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
          <Building className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white font-mono">
          Join an Existing Organization
        </h2>
        <p className="text-xs text-slate-400">
          Enter the secure invitation code issued by your organization administrator.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            label="Invitation Code"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setStateStatus("IDLE");
            }}
            placeholder="e.g. ORG-XXXX-XXXX"
          />
        </div>

        <Button
          size="md"
          variant="primary"
          className="w-full"
          onClick={() => handleVerify()}
          isLoading={isLoading}
        >
          Verify Invitation Code
        </Button>

        {/* Invalid Code State */}
        {stateStatus === "INVALID" && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 space-y-2 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>Invalid Invitation Code</span>
            </div>
            <p className="text-rose-300/80 leading-relaxed">
              {errorMessage || "The code entered could not be found. Please verify capitalization or request an invite link."}
            </p>
          </div>
        )}

        {/* Expired Code State */}
        {stateStatus === "EXPIRED" && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 space-y-2 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Invitation Code Expired</span>
            </div>
            <p className="text-amber-300/80 leading-relaxed">
              {errorMessage || "This invitation has expired. Contact your organization administrator to re-issue an active code."}
            </p>
          </div>
        )}

        {/* Success State */}
        {stateStatus === "SUCCESS" && previewOrg && (
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">{previewOrg.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                Valid Invitation
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Location: {previewOrg.city}, {previewOrg.country} • {previewOrg.type}
            </p>
            <div className="text-[11px] font-mono text-emerald-300">
              Assigned Role: <span className="font-bold text-white">{assignedRole}</span>
            </div>
            <Button
              variant="success"
              size="md"
              className="w-full"
              onClick={handleConfirmJoin}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Accept Invitation & Enter Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
