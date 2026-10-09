import { Team, TeamMember } from "@/types";

const domainList = [
  "AI / Machine Learning",
  "Distributed Systems / Web3",
  "FinTech & Payments",
  "HealthTech & Bio",
  "IoT & Robotics",
  "CleanTech & Green Energy",
  "CyberSecurity",
  "EdTech & Developer Tooling",
];

const projectTitles = [
  "NeuralPulse: Edge-Compute Fall Detection",
  "HyperLedger Zero-Knowledge KYC Engine",
  "OmniFlow: Real-Time Stream Processor",
  "BioSense: Non-Invasive Glucose Predictor",
  "AeroMesh: Autonomous Drone Mesh Network",
  "VoltGuard: Smart Micro-Grid Load Balancer",
  "Sentrix: Autonomous Cloud Threat Neutralizer",
  "CodeWeaver: Semantic Compiler for Multi-Modal LLMs",
  "AgriDrone: Multi-Spectral Crop Disease Identifier",
  "AetherPay: Offline Biometric Micro-Payments",
  "CortexMind: EEG-Based Assistive Communication",
  "CryoChain: Cold-Chain Vaccine Integrity Tracker",
];

export const mockTeams: Team[] = Array.from({ length: 120 }, (_, i) => {
  const index = i + 1;
  const id = `T${index.toString().padStart(3, "0")}`;
  const domain = domainList[i % domainList.length];
  const title = `${projectTitles[i % projectTitles.length]} #${index}`;

  // Bench and room mapping: 5 benches per room across 24 rooms
  const roomIndex = Math.floor(i / 5) + 1;
  const benchGlobal = i + 1;
  const venueId = `R${roomIndex.toString().padStart(3, "0")}`;
  const benchId = `B${benchGlobal.toString().padStart(3, "0")}`;

  // Assign 2 judges
  const j1 = ((i * 3) % 20) + 1;
  const j2 = ((i * 3 + 7) % 20) + 1;
  const assignedJudges = [`J${j1.toString().padStart(3, "0")}`, `J${j2.toString().padStart(3, "0")}`];

  // Check-in status realistic distribution
  let checkInStatus: Team["checkInStatus"] = "CHECKED_IN";
  let checkedInTime: string | undefined = `2026-10-15T09:${(10 + (i % 45)).toString().padStart(2, "0")}:00Z`;

  if (i === 14 || i === 28 || i === 41 || i === 77 || i === 99 || i === 115) {
    checkInStatus = "ABSENT";
    checkedInTime = undefined;
  } else if (i % 12 === 0) {
    checkInStatus = "PARTIAL";
  }

  // Team T042 special highlight from prompt:
  if (id === "T042") {
    checkInStatus = "CHECKED_IN";
    checkedInTime = "2026-10-15T08:45:00Z";
  }

  const memberCount = (i % 3) + 2; // 2 to 4 members
  const members: TeamMember[] = Array.from({ length: memberCount }, (_, mIdx) => ({
    id: `mem-${id}-${mIdx + 1}`,
    name: mIdx === 0 ? `Lead Developer ${index}` : `Co-builder ${index}-${mIdx}`,
    email: mIdx === 0 ? `lead.t${index}@innovate.dev` : `member${mIdx}.t${index}@innovate.dev`,
    phone: `+1 555-01${(10 + (i * 2 + mIdx) % 89).toString()}`,
    role: mIdx === 0 ? "LEADER" : "MEMBER",
    organizationOrSchool: i % 2 === 0 ? "Stanford University" : "Stripe Labs / Independent",
    dietaryPreference: mIdx % 2 === 0 ? "VEG" : "NON_VEG",
    tShirtSize: ["M", "L", "XL"][mIdx % 3] as any,
    checkInStatus: checkInStatus === "ABSENT" ? "ABSENT" : (checkInStatus === "PARTIAL" && mIdx > 1 ? "ABSENT" : "CHECKED_IN"),
    checkedInAt: checkInStatus !== "ABSENT" ? checkedInTime : undefined,
  }));

  return {
    id,
    eventId: "evt-01",
    name: `Team ${id} — ${title.split(":")[0]}`,
    leadName: members[0].name,
    leadEmail: members[0].email,
    members,
    project: {
      title,
      abstract: `An enterprise-grade solution utilizing state-of-the-art architectures in ${domain} to address high-throughput reliability, sub-second latency, and resilience.`,
      domain,
      repoUrl: `https://github.com/vistra-hackathon/team-${id.toLowerCase()}`,
      demoUrl: `https://t${id.toLowerCase()}.vistra-showcase.app`,
      techStack: ["Next.js", "TypeScript", "Python", "FastAPI", "PostgreSQL", "PyTorch", "Docker"],
      hardwareRequirements: i % 4 === 0 ? ["NVIDIA Jetson Orin Nano", "Sensors Pack", "24V Power Supply"] : undefined,
    },
    registrationStatus: "APPROVED",
    checkInStatus,
    checkedInTime,
    assignedVenue: venueId,
    assignedVenueName: `Room 20${(roomIndex % 6) + 1}`,
    assignedBench: benchId,
    assignedJudges: id === "T042" ? ["J007", "J012"] : assignedJudges,
    currentRound: 1,
    totalScore: 70 + ((i * 13) % 28),
    rank: (i % 120) + 1,
    qrCodeToken: `EVENTOPS_QR_EVT01_${id}_SECURE_TOKEN_2026`,
  };
});
