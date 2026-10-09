import { ResourceItem, BudgetEntry } from "@/types";
import { mockResources } from "@/lib/mock-data/resources";
import { USE_MOCK_API } from "./client";
import { apiClient } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

export const mockBudgets: BudgetEntry[] = [
  { id: "bg-01", eventId: "evt-01", category: "VENUE", name: "Auditorium & Suite Facility Rental", plannedAmount: 12000, actualAmount: 11500, status: "PAID", paidDate: "2026-10-01" },
  { id: "bg-02", eventId: "evt-01", category: "CATERING", name: "Continuous Catering & Meals (36-Hour)", plannedAmount: 18000, actualAmount: 16800, status: "PAID", paidDate: "2026-10-14" },
  { id: "bg-03", eventId: "evt-01", category: "EQUIPMENT", name: "High-Capacity Network Switches & Cables", plannedAmount: 6000, actualAmount: 5200, status: "COMMITTED" },
  { id: "bg-04", eventId: "evt-01", category: "PRIZES", name: "Grand Innovation Awards & Winner Grants", plannedAmount: 25000, actualAmount: 25000, status: "COMMITTED" },
  { id: "bg-05", eventId: "evt-01", category: "STAFF", name: "Security, Medical & Operational Support", plannedAmount: 4500, actualAmount: 3800, status: "PAID", paidDate: "2026-10-15" },
  { id: "bg-06", eventId: "evt-01", category: "MARKETING", name: "Badges, Lanyards & Physical Swag Kits", plannedAmount: 5000, actualAmount: 4900, status: "PAID", paidDate: "2026-10-10" },
];

/**
 * Resources, Food & Budget API Domain Service
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/resources
 * - POST /api/v1/events/{id}/resources/consume
 * - GET /api/v1/events/{id}/budget
 * - POST /api/v1/events/{id}/budget
 */
export const resourcesApi = {
  async getAll(eventId = "evt-01"): Promise<ResourceItem[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<ResourceItem>("resources", eventId);
    await new Promise((r) => setTimeout(r, 150));
    return mockResources.filter((res) => !eventId || res.eventId === eventId);
  },

  async updateConsumption(resourceId: string, quantityToAdd: number): Promise<ResourceItem> {
    if (!USE_MOCK_API) return await apiClient(`/api/v1/events/${activeEventId()}/modules/resources/${resourceId}/consumption`, { method: "POST", body: JSON.stringify({ quantity: quantityToAdd }) });
    await new Promise((r) => setTimeout(r, 150));
    const item = mockResources.find((r) => r.id === resourceId);
    if (item) {
      item.consumedQuantity = Math.min(item.totalQuantity, item.consumedQuantity + quantityToAdd);
      const remaining = item.totalQuantity - item.consumedQuantity;
      if (remaining <= 0) {
        item.status = "DEPLETED";
      } else if (remaining <= item.lowStockThreshold) {
        item.status = "LOW_STOCK";
      } else {
        item.status = "HEALTHY";
      }
      return { ...item };
    }
    throw new Error("Resource not found");
  },

  async returnResource(resourceId: string, quantityToReturn: number): Promise<ResourceItem> {
    if (!USE_MOCK_API) return await apiClient(`/api/v1/events/${activeEventId()}/modules/resources/${resourceId}/consumption`, { method: "POST", body: JSON.stringify({ quantity: quantityToReturn, action: "return" }) });
    await new Promise((r) => setTimeout(r, 150));
    const item = mockResources.find((r) => r.id === resourceId);
    if (item) {
      item.consumedQuantity = Math.max(0, item.consumedQuantity - quantityToReturn);
      item.status = "HEALTHY";
      return { ...item };
    }
    throw new Error("Resource not found");
  },

  // Budget & Spending Management
  async getBudgetSummary(eventId = "evt-01") {
    if (!USE_MOCK_API) {
      const entries = await eventModuleApi.list<BudgetEntry>("budget", eventId);
      const plannedTotal = entries.reduce((sum, item) => sum + item.plannedAmount, 0);
      const actualTotal = entries.reduce((sum, item) => sum + item.actualAmount, 0);
      return { plannedTotal, actualTotal, remainingBalance: plannedTotal - actualTotal, burnRatePct: plannedTotal ? Math.round(actualTotal * 100 / plannedTotal) : 0, entries };
    }
    await new Promise((r) => setTimeout(r, 150));
    const entries = mockBudgets.filter((b) => b.eventId === eventId || true);
    const plannedTotal = entries.reduce((sum, e) => sum + e.plannedAmount, 0);
    const actualTotal = entries.reduce((sum, e) => sum + e.actualAmount, 0);
    const remainingBalance = plannedTotal - actualTotal;

    return {
      plannedTotal,
      actualTotal,
      remainingBalance,
      burnRatePct: Math.round((actualTotal / (plannedTotal || 1)) * 100),
      entries,
    };
  },

  async addBudgetEntry(entry: Partial<BudgetEntry>): Promise<BudgetEntry> {
    if (!USE_MOCK_API) return await eventModuleApi.create<BudgetEntry>("budget", entry, entry.eventId || activeEventId());
    await new Promise((r) => setTimeout(r, 200));
    const newEntry: BudgetEntry = {
      id: `bg-${Date.now().toString().slice(-4)}`,
      eventId: entry.eventId || "evt-01",
      category: entry.category || "MISC",
      name: entry.name || "Expense Item",
      plannedAmount: entry.plannedAmount || 1000,
      actualAmount: entry.actualAmount || 0,
      status: entry.status || "PLANNED",
    };
    mockBudgets.unshift(newEntry);
    return newEntry;
  },
};
