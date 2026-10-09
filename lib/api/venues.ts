import { Venue, Bench } from "@/types";
import { mockVenues } from "@/lib/mock-data/venues";
import { USE_MOCK_API } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

export const venuesApi = {
  async getAll(eventId = activeEventId()): Promise<Venue[]> {
    if (!USE_MOCK_API) {
      const records = await eventModuleApi.list<Venue>("venues", eventId);
      return records.map((venue) => ({ ...venue, benches: Array.isArray(venue.benches) ? venue.benches : [] }));
    }
    await new Promise((r) => setTimeout(r, 200));
    return mockVenues.filter((v) => !eventId || v.eventId === eventId);
  },

  async getById(id: string): Promise<Venue | undefined> {
    if (!USE_MOCK_API) return (await eventModuleApi.list<Venue>("venues", activeEventId())).find((item) => item.id === id);
    await new Promise((r) => setTimeout(r, 150));
    return mockVenues.find((v) => v.id === id);
  },

  async create(data: Partial<Venue>): Promise<Venue> {
    if (!USE_MOCK_API) return await eventModuleApi.create<Venue>("venues", data, data.eventId || activeEventId());
    await new Promise((r) => setTimeout(r, 300));
    const newId = `R${(mockVenues.length + 1).toString().padStart(3, "0")}`;
    const newVenue: Venue = {
      id: newId,
      eventId: data.eventId || "evt-01",
      name: data.name || `Room ${newId} - Innovation Hub`,
      building: data.building || "Turing Science Block",
      floor: data.floor || "Floor 1",
      capacity: data.capacity || 20,
      hasPower: data.hasPower ?? true,
      hasInternet: data.hasInternet ?? true,
      isAccessible: data.isAccessible ?? true,
      equipment: data.equipment || ["10Gbps LAN", "Monitors"],
      supportedDomains: data.supportedDomains || ["AI / Machine Learning"],
      status: "ACTIVE",
      benches: Array.from({ length: 5 }, (_, bIdx) => ({
        id: `B${(mockVenues.length * 5 + bIdx + 1).toString().padStart(3, "0")}`,
        label: `Bench ${mockVenues.length * 5 + bIdx + 1}`,
        venueId: newId,
        status: "available",
        hasPower: true,
        hasEthernet: true,
      })),
    };
    mockVenues.push(newVenue);
    return newVenue;
  },

  async updateBenchStatus(benchId: string, status: Bench["status"]): Promise<Bench> {
    if (!USE_MOCK_API) {
      const venues = await eventModuleApi.list<Venue>("venues", activeEventId());
      const venue = venues.find((item) => item.benches?.some((bench) => bench.id === benchId));
      if (!venue) throw new Error("Bench not found");
      const benches = venue.benches.map((bench) => bench.id === benchId ? { ...bench, status } : bench);
      await eventModuleApi.update<Venue>("venues", venue.id, { ...venue, benches });
      return benches.find((bench) => bench.id === benchId)!;
    }
    await new Promise((r) => setTimeout(r, 150));
    for (const v of mockVenues) {
      const b = v.benches.find((bench) => bench.id === benchId);
      if (b) {
        b.status = status;
        return { ...b };
      }
    }
    throw new Error("Bench not found");
  },
};
