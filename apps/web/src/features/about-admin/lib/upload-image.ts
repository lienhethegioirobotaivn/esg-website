import { ApiError, sendForm } from "@/features/backoffice/lib/api";

export async function uploadImage(file: Blob): Promise<string> {
  const form = new FormData();
  form.set("image", file, "image.jpg");
  const uploaded = await sendForm<{ url?: string }>("/admin/upload", form);
  if (typeof uploaded?.url !== "string") {
    throw new ApiError("Không nhận được đường dẫn ảnh.", 502);
  }
  return uploaded.url;
}
