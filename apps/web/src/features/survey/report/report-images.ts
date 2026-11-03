import { getAnswerFields, REPORT_QUESTION_LABELS } from "@esg/shared";

import { getDraft } from "../lib/progress";
import type { AnswerMap, GroupEntry } from "../types";
import type { EvidenceImage } from "./pdf-parts";

const MAX_IMAGES = 6;
const MAX_SIDE = 1000;
const IMAGE_QUALITY = 0.82;

async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
  } finally {
    bitmap.close();
  }
}

export async function collectEvidenceImages(
  entries: readonly GroupEntry[],
  answers: AnswerMap,
): Promise<EvidenceImage[]> {
  const images: EvidenceImage[] = [];
  let counter = 0;
  for (const entry of entries) {
    for (const question of entry.group.questions) {
      const draft = getDraft(answers, question.id);
      if (!getAnswerFields(question.inputType, draft.value).evidence) {
        continue;
      }
      for (const item of draft.evidence) {
        counter += 1;
        if (images.length >= MAX_IMAGES || !item.file.type.startsWith("image/")) {
          continue;
        }
        try {
          images.push({
            code: `EV-${String(counter).padStart(3, "0")}`,
            caption: `${question.id} ${REPORT_QUESTION_LABELS[question.id] ?? question.topic}: ${item.file.name}`,
            src: await toDataUrl(item.file),
          });
        } catch {
          continue;
        }
      }
    }
  }
  return images;
}
