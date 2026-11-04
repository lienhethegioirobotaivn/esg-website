import { getAnswerFields, REPORT_QUESTION_LABELS } from "@esg/shared";

import { getDraft } from "../lib/progress";
import type { AnswerMap, GroupEntry } from "../types";
import type { EvidenceImage } from "./pdf-parts";

const MAX_IMAGES = 8;
const MAX_NOTE_LENGTH = 160;
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

function buildCaption(
  id: string,
  text: string,
  topic: string,
  fileName: string,
  description: string,
): string {
  const note = description.trim();
  const shortNote =
    note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH)}…` : note;
  return [
    `${id} — ${REPORT_QUESTION_LABELS[id] ?? (topic || text)}`,
    `Tệp: ${fileName}`,
    `Minh chứng cho câu: ${text}`,
    shortNote !== "" ? `Ghi chú của doanh nghiệp: ${shortNote}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
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
            caption: buildCaption(question.id, question.text, question.topic, item.file.name, draft.description),
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
