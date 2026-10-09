"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { eventsApi } from "@/lib/api/events";
import { useAppStore } from "@/store";
import {
  Calendar,
  ArrowRight,
  ArrowLeft,
  Layers,
  Clock,
  ShieldCheck,
  Check,
  Users,
  Sparkles,
  Building,
  Scale,
  Cpu,
  Trophy,
  HeartHandshake,
  Box,
  AlertTriangle,
  Megaphone,
  BarChart3,
  DollarSign,
  Briefcase,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { EventType, EventModule, EventStatus } from "@/types";

const eventTypes: { value: EventType; label: string; category: string }[] = [
  { value: "Hackathon", label: "College / Open Hackathon", category: "Institutional" },
  { value: "College Fest", label: "College Fest / Tech Summit", category: "Institutional" },
  { value: "Technical Symposium", label: "Technical Symposium", category: "Institutional" },
  { value: "Competition", label: "Competitive Coding / Robotics", category: "Institutional" },
  { value: "Conference", label: "Corporate Tech Conference", category: "Corporate" },
  { value: "Corporate Event", label: "Enterprise Summit / Expo", category: "Corporate" },
  { value: "Workshop", label: "Hands-on Technical Workshop", category: "Corporate" },
  { value: "Career Fair", label: "Job & Career Expo", category: "Corporate" },
  { value: "Festival", label: "Personal Celebration / Social Gala", category: "Personal" },
  { value: "Meetup", label: "Community Meetup / Gathering", category: "Personal" },
  { value: "Custom Event", label: "Custom Configured Event", category: "Custom" },
];

const availableModules: { id: EventModule; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "TEAMS", label: "Teams & Projects", desc: "Team registrations, domains, repositories & project metadata", icon: <Users className="w-4 h-4 text-indigo-400" /> },
  { id: "GUESTS", label: "Guest List & RSVPs", desc: "Individual attendees, plus-ones, invitations & seating", icon: <Users className="w-4 h-4 text-emerald-400" /> },
  { id: "CHECK_IN", label: "QR Check-in & Badges", desc: "Turnstile scanner, digital passes, NFC & attendance registry", icon: <ShieldCheck className="w-4 h-4 text-teal-400" /> },
  { id: "VENUES", label: "Venues & Benches", desc: "Suites, room capacity, bench topology & power routing", icon: <Building className="w-4 h-4 text-sky-400" /> },
  { id: "SESSIONS", label: "Sessions & Agenda", desc: "Schedule timeline, keynotes, tracks & room conflict detection", icon: <Clock className="w-4 h-4 text-violet-400" /> },
  { id: "JUDGES", label: "Judges & Evaluations", desc: "Jury roster, dynamic rubrics, scoring criteria & conflict checks", icon: <Scale className="w-4 h-4 text-amber-400" /> },
  { id: "ALLOCATION", label: "Intelligent Allocation", desc: "Google OR-Tools CP-SAT constraint satisfaction engine", icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
  { id: "ROUNDS", label: "Rounds & Progression", desc: "Tournament progression, cutoffs, advancement quotas & rankings", icon: <Trophy className="w-4 h-4 text-amber-500" /> },
  { id: "STAFF", label: "Staff & Volunteers", desc: "Shift rosters, zone assignments & 4-stage operational kanban", icon: <HeartHandshake className="w-4 h-4 text-rose-400" /> },
  { id: "RESOURCES", label: "Resources & Food", desc: "Catering meal passes, dev hardware vaults & asset depletion", icon: <Box className="w-4 h-4 text-orange-400" /> },
  { id: "BUDGET", label: "Budget & Finance", desc: "Planned ceilings, committed spending, actuals & ledger", icon: <DollarSign className="w-4 h-4 text-emerald-500" /> },
  { id: "INCIDENTS", label: "Incidents Escalation", desc: "Field dispatch, priority triage, SLA resolution & audit trail", icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
  { id: "COMMUNICATION", label: "Multi-Channel Broadcast", desc: "In-app banners, email digests, SMS & WhatsApp integrations", icon: <Megaphone className="w-4 h-4 text-indigo-400" /> },
  { id: "ANALYTICS", label: "Analytics & Reports", desc: "Turnstile velocity, jury variance & downloadable CSV audit", icon: <BarChart3 className="w-4 h-4 text-blue-400" /> },
  { id: "AI_ASSISTANT", label: "AI Operational Copilot", desc: "Real-time natural language telemetry queries & recommendations", icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
];

const defaultModulesFor = (eventType: EventType): EventModule[] => {
  if (["Hackathon", "College Fest", "Technical Symposium", "Competition"].includes(eventType)) {
    return ["TEAMS", "CHECK_IN", "VENUES", "JUDGES", "ALLOCATION", "ROUNDS", "STAFF", "RESOURCES", "INCIDENTS", "ANALYTICS", "AI_ASSISTANT"];
  }
  if (["Conference", "Corporate Event", "Career Fair", "Workshop", "Training Program"].includes(eventType)) {
    return ["GUESTS", "CHECK_IN", "SESSIONS", "VENUES", "STAFF", "SPONSORS", "BUDGET", "COMMUNICATION", "ANALYTICS", "AI_ASSISTANT"];
  }
  if (["Festival", "Meetup", "Cultural Event", "Sports Event"].includes(eventType)) {
    return ["GUESTS", "CHECK_IN", "SESSIONS", "BUDGET", "STAFF", "COMMUNICATION", "ANALYTICS"];
  }
  return ["GUESTS", "CHECK_IN", "SESSIONS", "COMMUNICATION"];
};

export default function CreateEventWizardPage() {
  const router = useRouter();
  const { setCurrentEvent, currentOrganization, workspaceMode, workspaceCategory } = useAppStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");

  // Step 1: Basics
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>(workspaceCategory === "CORPORATE" ? "Conference" : workspaceCategory === "PERSONAL" ? "Festival" : "Hackathon");
  const [description, setDescription] = useState("");

  // Step 2: Dates
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");

  // Step 3: Audience & Attendance
  const [expectedParticipants, setExpectedParticipants] = useState("");
  const [audienceScope, setAudienceScope] = useState("");
  const [admissionType, setAdmissionType] = useState("");

  // Step 4: Modules & Capabilities
  const [selectedModules, setSelectedModules] = useState<EventModule[]>(() => defaultModulesFor(workspaceCategory === "CORPORATE" ? "Conference" : workspaceCategory === "PERSONAL" ? "Festival" : "Hackathon"));

  // Step 5: Optional Details
  const [totalRounds, setTotalRounds] = useState("1");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [scoringModel, setScoringModel] = useState("");
  const [venueFloorplan, setVenueFloorplan] = useState("");

  const visibleEventTypes = eventTypes.filter((option) => {
    if (option.category === "Custom") return true;
    if (workspaceCategory === "CORPORATE") return option.category === "Corporate";
    if (workspaceCategory === "PERSONAL") return option.category === "Personal";
    return option.category === "Institutional";
  });

  const toggleModule = (modId: EventModule) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const validateDates = (): boolean => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const deadline = new Date(registrationDeadline).getTime();

    if (!startDate || !endDate || !registrationDeadline || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(deadline)) {
      setDateError("Enter a start, end, and registration deadline.");
      return false;
    }
    if (end <= start) {
      setDateError("End date and time must follow the start date.");
      return false;
    }
    if (deadline > start) {
      setDateError("Registration deadline cannot be scheduled after event start date.");
      return false;
    }
    setDateError("");
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 2) {
      if (!validateDates()) return;
    }
    setCurrentStep((prev) => Math.min(6, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = async (status: EventStatus) => {
    if (!name.trim()) {
      setDateError("Enter an event name before continuing.");
      setCurrentStep(1);
      return;
    }
    if (workspaceMode !== "PERSONAL" && !currentOrganization?.id) {
      setDateError("Create or choose an organization before creating this event.");
      return;
    }
    if (!validateDates()) {
      setCurrentStep(2);
      return;
    }
    setIsLoading(true);

    try {
      const newEvent = await eventsApi.create({
        organizationId: workspaceMode === "PERSONAL" ? null : currentOrganization.id,
        isPersonalEvent: workspaceMode === "PERSONAL",
        name,
        type,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        status,
        expectedParticipants: parseInt(expectedParticipants, 10) || 0,
        modules: selectedModules,
      });

      setCurrentEvent(newEvent);
      router.push(`/events/${newEvent.id}`);
    } catch (error) {
      setDateError(error instanceof Error ? error.message : "Could not create the event.");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Basics" },
    { num: 2, title: "Dates" },
    { num: 3, title: "Audience" },
    { num: 4, title: "Capabilities" },
    { num: 5, title: "Module Setup" },
    { num: 6, title: "Review" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono">Event Setup Wizard</h2>
            <p className="text-xs text-slate-400">
              Configure universal operations tailored for institutional, corporate, or personal events.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Step <span className="text-indigo-400 font-bold">{currentStep}</span> of 6
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-6 gap-2">
        {steps.map((s) => (
          <div
            key={s.num}
            onClick={() => {
              if (s.num < currentStep) setCurrentStep(s.num);
            }}
            className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
              currentStep === s.num
                ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                : currentStep > s.num
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider">{s.num}. {s.title}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {currentStep === 1 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>1. Event Basics & Classification</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define the event title, category, and strategic mission. Organization type does not restrict event capabilities.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Event Name / Title"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Global Tech Summit 2026 or Kavya's Birthday Gala"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Event Type Preset"
                value={type}
                onChange={(e) => {
                  const nextType = e.target.value as EventType;
                  setType(nextType);
                  setSelectedModules(defaultModulesFor(nextType));
                }}
                options={visibleEventTypes.map((et) => ({
                  value: et.value,
                  label: `${et.label} (${et.category})`,
                }))}
              />

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Selecting <strong>{type}</strong> automatically primes recommended operational modules. You can customize all modules in Step 4.
                </span>
              </div>
            </div>

            <Textarea
              label="Event Description & Objectives"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe event format, tracks, and expected deliverables..."
            />
          </div>
        </div>
      )}

      {/* Step 2: Dates */}
      {currentStep === 2 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>2. Operational Timeline & Dates</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify schedule windows. The system strictly validates that end date follows start date.
            </p>
          </div>

          {dateError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateError("");
              }}
            />

            <Input
              label="End Date & Time"
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateError("");
              }}
            />

            <Input
              label="Registration Cutoff Deadline"
              type="datetime-local"
              required
              value={registrationDeadline}
              onChange={(e) => {
                setRegistrationDeadline(e.target.value);
                setDateError("");
              }}
            />

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center">
              <p>
                Turnstile ingress, QR ticket validation, and check-in desks will automatically lock when the end date expires.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Audience */}
      {currentStep === 3 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>3. Audience Scope & Expected Attendance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure sizing targets for floor capacity and catering forecasts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Expected Attendance (Participants / Guests)"
              type="number"
              required
              value={expectedParticipants}
              onChange={(e) => setExpectedParticipants(e.target.value)}
              placeholder="e.g. 350"
            />

            <Select
              label="Audience Scope"
              value={audienceScope}
              onChange={(e) => setAudienceScope(e.target.value)}
              options={[
                { value: "Public / Open Application", label: "Public / Open Registration" },
                { value: "University Affiliated Only", label: "University Affiliated Only" },
                { value: "Corporate Enterprise / Invite Only", label: "Enterprise / Invite Only" },
                { value: "Private Friends & Family", label: "Private Friends & Family" },
              ]}
            />

            <Select
              label="Admission Gating"
              value={admissionType}
              onChange={(e) => setAdmissionType(e.target.value)}
              options={[
                { value: "Approved Application Only", label: "Manual Review & Approval" },
                { value: "Instant Confirmation with QR", label: "Instant Ticket Generation" },
                { value: "RSVP Response Required", label: "RSVP Yes/No/Tentative" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Step 4: Modules & Capabilities */}
      {currentStep === 4 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>4. Operational Modules & Capabilities</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enable only the capabilities you need. Dashboards and navigation automatically adapt to enabled modules.
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedModules.length} Modules Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableModules.map((mod) => {
              const isSelected = selectedModules.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30"
                      : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {mod.icon}
                        <span className="text-xs font-bold text-white">{mod.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                          isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{mod.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Optional Details based on Enabled Modules */}
      {currentStep === 5 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>5. Module-Specific Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Parameters configured dynamically according to your enabled capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedModules.includes("ROUNDS") && (
              <Input
                label="Number of Competitive Rounds"
                type="number"
                value={totalRounds}
                onChange={(e) => setTotalRounds(e.target.value)}
              />
            )}

            {selectedModules.includes("BUDGET") && (
              <Input
                label="Target Budget Ceiling ($ USD)"
                type="number"
                value={budgetEstimate}
                onChange={(e) => setBudgetEstimate(e.target.value)}
              />
            )}

            {selectedModules.includes("JUDGES") && (
              <Select
                label="Evaluation Scoring Rubric Model"
                value={scoringModel}
                onChange={(e) => setScoringModel(e.target.value)}
                options={[
                  { value: "Weighted Multi-Criteria Rubric (0-100)", label: "Weighted Multi-Criteria Rubric (0-100)" },
                  { value: "Single Overall Score (1-10)", label: "Single Overall Score (1-10)" },
                  { value: "Thumbs Up / Thumbs Down Screening", label: "Thumbs Up / Thumbs Down Screening" },
                ]}
              />
            )}

            {selectedModules.includes("VENUES") && (
              <Input
                label="Primary Venue Suite / Facility Name"
                value={venueFloorplan}
                onChange={(e) => setVenueFloorplan(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* Step 6: Review & Finalize */}
      {currentStep === 6 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>6. Review & Save Event</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review summary parameters and publish immediately or save as a draft.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
              <span className="text-slate-400 font-mono text-[11px] uppercase">Core Event</span>
              <p className="text-base font-bold text-white">{name}</p>
              <p className="text-slate-400">{type} • {audienceScope}</p>
              <p className="text-slate-300 text-[11px] mt-1">{description}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
              <span className="text-slate-400 font-mono text-[11px] uppercase">Operational Dates</span>
              <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                <div>Starts: <span className="text-white font-bold">{new Date(startDate).toLocaleString()}</span></div>
                <div>Ends: <span className="text-white font-bold">{new Date(endDate).toLocaleString()}</span></div>
                <div>Reg Cutoff: <span className="text-amber-400">{new Date(registrationDeadline).toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase">
              Enabled Capabilities ({selectedModules.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedModules.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons: Save as Draft vs Publish */}
          <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white">Ready for Launch:</span> You can publish now to open registrations or save as draft to refine configurations.
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="md"
                isLoading={isLoading}
                onClick={() => handleFinalSubmit("DRAFT")}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isLoading}
                onClick={() => handleFinalSubmit("PUBLISHED")}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Publish Event Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Previous
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/events")}
          >
            Cancel
          </Button>
        )}

        {currentStep < 6 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNextStep}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to {steps[currentStep]?.title}
          </Button>
        )}
      </div>
    </div>
  );
}
