export type Role = "user" | "assistant";

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachment?: { name: string; type: string; url?: string };
  imageUrl?: string;
};

export type ProviderHealth = {
  status: "online" | "offline";
  model: string;
  models: string[];
};

export type UploadResult = {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
};
