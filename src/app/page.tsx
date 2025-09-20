"use client";

import { useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; issueUrl?: string; issueId?: string }
  | { status: "error"; message: string };

export default function Home() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  const EMPLOYEES = [
    "Stockton",
    "Canyon",
    "Jack",
    "Nebuchadnezzar",
    "Ken",
    "Hamza",
    "Tony",
    "Juan",
    "Ray",
    "Victor",
    "James",
    "Phil",
    "Christian",
    "Kyell",
    "Sam",
    "John (Media Buyer)",
    "John (Setter)",
    "Edwin",
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    files.forEach((file) => formData.append("files", file));
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      setSubmitState({ status: "success", issueUrl: json.issueUrl, issueId: json.issueId });
      form.reset();
      setFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSubmitState({ status: "error", message });
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Submit a Request or Bug</h1>
      <p className="mt-2 text-gray-600">Record your screen or upload screenshots/videos with details.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" encType="multipart/form-data">
        <div>
          <label className="block text-sm font-medium">Reporter</label>
          <select name="reporterName" className="mt-1 w-full rounded-md border p-2" required defaultValue="">
            <option value="" disabled>Select your name</option>
            {EMPLOYEES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Details</label>
          <textarea name="details" placeholder="Steps to reproduce, expected vs actual, context" className="mt-1 w-full rounded-md border p-2" rows={6} />
        </div>

        <div>
          <label className="block text-sm font-medium">Uploads</label>
          <input
            type="file"
            name="files"
            accept="image/*,video/*"
            multiple
            className="mt-1 w-full rounded-md border p-2"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              setFiles(list);
            }}
          />
          {files.length > 0 ? (
            <div className="mt-2 text-sm text-gray-600">{files.length} file(s) selected</div>
          ) : null}

          <div className="mt-4 space-x-2">
            <button
              type="button"
              className="rounded-md bg-gray-800 px-3 py-2 text-white disabled:opacity-50"
              onClick={async () => {
                if (isRecording) return;
                try {
                  // Capture screen + mic
                  const screen = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> }).getDisplayMedia({ video: true, audio: true } as MediaStreamConstraints);
                  let mic: MediaStream | null = null;
                  try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
                  const combined = new MediaStream([
                    ...screen.getVideoTracks(),
                    ...(screen.getAudioTracks() || []),
                    ...(mic ? mic.getAudioTracks() : []),
                  ]);
                  const mr = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9,opus" });
                  setRecordedChunks([]);
                  mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) setRecordedChunks((p) => [...p, ev.data]); };
                  mr.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: "video/webm" });
                    const file = new File([blob], `screen-recording-${Date.now()}.webm`, { type: "video/webm" });
                    setFiles((prev) => [...prev, file]);
                    setIsRecording(false);
                  };
                  mr.start();
                  setRecorder(mr);
                  setIsRecording(true);
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={isRecording}
            >Start screen recording</button>
            <button
              type="button"
              className="rounded-md bg-gray-600 px-3 py-2 text-white disabled:opacity-50"
              onClick={() => { if (recorder && isRecording) recorder.stop(); }}
              disabled={!isRecording}
            >Stop & attach recording</button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitState.status === "submitting"}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitState.status === "submitting" ? "Submitting..." : "Submit"}
        </button>

        {submitState.status === "error" ? (
          <div className="text-sm text-red-600">{submitState.message}</div>
        ) : null}
        {submitState.status === "success" ? (
          <div className="text-sm text-green-700">
            Created Linear issue{submitState.issueId ? ` ${submitState.issueId}` : ""}.{" "}
            {submitState.issueUrl ? (
              <a href={submitState.issueUrl} className="underline" target="_blank" rel="noreferrer">
                View in Linear
              </a>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
