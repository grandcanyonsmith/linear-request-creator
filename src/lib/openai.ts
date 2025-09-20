import OpenAI from "openai";
import { toFile } from "openai/uploads";

export function createOpenAI(apiKey: string) {
  return new OpenAI({ apiKey });
}

export type Attachment = {
  filename: string;
  contentType: string;
  data: Buffer;
};

export async function analyzeToIssue(openai: OpenAI, input: {
  title?: string;
  details?: string;
  category?: string;
  severity?: string;
  reporterEmail?: string;
  context: {
    teams: Array<{ id: string; name: string }>;
    projects: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string; email?: string | null }>;
    issues?: Array<{ id: string; identifier?: string | null; title?: string | null }>;
  };
  attachments: Attachment[];
}): Promise<{
  title: string;
  description: string;
  teamName?: string;
  projectName?: string;
  assigneeEmail?: string;
  priority?: number;
}> {
  // Defer image OCR for now; include filenames for context
  const imageFilenames: string[] = [];
  // Gather audio/video blobs for transcription
  const avFiles: Attachment[] = [];
  for (const file of input.attachments) {
    if (file.contentType.startsWith("image/")) {
      imageFilenames.push(file.filename);
    } else if (file.contentType.startsWith("audio/") || file.contentType.startsWith("video/")) {
      avFiles.push(file);
    }
  }

  const system = `You are an assistant that converts mixed bug/request submissions (text, images, videos) into high-quality Linear issues.
Given: submission details, available Linear teams/projects/users, infer the best team, project, assignee, and priority.
Output a strict JSON object with fields: title (you must create it), description, teamName, projectName, assigneeEmail, priority (1-4), category (one of bug|feature|question|task), severity (one of critical|high|medium|low).`;

  type InputText = { type: "input_text"; text: string };
  const contentParts: Array<InputText> = [];
  if (input.title) contentParts.push({ type: "input_text", text: `Title: ${input.title}` });
  if (input.details) contentParts.push({ type: "input_text", text: `Details: ${input.details}` });
  contentParts.push({ type: "input_text", text: `Category: ${input.category}` });
  contentParts.push({ type: "input_text", text: `Severity: ${input.severity}` });
  if (input.reporterEmail) contentParts.push({ type: "input_text", text: `Reporter: ${input.reporterEmail}` });
  if (imageFilenames.length) {
    contentParts.push({ type: "input_text", text: `Image uploads: ${imageFilenames.join(", ")}` });
  }
  // Add non-image file names for additional context
  const nonImages = input.attachments.filter(a => !a.contentType.startsWith("image/"));
  if (nonImages.length) {
    contentParts.push({ type: "input_text", text: `Non-image uploads: ${nonImages.map(n => n.filename).join(", ")}` });
  }
  // Transcribe audio/video and include transcript text
  let transcriptText = "";
  for (const media of avFiles) {
    try {
      const file = await toFile(media.data, media.filename, { type: media.contentType });
      const t = await openai.audio.transcriptions.create({
        model: "gpt-4o-transcribe",
        file,
        response_format: "text",
      });
      transcriptText += `\n[Transcript ${media.filename}]\n${typeof t === "string" ? t : (t as { text?: string }).text || ""}`;
    } catch {}
  }
  if (transcriptText.trim()) {
    contentParts.push({ type: "input_text", text: `Transcript(s): ${transcriptText.slice(0, 4000)}` });
  }
  contentParts.push({ type: "input_text", text: `Linear teams: ${JSON.stringify(input.context.teams)}` });
  contentParts.push({ type: "input_text", text: `Linear projects: ${JSON.stringify(input.context.projects)}` });
  contentParts.push({ type: "input_text", text: `Linear users: ${JSON.stringify(input.context.users.map(u => ({ id: u.id, name: u.name, email: u.email })))}` });
  if (input.context.issues?.length) {
    contentParts.push({ type: "input_text", text: `Recent issues: ${JSON.stringify(input.context.issues.map(i => ({ id: i.id, identifier: i.identifier, title: i.title })))}` });
  }

  const inputMessages = [
    { role: "system", content: [{ type: "input_text", text: system }] },
    { role: "user", content: contentParts },
  ] as unknown as Parameters<typeof openai.responses.create>[0]["input"];

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: inputMessages,
    text: {
      format: {
        type: "json_schema",
        name: "Issue",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            teamName: { type: "string" },
            projectName: { type: "string" },
            assigneeEmail: { type: "string" },
            priority: { type: "number" },
            category: { type: "string" },
            severity: { type: "string" },
          },
          required: [
            "title",
            "description",
            "teamName",
            "projectName",
            "assigneeEmail",
            "priority",
            "category",
            "severity"
          ],
        },
      },
    },
  });

  const jsonText = (response as unknown as { output_text?: string }).output_text || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = {};
  }
  type Parsed = {
    title?: string;
    description?: string;
    teamName?: string;
    projectName?: string;
    assigneeEmail?: string;
    priority?: number;
    category?: string;
    severity?: string;
  };
  const p = parsed as Parsed;
  return {
    title: p.title || input.title || "New Issue",
    description: p.description || input.details || "",
    teamName: p.teamName,
    projectName: p.projectName,
    assigneeEmail: p.assigneeEmail,
    priority: p.priority,
  };
}


