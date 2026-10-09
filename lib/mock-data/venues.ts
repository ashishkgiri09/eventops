import { Venue, Bench } from "@/types";

const buildings = ["Turing Science Block", "Von Neumann Hall", "Ada Lovelace Computing Wing", "Claude Shannon Lab"];
const domains = ["AI / Machine Learning", "Distributed Systems / Web3", "FinTech & Payments", "HealthTech & Bio", "IoT & Robotics", "CleanTech & Green Energy", "CyberSecurity"];

export const mockVenues: Venue[] = Array.from({ length: 24 }, (_, i) => {
  const index = i + 1;
  const id = `R${index.toString().padStart(3, "0")}`;
  const building = buildings[i % buildings.length];
  const floor = `Floor ${Math.floor(i / 6) + 1}`;
  const roomNum = 100 + (Math.floor(i / 6) + 1) * 100 + (i % 6) + 1;
  const name = `Room ${roomNum} - ${building.split(" ")[0]} Suite`;

  // 5 benches per room = 120 benches total across 24 rooms
  const benches: Bench[] = Array.from({ length: 5 }, (_, bIdx) => {
    const benchGlobalNum = i * 5 + bIdx + 1;
    const benchId = `B${benchGlobalNum.toString().padStart(3, "0")}`;
    const statusRand = (benchGlobalNum * 13) % 10;
    let status: Bench["status"] = "occupied";
    if (statusRand === 0 || statusRand === 1) status = "available";
    else if (statusRand === 2) status = "reserved";
    else if (statusRand === 3) status = "maintenance";

    return {
      id: benchId,
      label: `Bench ${benchGlobalNum}`,
      venueId: id,
      status,
      hasPower: true,
      hasEthernet: bIdx % 2 === 0,
      assignedTeamId: status === "occupied" ? `T${benchGlobalNum.toString().padStart(3, "0")}` : undefined,
      assignedTeamName: status === "occupied" ? `Team Alpha-${benchGlobalNum}` : undefined,
    };
  });

  return {
    id,
    eventId: "evt-01",
    name,
    building,
    floor,
    capacity: 20,
    hasPower: true,
    hasInternet: true,
    isAccessible: true,
    equipment: ["High-speed 10Gbps LAN", "Dual 4K Presentation Monitors", "Dedicated 16A Power Strips", "Whiteboard"],
    supportedDomains: [domains[i % domains.length], domains[(i + 1) % domains.length]],
    status: (i % 8 === 7) ? "STANDBY" : "ACTIVE",
    benches,
  };
});
