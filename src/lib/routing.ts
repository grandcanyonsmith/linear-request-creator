export type RoutingInput = {
  title?: string;
  details?: string;
  category?: string;
  severity?: string;
};

export type RoutingDecision = {
  teamName?: string;
  assigneeName?: string;
};

type Rule = {
  include: string[]; // all these substrings must appear (case-insensitive)
  team: string;
  assignee: string;
};

const RULES: Rule[] = [
  // Customer Experience (CX)
  { include: ["cancel"], team: "Customer Experience (CX)", assignee: "Hamza" },
  { include: ["churn"], team: "Customer Experience (CX)", assignee: "Hamza" },
  { include: ["onboarding"], team: "Customer Experience (CX)", assignee: "Tony" },
  { include: ["dns"], team: "Customer Experience (CX)", assignee: "Tony" },
  { include: ["welcome call"], team: "Customer Experience (CX)", assignee: "Ray" },
  { include: ["triage"], team: "Customer Experience (CX)", assignee: "Ray" },
  { include: ["ticket", "support"], team: "Customer Experience (CX)", assignee: "Ray" },
  { include: ["project", "dfy"], team: "Customer Experience (CX)", assignee: "James" },
  { include: ["contractor"], team: "Customer Experience (CX)", assignee: "James" },
  { include: ["client", "communication"], team: "Customer Experience (CX)", assignee: "Phil" },

  // Sales
  { include: ["sales"], team: "Sales", assignee: "Jack" },
  { include: ["demo", "call"], team: "Sales", assignee: "Jack" },
  { include: ["trial"], team: "Sales", assignee: "Jack" },

  // Marketing
  { include: ["ads"], team: "Marketing", assignee: "Stockton" },
  { include: ["facebook", "ads"], team: "Marketing", assignee: "John" },
  { include: ["youtube", "ads"], team: "Marketing", assignee: "John" },
  { include: ["content"], team: "Marketing", assignee: "Edwin" },
  { include: ["thumbnail"], team: "Marketing", assignee: "Edwin" },
  { include: ["email", "copy"], team: "Marketing", assignee: "Edwin" },

  // Product/Tech
  { include: ["bug"], team: "Product/Tech", assignee: "Canyon" },
  { include: ["ai"], team: "Product/Tech", assignee: "Canyon" },
  { include: ["backend"], team: "Product/Tech", assignee: "Canyon" },
  { include: ["automation"], team: "Product/Tech", assignee: "Canyon" },
  { include: ["stripe"], team: "Product/Tech", assignee: "Canyon" },
  { include: ["checkout"], team: "Product/Tech", assignee: "Canyon" },
];

export function determineRouting(input: RoutingInput): RoutingDecision {
  const text = `${input.title ?? ""} ${input.details ?? ""}`.toLowerCase();
  // Category- and severity-driven hints first
  if ((input.category || "").toLowerCase() === "bug") {
    return { teamName: "Product/Tech", assigneeName: "Canyon" };
  }
  if ((input.category || "").toLowerCase() === "question") {
    return { teamName: "Customer Experience (CX)", assigneeName: "Ray" };
  }

  for (const rule of RULES) {
    const matches = rule.include.every((needle) => text.includes(needle));
    if (matches) return { teamName: rule.team, assigneeName: rule.assignee };
  }

  // Default: CX for general needs, else Product/Tech if severity is high
  if ((input.severity || "").toLowerCase() === "critical" || (input.severity || "").toLowerCase() === "high") {
    return { teamName: "Product/Tech", assigneeName: "Canyon" };
  }
  return { teamName: "Customer Experience (CX)", assigneeName: "Nebuchadnezzar" };
}


