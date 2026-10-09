"use client";

import React, { useEffect, useState } from "react";
import { RoomMap, BenchMap } from "@/components/ui/RoomMap";
import { KPICard } from "@/components/ui/KPICard";
import { Button } from "@/components/ui/Button";
import { Venue } from "@/types";
import { venuesApi } from "@/lib/api/venues";
import { Building, Plus, Zap, Wifi, Layers, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";

export default function VenuesManagementPage() {
  const router = useRouter();
  const currentEvent = useAppStore((state) => state.currentEvent);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    if (!currentEvent?.id) return () => { active = false; };
    setLoadError("");
    venuesApi.getAll(currentEvent.id).then((items) => {
      if (!active) return;
      const safeItems = Array.isArray(items) ? items.map((venue) => ({ ...venue, benches: Array.isArray(venue.benches) ? venue.benches : [] })) : [];
      setVenues(safeItems);
      setSelectedVenue(safeItems[0] || null);
    }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load venues."); });
    return () => { active = false; };
  }, [currentEvent?.id]);

  const totalBenches = venues.reduce((acc, v) => acc + (v.benches?.length || 0), 0);
  const occupiedBenches = venues.reduce(
    (acc, v) => acc + (v.benches || []).filter((b) => b.status === "occupied").length,
    0
  );
  const availableBenches = venues.reduce(
    (acc, v) => acc + (v.benches || []).filter((b) => b.status === "available").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Venues & Bench Topology</h2>
          <p className="text-xs text-slate-400">
            Live venue and bench records for the selected event.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push("/venues/create")}
        >
          Add Venue Suite
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {loadError && <div role="alert" className="col-span-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{loadError}</div>}
        <KPICard title="Total Facilities" value={venues.length} subtitle="Live venue records" icon={<Building className="w-4 h-4 text-indigo-400" />} />
        <KPICard title="Total Benches" value={totalBenches} subtitle="Configured benches" accentColor="sky" icon={<Layers className="w-4 h-4 text-sky-400" />} />
        <KPICard title="Occupied Benches" value={occupiedBenches} subtitle="Teams Deployed" accentColor="emerald" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} />
        <KPICard title="Available Benches" value={availableBenches} subtitle="Not currently occupied" accentColor="amber" icon={<Zap className="w-4 h-4 text-amber-400" />} />
      </div>

      {/* Selected Room Detailed Bench Map View */}
      {selectedVenue && (
        <div>
          <BenchMap
            venue={selectedVenue}
            onBenchClick={(bench) => {
              if (bench.assignedTeamId) {
                router.push(`/teams/${bench.assignedTeamId}`);
              }
            }}
          />
        </div>
      )}

      {/* Complete Room Map Grid */}
      <div className="pt-2">
        <RoomMap
          venues={venues}
          selectedVenueId={selectedVenue?.id}
          onSelectVenue={(v) => setSelectedVenue(v)}
        />
      </div>
    </div>
  );
}
