"use client";

import React, { useEffect, useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KPICard } from "@/components/ui/KPICard";
import { ProgressBar } from "@/components/ui/Feedback";
import { ResourceItem } from "@/types";
import { resourcesApi } from "@/lib/api/resources";
import { Box, Utensils, Cpu, Award, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResourcesOverviewPage() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    resourcesApi.getAll().then((items) => { if (active) setResources(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load resources."); });
    return () => { active = false; };
  }, []);

  const remainingUnits = resources.reduce((sum, item) => sum + Math.max(0, item.totalQuantity - item.consumedQuantity), 0);
  const consumedUnits = resources.reduce((sum, item) => sum + item.consumedQuantity, 0);
  const lowStockCount = resources.filter((item) => item.status === "LOW_STOCK" || item.status === "DEPLETED").length;

  const columns: Column<ResourceItem>[] = [
    {
      key: "name",
      header: "Resource Description",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{r.location}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
          {r.category}
        </span>
      ),
    },
    {
      key: "status",
      header: "Stock Health",
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "utilization",
      header: "Consumed / Total",
      render: (r) => {
        const remaining = r.totalQuantity - r.consumedQuantity;
        const pct = Math.round((r.consumedQuantity / r.totalQuantity) * 100);

        return (
          <div className="w-48 space-y-1 text-xs">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300">{r.consumedQuantity} {r.unit} used</span>
              <span className="text-emerald-400 font-bold">{remaining} left</span>
            </div>
            <ProgressBar value={pct} color={pct > 80 ? "amber" : "emerald"} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {loadError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{loadError}</div>}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Logistics, Food & Hardware Depots</h2>
          <p className="text-xs text-slate-400">
            Resource quantities and stock health loaded for the selected event.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/resources/food")}
            leftIcon={<Utensils className="w-3.5 h-3.5 text-amber-400" />}
          >
            Meal Passes
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => router.push("/resources/equipment")}
            leftIcon={<Cpu className="w-3.5 h-3.5" />}
          >
            Hardware Vault
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Tracked Items" value={resources.length} subtitle="Live inventory records" accentColor="emerald" icon={<Utensils className="w-4 h-4 text-emerald-400" />} />
        <KPICard title="Units Remaining" value={remainingUnits} subtitle="Across tracked items" accentColor="amber" icon={<Cpu className="w-4 h-4 text-amber-400" />} />
        <KPICard title="Units Consumed" value={consumedUnits} subtitle="Recorded usage" accentColor="sky" icon={<Box className="w-4 h-4 text-sky-400" />} />
        <KPICard title="Low Stock Items" value={lowStockCount} subtitle="Requires attention" accentColor="violet" />
      </div>

      <DataTable
        data={resources}
        columns={columns}
        keyExtractor={(r) => r.id}
        searchPlaceholder="Filter inventory by resource name or depot..."
      />
    </div>
  );
}
