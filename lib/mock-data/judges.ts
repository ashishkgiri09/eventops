import { Judge } from "@/types";

const judgeNames = [
  { name: "Dr. Marcus Vance", org: "MIT CSAIL", desig: "Research Director", exp: ["AI/ML", "Reinforcement Learning"] },
  { name: "Siddharth Rao", org: "Google DeepMind", desig: "Staff Research Engineer", exp: ["LLM Agents", "NLP"] },
  { name: "Dr. Aris Thorne", org: "Stanford Robotics", desig: "Associate Professor", exp: ["IoT & Robotics", "Embedded Systems"] },
  { name: "Mei-Ling Zhou", org: "Sequoia Capital", desig: "Partner (DeepTech)", exp: ["Product Viability", "FinTech"] },
  { name: "David O'Connor", org: "Ethereum Foundation", desig: "Core Protocol Researcher", exp: ["Web3", "Distributed Systems"] },
  { name: "Amina Al-Mansoor", org: "AWS Architecture", desig: "Principal Solutions Architect", exp: ["Cloud Scale", "CyberSecurity"] },
  { name: "Vikram Sengupta", org: "Stripe", desig: "Head of Risk Engineering", exp: ["FinTech", "Payments Security"] },
  { name: "Elena Rostova", org: "BioGenomics AI", desig: "VP of Data Platforms", exp: ["HealthTech", "Bioinformatics"] },
  { name: "Liam Gallagher", org: "CleanGrid Labs", desig: "CTO", exp: ["CleanTech", "Smart Grids"] },
  { name: "Natasha Petrova", org: "OpenAI Fellow", desig: "Senior Scientist", exp: ["Generative Models", "Computer Vision"] },
  { name: "Rajesh Kannan", org: "Microsoft Azure Quantum", desig: "Principal Architect", exp: ["Distributed Computing", "Quantum"] },
  { name: "Chloe Dupont", org: "Station F Paris", desig: "Venture Partner", exp: ["Go-To-Market", "B2B SaaS"] },
  { name: "Kenji Sato", org: "Sony AI Labs", desig: "Lead Autonomous Systems", exp: ["Robotics", "Sensors"] },
  { name: "Sarah Al-Hassan", org: "CyberDefense Corp", desig: "CISO", exp: ["CyberSecurity", "Zero Trust"] },
  { name: "Mateo Silva", org: "Nubank", desig: "Director of Infrastructure", exp: ["FinTech", "High-Throughput DBs"] },
  { name: "Ananya Iyer", org: "Johns Hopkins Medicine", desig: "Clinical AI Lead", exp: ["HealthTech", "FDA Regs"] },
  { name: "Henrik Lindqvist", org: "Spotify", desig: "Staff Algorithmic Engineer", exp: ["Audio ML", "RecSys"] },
  { name: "Fatima Zahra", org: "Siemens Energy", desig: "Chief Sustainability Engineer", exp: ["CleanTech", "IoT"] },
  { name: "Lucas Moreau", org: "Y Combinator Alum", desig: "Founding Engineer", exp: ["Full-Stack", "Mobile Tech"] },
  { name: "Devika Nair", org: "IIT Bombay", desig: "Professor of Computer Science", exp: ["Algorithms", "Complexity Theory"] },
];

export const mockJudges: Judge[] = judgeNames.map((item, i) => {
  const index = i + 1;
  const id = `J${index.toString().padStart(3, "0")}`;

  // Workload distributions
  let workload = 40 + ((i * 17) % 55);
  let workloadStatus: Judge["workloadStatus"] = "AVAILABLE";
  if (i === 6 || i === 11) {
    workload = 92;
    workloadStatus = "OVERLOADED"; // J007 and J012 as requested in prompt!
  } else if (workload > 75) {
    workloadStatus = "BUSY";
  } else if (i === 18) {
    workload = 0;
    workloadStatus = "UNAVAILABLE";
  }

  // Assigned teams (realistic)
  const assignedTeams: string[] = [];
  const teamCount = Math.floor(workload / 15);
  for (let t = 0; t < teamCount; t++) {
    const tNum = ((i * 5 + t * 7) % 120) + 1;
    assignedTeams.push(`T${tNum.toString().padStart(3, "0")}`);
  }

  const conflicts: string[] = [];
  if (i === 6) conflicts.push("Cannot evaluate Team T042: Prior mentorship declaration");
  if (i === 11) conflicts.push("Time slot conflict: Keynote conflict from 04:00 PM - 04:45 PM");

  return {
    id,
    eventId: "evt-01",
    name: item.name,
    organization: item.org,
    designation: item.desig,
    expertise: item.exp,
    domains: item.exp,
    photoUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 54321}?w=150&auto=format&fit=crop&q=80`,
    assignedTeams,
    maxTeamCapacity: 8,
    availability: i === 18 ? "UNAVAILABLE" : i % 3 === 0 ? "PART_TIME" : "FULL_TIME",
    availableSlots: ["Slot A (02:00 PM)", "Slot B (03:30 PM)", "Slot C (05:00 PM)"],
    workload,
    workloadStatus,
    conflicts,
  };
});
