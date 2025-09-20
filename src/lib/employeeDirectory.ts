export type Employee = {
  name: string;
  email?: string;
  role: string;
  team: string; // Team name as used in Linear (e.g., "Customer Experience (CX)")
  skills: string[];
  notes?: string;
};

export const TEAMS: string[] = [
  "Executive",
  "Marketing",
  "Customer Experience (CX)",
  "Sales",
  "Product/Tech",
  "HR",
];

export const EMPLOYEE_DIRECTORY: Employee[] = [
  { name: "Stockton", email: undefined, role: "Founder & CEO, CMO", team: "Executive", skills: ["marketing", "ads", "content", "leadership"] },
  { name: "Canyon", email: undefined, role: "Co‑founder, Product & Tech", team: "Product/Tech", skills: ["ai", "automation", "backend", "stripe", "checkout", "data"] },
  { name: "Jack", email: "jack@coursecreator360.com", role: "VP of Sales", team: "Sales", skills: ["sales", "mrr", "demos", "trials"] },
  { name: "Nebuchadnezzar", email: undefined, role: "VP of Customer Experience", team: "Customer Experience (CX)", skills: ["onboarding", "support", "success", "churn", "leadership"] },
  { name: "Ken", email: undefined, role: "Customer Support", team: "Customer Experience (CX)", skills: ["support", "onboarding", "moderation"] },
  { name: "Hamza", email: "hamza@coursecreator360.com", role: "Cancellation & Churn Specialist", team: "Customer Experience (CX)", skills: ["cancellation", "save", "churn", "negotiation"] },
  { name: "Tony", email: undefined, role: "Head of Onboarding", team: "Customer Experience (CX)", skills: ["onboarding", "dns", "setup"] },
  { name: "Juan", email: undefined, role: "Onboarding Rep", team: "Customer Experience (CX)", skills: ["onboarding"] },
  { name: "Ray", email: undefined, role: "Support Triage & Welcome Calls", team: "Customer Experience (CX)", skills: ["support", "welcome call", "triage"] },
  { name: "Victor", email: undefined, role: "Onboarding Rep", team: "Customer Experience (CX)", skills: ["onboarding"] },
  { name: "James", email: undefined, role: "Head of Project Management", team: "Customer Experience (CX)", skills: ["projects", "quality", "dfy", "contractors"] },
  { name: "Phil", email: undefined, role: "Customer Communications", team: "Customer Experience (CX)", skills: ["client communication", "support", "projects"] },
  { name: "Christian", email: undefined, role: "Closer", team: "Sales", skills: ["demos", "closing"] },
  { name: "Kyell", email: undefined, role: "Closer", team: "Sales", skills: ["demos", "closing"] },
  { name: "Sam", email: undefined, role: "Setter", team: "Sales", skills: ["outreach", "calls", "trial"] },
  { name: "John (Media Buyer)", email: undefined, role: "Media Buyer", team: "Marketing", skills: ["facebook ads", "youtube ads", "reports", "ad angles"] },
  { name: "John (Setter)", email: undefined, role: "Setter", team: "Sales", skills: ["outreach", "calls", "trial"] },
  { name: "Edwin", email: undefined, role: "Content Marketing Manager", team: "Marketing", skills: ["content", "copy", "email", "thumbnails", "social"] },
];

export function findEmployeeByName(name: string): Employee | undefined {
  const lower = name.toLowerCase();
  return EMPLOYEE_DIRECTORY.find((e) => e.name.toLowerCase().startsWith(lower));
}


