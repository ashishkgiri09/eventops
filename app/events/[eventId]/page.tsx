"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { eventsApi } from "@/lib/api/events";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Calendar,
  Users,
  Building,
  Scale,
  Settings,
  Layers,
  Clock,
  ShieldCheck,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
} from "lucide-react";
import Link from "next/link";
import { EventItem, EventStatus } from "@/types";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "PUBLISH" | "CLOSE_REG" | "START" | "COMPLETE" | "CANCEL";
    title: string;
    message: string;
    variant: "primary" | "danger" | "warning";
  }>({
    isOpen: false,
    action: "PUBLISH",
    title: "",
    message: "",
    variant: "primary",
  });

  useEffect(() => {
    let active = true;
    eventsApi.getById(eventId)
      .then((item) => {
        if (!active) return;
        if (item) setEvent(item);
        else setLoadError("This event could not be found in your account.");
      })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load this event."); });
    return () => { active = false; };
  }, [eventId]);

  if (loadError) return <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{loadError}</div>;
  if (!event) return <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">Loading event details…</div>;

  const promptStatusChange = (
    action: "PUBLISH" | "CLOSE_REG" | "START" | "COMPLETE" | "CANCEL",
    title: string,
    message: string,
    variant: "primary" | "danger" | "warning" = "primary"
  ) => {
    setConfirmModal({
      isOpen: true,
      action,
      title,
      message,
      variant,
    });
  };

  const executeStatusChange = async () => {
    setIsUpdating(true);
    let nextStatus: EventStatus = event.status;

    if (confirmModal.action === "PUBLISH") nextStatus = "PUBLISHED";
    else if (confirmModal.action === "CLOSE_REG") nextStatus = "REGISTRATION_CLOSED";
    else if (confirmModal.action === "START") nextStatus = "IN_PROGRESS";
    else if (confirmModal.action === "COMPLETE") nextStatus = "COMPLETED";
    else if (confirmModal.action === "CANCEL") nextStatus = "CANCELLED";

    const updated = await eventsApi.update(event.id, { status: nextStatus });
    setEvent(updated);
    setIsUpdating(false);
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const submodules = [
    { title: "Rounds & Timeline", desc: "Progression quotas & schedule", href: `/events/${event.id}/rounds`, icon: <Layers className="w-5 h-5 text-indigo-400" /> },
    { title: "Time Slots & Sessions", desc: "Capacity windows & pitch intervals", href: `/events/${event.id}/timeslots`, icon: <Clock className="w-5 h-5 text-sky-400" /> },
    { title: "Evaluation Criteria", desc: "Dynamic rubrics & scoring weights", href: `/events/${event.id}/criteria`, icon: <Trophy className="w-5 h-5 text-amber-400" /> },
    { title: "Event Rules & Safety", desc: "Eligibility & code of conduct", href: `/events/${event.id}/rules`, icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> },
    { title: "Event Settings", desc: "Metadata, banner & access flags", href: `/events/${event.id}/settings`, icon: <Settings className="w-5 h-5 text-slate-400" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Event Header Banner */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/events"
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <span className="font-mono text-xs text-indigo-400 font-bold uppercase">{event.id}</span>
              <StatusBadge status={event.status} />
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {event.type}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white mt-1">{event.name}</h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">{event.description}</p>
          </div>

          {/* Quick State-Changing Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {event.status === "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  promptStatusChange(
                    "PUBLISH",
                    "Publish Event",
                    "Are you sure you want to publish this event? Public enrollment and check-in desks will become active."
                  )
                }
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Publish Event
              </Button>
            )}

            {event.status === "PUBLISHED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      "CLOSE_REG",
                      "Close Registration",
                      "This will lock registrations and finalize participant rosters.",
                      "warning"
                    )
                  }
                >
                  Close Registration
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      "START",
                      "Start Live Event",
                      "Transition event to IN PROGRESS. Turnstile QR check-in desks will begin high-speed admission."
                    )
                  }
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Start Event
                </Button>
              </>
            )}

            {(event.status === "IN_PROGRESS" || event.status === "LIVE") && (
              <Button
                variant="success"
                size="sm"
                onClick={() =>
                  promptStatusChange(
                    "COMPLETE",
                    "Mark Event Completed",
                    "Are you sure you want to mark this event as COMPLETED? Final scores and advancement certificates will be locked."
                  )
                }
                leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                Complete Event
              </Button>
            )}

            {event.status !== "CANCELLED" && event.status !== "COMPLETED" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  promptStatusChange(
                    "CANCEL",
                    "Cancel Event Operations",
                    "WARNING: Cancelling this event will halt all judging, revoke ticket scans, and notify participants. This action is destructive.",
                    "danger"
                  )
                }
              >
                Cancel Event
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/allocation/optimization")}
            >
              Run Allocation
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/control-center")}
            >
              Live ECC
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 text-[11px]">Starts</span>
            <p className="font-mono font-medium text-slate-200">{new Date(event.startDate).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Ends</span>
            <p className="font-mono font-medium text-slate-200">{new Date(event.endDate).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Registration Deadline</span>
            <p className="font-mono font-medium text-slate-200">{new Date(event.registrationDeadline).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">Current Stage</span>
            <p className="font-mono font-bold text-indigo-400">Round {event.currentRound} of {event.totalRounds}</p>
          </div>
        </div>
      </div>

      {/* Submodule Jump Cards */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Event Configuration & Rules Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submodules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/80 hover:border-slate-700 transition flex items-start justify-between group cursor-pointer"
            >
              <div className="space-y-1">
                <div className="p-2.5 rounded-xl bg-slate-800 w-fit border border-slate-700/60 mb-2">
                  {mod.icon}
                </div>
                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white">
                  {mod.title}
                </h4>
                <p className="text-xs text-slate-400">{mod.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {confirmModal.message}
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.variant === "danger" ? "danger" : "primary"}
              size="sm"
              isLoading={isUpdating}
              onClick={executeStatusChange}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
