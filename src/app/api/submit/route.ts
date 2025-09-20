import { NextRequest } from "next/server";
import { z } from "zod";
import { getKeys } from "@/lib/secrets";
import { createOpenAI, analyzeToIssue, type Attachment } from "@/lib/openai";
import { createLinearClient, findContext, findDuplicateIssue, createIssue, addIssueComment, updateIssue } from "@/lib/linear";
import { determineRouting } from "@/lib/routing";
import { uploadMultipleToS3 } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  reporterName: z.string().optional(),
  details: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fields = schema.parse({
      reporterName: formData.get("reporterName") || undefined,
      details: formData.get("details") || undefined,
    });

    const fileEntries = formData.getAll("files");
    const attachments: Attachment[] = [];
    for (const entry of fileEntries) {
      if (entry && typeof entry !== "string") {
        const blob = entry as File;
        const arrayBuffer = await blob.arrayBuffer();
        attachments.push({
          filename: blob.name,
          contentType: blob.type || "application/octet-stream",
          data: Buffer.from(arrayBuffer),
        });
      }
    }

    const { openaiKey, linearKey } = await getKeys();
    const openai = createOpenAI(openaiKey || (process.env.OPENAI_API_KEY as string));
    const linear = createLinearClient(linearKey || (process.env.LINEAR_API_KEY as string));

    // Gather Linear context (teams, projects, users)
    const { teams, projects } = await findContext(linear);
    const usersConn = await linear.users();
    const users = usersConn.nodes.map(u => ({ id: u.id, name: u.name, email: (u.email as string | null) }));

    // Upload files to S3 first
    const s3Uploads = await uploadMultipleToS3(
      attachments.map(a => ({ data: a.data, filename: a.filename, contentType: a.contentType }))
    );

    const analysis = await analyzeToIssue(openai, {
      title: undefined,
      details: fields.details,
      category: undefined,
      severity: undefined,
      reporterEmail: undefined,
      context: {
        teams: teams.map(t => ({ id: t.id, name: t.name })),
        projects: projects.map(p => ({ id: p.id, name: p.name })),
        users,
      },
      attachments,
    });
    // Deterministic routing overrides
    const rule = determineRouting({ title: undefined, details: fields.details, category: undefined, severity: undefined });
    const teamName = rule.teamName || analysis.teamName;
    const assigneeName = rule.assigneeName;

    // Resolve team/project/assignee
    const team = teamName ? teams.find(t => t.name.toLowerCase() === teamName?.toLowerCase()) : teams[0];
    const project = analysis.projectName ? projects.find(p => p.name.toLowerCase() === analysis.projectName?.toLowerCase()) : null;
    const assignee = assigneeName
      ? users.find(u => (u.name || "").toLowerCase().startsWith(assigneeName.toLowerCase()))
      : (analysis.assigneeEmail ? users.find(u => (u.email || "").toLowerCase() === analysis.assigneeEmail?.toLowerCase()) : undefined);

    // Check duplicates by title
    const dup = await findDuplicateIssue(linear, analysis.title);
    if (dup) {
      // Merge: comment with new details and reassign if routing suggests
      const attachmentLinks = s3Uploads.length > 0 
        ? `\n\nAttachments:\n${s3Uploads.map(upload => `- [${upload.key.split('/').pop()}](${upload.url})`).join('\n')}`
        : '';
      
      await addIssueComment(linear, {
        issueId: dup.id,
        body: `New submission merged into this issue.\n\nReporter: ${fields.reporterName || "anonymous"}\n\nDetails:\n${fields.details || "(none)"}${attachmentLinks}`,
      });
      if (assignee?.id) {
        await updateIssue(linear, dup.id, {
          assigneeId: assignee.id,
          projectId: project?.id || null,
          priority: analysis.priority || null,
        });
      }
      return new Response(JSON.stringify({ duplicate: true, issueId: dup.identifier, issueUrl: dup.url }), { status: 200, headers: { "content-type": "application/json" } });
    }

    const attachmentLinks = s3Uploads.length > 0 
      ? `\n\nAttachments:\n${s3Uploads.map(upload => `- [${upload.key.split('/').pop()}](${upload.url})`).join('\n')}`
      : '';
    
    const description = `${analysis.description}\n\nSubmitted by: ${fields.reporterName || "anonymous"}${attachmentLinks}`;
    const issue = await createIssue(linear, {
      title: analysis.title,
      description,
      teamId: team?.id || teams[0]?.id as string,
      projectId: project?.id || null,
      priority: analysis.priority || null,
      assigneeId: assignee?.id || null,
    });

    return new Response(JSON.stringify({ issueId: issue.identifier, issueUrl: issue.url }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
