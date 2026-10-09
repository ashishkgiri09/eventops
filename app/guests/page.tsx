"use client";

import React, { useState, useEffect } from "react";
import { registrationsApi } from "@/lib/api/registrations";
import { Guest, RSVPStatus } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { KPICard } from "@/components/ui/KPICard";
import { QRCard } from "@/components/ui/QRCard";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  QrCode,
  Utensils,
  Share2,
  Calendar,
} from "lucide-react";

export default function GuestsManagementPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Add Guest Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    rsvpStatus: "CONFIRMED" as RSVPStatus,
    plusOnes: 0,
    dietaryNotes: "",
    tableOrSeat: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Modal
  const [selectedGuestForQR, setSelectedGuestForQR] = useState<Guest | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await registrationsApi.getGuests("evt-personal-01");
      setGuests(data);
      setLoading(false);
    }
    load();
  }, []);

  const totalInvited = guests.length + guests.reduce((acc, g) => acc + g.plusOnes, 0);
  const confirmedCount = guests
    .filter((g) => g.rsvpStatus === "CONFIRMED")
    .reduce((acc, g) => acc + 1 + g.plusOnes, 0);
  const tentativeCount = guests.filter((g) => g.rsvpStatus === "TENTATIVE").length;
  const declinedCount = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
  const checkedInCount = guests.filter((g) => g.checkedIn).length;

  // Filtered guests
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.tableOrSeat && g.tableOrSeat.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || g.rsvpStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateRsvp = async (guestId: string, newStatus: RSVPStatus) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, rsvpStatus: newStatus } : g))
    );
  };

  const handleToggleCheckIn = (guestId: string) => {
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId
          ? {
              ...g,
              checkedIn: !g.checkedIn,
              checkedInAt: !g.checkedIn ? new Date().toISOString() : undefined,
            }
          : g
      )
    );
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Guest name is required.");
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setFormError("Please provide an email or phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await registrationsApi.createGuest({
        eventId: "evt-personal-01",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        rsvpStatus: formData.rsvpStatus,
        plusOnes: Number(formData.plusOnes),
        dietaryNotes: formData.dietaryNotes || undefined,
        tableOrSeat: formData.tableOrSeat || undefined,
        invitationSent: true,
        checkedIn: false,
      });

      setGuests((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        rsvpStatus: "CONFIRMED",
        plusOnes: 0,
        dietaryNotes: "",
        tableOrSeat: "",
      });
      setFormError("");
    } catch {
      setFormError("Failed to add guest. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dietary preferences breakdown
  const dietaryCounts: Record<string, number> = {};
  guests.forEach((g) => {
    if (g.dietaryNotes && g.dietaryNotes !== "None") {
      dietaryCounts[g.dietaryNotes] = (dietaryCounts[g.dietaryNotes] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Guest List & RSVP Management
          </h1>
          <p className="text-sm text-slate-400">
            Track confirmations, +1 attendees, table seating, dietary requirements, and digital QR passes.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Guest
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <KPICard
          title="Total Expected"
          value={totalInvited}
          subtitle="Guests + Plus Ones"
          icon={<Users className="w-4 h-4 text-indigo-400" />}
        />
        <KPICard
          title="Confirmed RSVPs"
          value={confirmedCount}
          subtitle={`${Math.round((confirmedCount / (totalInvited || 1)) * 100)}% Confirmed`}
          accentColor="emerald"
          icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
        />
        <KPICard
          title="Tentative"
          value={tentativeCount}
          subtitle="Awaiting Confirmation"
          accentColor="amber"
          icon={<Clock className="w-4 h-4 text-amber-400" />}
        />
        <KPICard
          title="Declined"
          value={declinedCount}
          subtitle="Unable to Attend"
          accentColor="rose"
          icon={<XCircle className="w-4 h-4 text-rose-400" />}
        />
        <KPICard
          title="Checked In"
          value={checkedInCount}
          subtitle="Arrivals Logged"
          accentColor="sky"
          icon={<QrCode className="w-4 h-4 text-sky-400" />}
        />
      </div>

      {/* Dietary Requirements Summary Bar */}
      {Object.keys(dietaryCounts).length > 0 && (
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Utensils className="w-4 h-4 text-amber-400" />
            Catering Dietary Preferences:
          </div>
          {Object.entries(dietaryCounts).map(([diet, count]) => (
            <span
              key={diet}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20"
            >
              {diet}: {count} {count === 1 ? "meal" : "meals"}
            </span>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search guests by name, email, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> RSVP:
          </span>
          {["ALL", "CONFIRMED", "TENTATIVE", "DECLINED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                statusFilter === st
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading guest roster...
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
          <Users className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No guests match your criteria</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Guest</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">RSVP Status</th>
                <th className="py-3.5 px-4 font-semibold">Party / +1</th>
                <th className="py-3.5 px-4 font-semibold">Table / Seating</th>
                <th className="py-3.5 px-4 font-semibold">Dietary</th>
                <th className="py-3.5 px-4 font-semibold">Check-In</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100">{guest.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{guest.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-300">{guest.email}</div>
                    {guest.phone && (
                      <div className="text-[11px] text-slate-500 font-mono">{guest.phone}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          guest.rsvpStatus === "CONFIRMED"
                            ? "bg-emerald-500"
                            : guest.rsvpStatus === "TENTATIVE"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      <span
                        className={`font-mono text-xs font-semibold ${
                          guest.rsvpStatus === "CONFIRMED"
                            ? "text-emerald-400"
                            : guest.rsvpStatus === "TENTATIVE"
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {guest.rsvpStatus}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {guest.plusOnes > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                        +{guest.plusOnes} (Party of {1 + guest.plusOnes})
                      </span>
                    ) : (
                      <span className="text-slate-500">Party of 1</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {guest.tableOrSeat || <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {guest.dietaryNotes && guest.dietaryNotes !== "None" ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono text-[11px]">
                        {guest.dietaryNotes}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">Standard</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleCheckIn(guest.id)}
                      className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                        guest.checkedIn
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                      }`}
                    >
                      {guest.checkedIn ? "✓ Arrived" : "Not Checked In"}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedGuestForQR(guest)}
                        title="View QR Code Ticket"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      </Button>
                      <button
                        onClick={() => handleUpdateRsvp(guest.id, "CONFIRMED")}
                        className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"
                        title="Mark Confirmed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateRsvp(guest.id, "DECLINED")}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                        title="Mark Declined"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Guest Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Guest to RSVP Registry"
      >
        <form onSubmit={handleCreateGuest} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Full Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Jane Goodall"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Phone Number</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">RSVP Status</label>
              <Select
                value={formData.rsvpStatus}
                onChange={(e) =>
                  setFormData({ ...formData, rsvpStatus: e.target.value as RSVPStatus })
                }
                options={[
                  { value: "CONFIRMED", label: "Confirmed" },
                  { value: "TENTATIVE", label: "Tentative" },
                  { value: "DECLINED", label: "Declined" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Additional Guests (+1s)</label>
              <Input
                type="number"
                value={formData.plusOnes}
                onChange={(e) => setFormData({ ...formData, plusOnes: Number(e.target.value) })}
                min={0}
                max={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Table / Seating Assignment</label>
              <Input
                value={formData.tableOrSeat}
                onChange={(e) => setFormData({ ...formData, tableOrSeat: e.target.value })}
                placeholder="Table A - Seat 4"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Dietary Preferences</label>
              <Select
                value={formData.dietaryNotes}
                onChange={(e) => setFormData({ ...formData, dietaryNotes: e.target.value })}
                options={[
                  { value: "", label: "No Restrictions (Standard)" },
                  { value: "Vegetarian", label: "Vegetarian" },
                  { value: "Vegan", label: "Vegan" },
                  { value: "Gluten-Free", label: "Gluten-Free" },
                  { value: "Halal", label: "Halal" },
                  { value: "Kosher", label: "Kosher" },
                  { value: "Nut Allergy", label: "Nut Allergy" },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Guest
            </Button>
          </div>
        </form>
      </Modal>

      {/* View QR Code Modal */}
      {selectedGuestForQR && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedGuestForQR(null)}
          title="Digital Guest Pass & QR Ticket"
        >
          <div className="space-y-4 text-center">
            <QRCard
              tokenId={selectedGuestForQR.qrCodeToken || selectedGuestForQR.id}
              teamName={selectedGuestForQR.name}
              teamId={selectedGuestForQR.id}
              venueName="Main Reception Suite"
              benchLabel={selectedGuestForQR.tableOrSeat || `Party of ${1 + selectedGuestForQR.plusOnes}`}
            />
            <p className="text-xs text-slate-400 font-mono">
              Staff can scan this pass using the QR Check-in scanner to instantly register attendance.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setSelectedGuestForQR(null)}
            >
              Close Pass
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
