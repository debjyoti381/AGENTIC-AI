import type { Message, ProviderHealth, UploadResult } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export async function getProviderHealth(): Promise<ProviderHealth> {
  const response = await fetch(`${API_URL}/chat/health`);
  if (!response.ok) throw new Error("Unable to read provider status");
  return response.json() as Promise<ProviderHealth>;
}

export async function sendChat(messages: Message[], model: string): Promise<{ content: string; durationMs: number }> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
      model,
      temperature: 0.7,
    }),
  });
  const data = (await response.json()) as { detail?: string; message?: { content: string }; duration_ms?: number };
  if (!response.ok) throw new Error(data.detail ?? "The model could not respond");
  return { content: data.message?.content ?? "", durationMs: data.duration_ms ?? 0 };
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/uploads`, { method: "POST", body: form });
  const data = (await response.json()) as UploadResult & { detail?: string };
  if (!response.ok) throw new Error(data.detail ?? "The file could not be uploaded");
  return data;
}

export async function generateImage(prompt: string): Promise<{ status: string; url?: string; message?: string }> {
  const response = await fetch(`${API_URL}/images/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size: "1024x1024" }),
  });
  if (!response.ok) throw new Error("Image generation request failed");
  return response.json();
}
