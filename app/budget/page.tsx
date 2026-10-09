"use client";

import React, { useState, useEffect } from "react";
import { resourcesApi } from "@/lib/api/resources";
import { BudgetEntry, BudgetCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { KPICard } from "@/components/ui/KPICard";
import {
  DollarSign,
  Plus,
  Download,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  PieChart,
  Layers,
} from "lucide-react";

export default function BudgetManagementPage() {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "VENUE" as BudgetCategory,
    plannedAmount: 1000,
    actualAmount: 0,
    status: "PLANNED" as "PLANNED" | "COMMITTED" | "PAID",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await resourcesApi.getBudgetSummary();
      setEntries(res.entries);
      setLoading(false);
    }
    load();
  }, []);

  const plannedTotal = entries.reduce((acc, e) => acc + e.plannedAmount, 0);
  const actualTotal = entries.reduce((acc, e) => acc + e.actualAmount, 0);
  const remainingBalance = plannedTotal - actualTotal;
  const burnRate = Math.round((actualTotal / (plannedTotal || 1)) * 100);

  const filteredEntries = entries.filter((e) => {
    const matchesCat = categoryFilter === "ALL" || e.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesCat && matchesStatus;
  });

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    if (formData.plannedAmount <= 0) {
      setFormError("Planned amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await resourcesApi.addBudgetEntry({
        ...formData,
        plannedAmount: Number(formData.plannedAmount),
        actualAmount: Number(formData.actualAmount),
      });
      setEntries((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        category: "VENUE",
        plannedAmount: 1000,
        actualAmount: 0,
        status: "PLANNED",
      });
      setFormError("");
    } catch {
      setFormError("Failed to add budget item. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,Category,Name,Planned Amount ($),Actual Amount ($),Variance ($),Status,Paid Date\n";
    const rows = entries
      .map((e) =>
        `"${e.id}","${e.category}","${e.name.replace(/"/g, '""')}",${e.plannedAmount},${
          e.actualAmount
        },${e.plannedAmount - e.actualAmount},"${e.status}","${e.paidDate || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `EVENTOPS_Budget_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group by categories
  const categories: BudgetCategory[] = ["VENUE", "CATERING", "EQUIPMENT", "PRIZES", "STAFF", "MARKETING", "MISC"];
  const categoryStats = categories.map((cat) => {
    const catEntries = entries.filter((e) => e.category === cat);
    const planned = catEntries.reduce((acc, e) => acc + e.plannedAmount, 0);
    const actual = catEntries.reduce((acc, e) => acc + e.actualAmount, 0);
    return { category: cat, planned, actual, count: catEntries.length };
  }).filter((c) => c.count > 0 || c.planned > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-400" />
            Budget & Financial Ledger
          </h1>
          <p className="text-sm text-slate-400">
            Real-time expenditure tracking, allocation variance, and fiscal reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export Ledger (CSV)
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Expense / Budget Item
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard
          title="Total Planned Budget"
          value={`$${plannedTotal.toLocaleString()}`}
          subtitle="Allocated Across Categories"
          icon={<DollarSign className="w-4 h-4 text-indigo-400" />}
        />
        <KPICard
          title="Actual Spend Incurred"
          value={`$${actualTotal.toLocaleString()}`}
          subtitle={`${burnRate}% Burn Rate`}
          accentColor="amber"
          icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
        />
        <KPICard
          title="Remaining Balance"
          value={`$${remainingBalance.toLocaleString()}`}
          subtitle={remainingBalance >= 0 ? "Under Fiscal Ceiling" : "Over Budget"}
          accentColor={remainingBalance >= 0 ? "emerald" : "rose"}
          icon={<TrendingDown className="w-4 h-4 text-emerald-400" />}
        />
        <KPICard
          title="Ledger Entries"
          value={entries.length}
          subtitle={`${entries.filter((e) => e.status === "PAID").length} Invoices Settled`}
          accentColor="sky"
          icon={<Layers className="w-4 h-4 text-sky-400" />}
        />
      </div>

      {/* Category Breakdown Progress Grid */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-400" />
          Category Allocation & Burn Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.map((cat) => {
            const pct = cat.planned > 0 ? Math.round((cat.actual / cat.planned) * 100) : 0;
            const isOver = cat.actual > cat.planned;

            return (
              <div
                key={cat.category}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-semibold text-slate-200">{cat.category}</span>
                  <span className={isOver ? "text-rose-400 font-bold" : "text-slate-400"}>
                    {pct}% Spent
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isOver ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>Planned: ${cat.planned.toLocaleString()}</span>
                  <span className={isOver ? "text-rose-400" : "text-emerald-400"}>
                    Actual: ${cat.actual.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {["ALL", "VENUE", "CATERING", "EQUIPMENT", "PRIZES", "STAFF", "MARKETING"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                categoryFilter === cat
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          {["ALL", "PAID", "COMMITTED", "PLANNED"].map((st) => (
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

      {/* Ledger Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading budget ledger...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
          <DollarSign className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No ledger entries found</h3>
          <p className="text-xs text-slate-500">Try selecting a different filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Expense Item</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold text-right">Planned</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actual Spend</th>
                <th className="py-3.5 px-4 font-semibold text-right">Variance</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Settled Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
              {filteredEntries.map((entry) => {
                const variance = entry.plannedAmount - entry.actualAmount;
                const isUnder = variance >= 0;

                return (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-100">
                      {entry.name}
                      <div className="font-mono text-[10px] text-slate-500">{entry.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60">
                        {entry.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-semibold">
                      ${entry.plannedAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-100 font-semibold">
                      ${entry.actualAmount.toLocaleString()}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-semibold ${
                        isUnder ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isUnder ? `+$${variance.toLocaleString()}` : `-$${Math.abs(variance).toLocaleString()}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          entry.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : entry.status === "COMMITTED"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {entry.status === "PAID" && <CheckCircle className="w-3 h-3" />}
                        {entry.status === "COMMITTED" && <Clock className="w-3 h-3" />}
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {entry.paidDate || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Expense / Budget Allocation"
      >
        <form onSubmit={handleCreateEntry} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Item / Expense Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Stage Sound & Video Engineering"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Budget Category</label>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as BudgetCategory })
                }
                options={[
                  { value: "VENUE", label: "Venue & Facilities" },
                  { value: "CATERING", label: "Catering & Meals" },
                  { value: "EQUIPMENT", label: "Technical Equipment" },
                  { value: "PRIZES", label: "Prizes & Grants" },
                  { value: "STAFF", label: "Staff & Operations" },
                  { value: "MARKETING", label: "Marketing & Swag" },
                  { value: "MISC", label: "Miscellaneous" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Status</label>
              <Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "PLANNED" | "COMMITTED" | "PAID",
                  })
                }
                options={[
                  { value: "PLANNED", label: "Planned (Draft)" },
                  { value: "COMMITTED", label: "Committed (Contracted)" },
                  { value: "PAID", label: "Paid (Settled)" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Planned Amount ($) *</label>
              <Input
                type="number"
                value={formData.plannedAmount}
                onChange={(e) => setFormData({ ...formData, plannedAmount: Number(e.target.value) })}
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Actual Incurred Spend ($)</label>
              <Input
                type="number"
                value={formData.actualAmount}
                onChange={(e) => setFormData({ ...formData, actualAmount: Number(e.target.value) })}
                min={0}
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
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
