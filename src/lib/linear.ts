import { LinearClient } from "@linear/sdk";

export function createLinearClient(apiKey: string) {
  return new LinearClient({ apiKey });
}

export async function findContext(linear: LinearClient) {
  const me = await linear.viewer;
  const teams = await linear.teams();
  const projects = await linear.projects();
  const issuesConn = await linear.issues({ first: 20 });
  return { me, teams: teams.nodes, projects: projects.nodes, issues: issuesConn.nodes };
}

export async function findDuplicateIssue(linear: LinearClient, title: string) {
  const search = await linear.searchIssues(title);
  type SearchNode = { id: string; title?: string | null; identifier?: string | null; url?: string | null };
  const nodes: SearchNode[] = (search as unknown as { nodes?: SearchNode[] }).nodes ?? [];
  return nodes.find((i) => (i.title || "").toLowerCase() === title.toLowerCase());
}

export async function createIssue(linear: LinearClient, params: {
  title: string;
  description: string;
  teamId: string;
  projectId?: string | null;
  priority?: number | null;
  assigneeId?: string | null;
}) {
  const res = await linear.createIssue({
    title: params.title,
    description: params.description,
    teamId: params.teamId,
    projectId: params.projectId || undefined,
    priority: params.priority || undefined,
    assigneeId: params.assigneeId || undefined,
  });
  if (!res.success || !res.issue) {
    throw new Error("Failed to create Linear issue");
  }
  return res.issue;
}

export async function addIssueComment(linear: LinearClient, params: { issueId: string; body: string }) {
  const res = await linear.createComment({ issueId: params.issueId, body: params.body });
  return res.comment;
}

export async function updateIssue(linear: LinearClient, issueId: string, input: {
  assigneeId?: string | null;
  priority?: number | null;
  projectId?: string | null;
}) {
  await linear.updateIssue(issueId, {
    assigneeId: input.assigneeId || undefined,
    priority: input.priority || undefined,
    projectId: input.projectId || undefined,
  });
}


