import type { Question, QuestionGroup, Survey } from "@esg/shared";

export type DeleteTarget =
  | { type: "group"; group: QuestionGroup }
  | { type: "question"; question: Question };

export function describeDeletion(
  target: DeleteTarget,
  survey: Survey,
): { title: string; message: string } {
  switch (target.type) {
    case "group": {
      const questionCount =
        survey
          .flatMap((pillar) => pillar.groups)
          .find((group) => group.id === target.group.id)?.questions.length ?? 0;
      return {
        title: "Xóa nhóm câu hỏi",
        message: `Bạn sắp xóa nhóm “${target.group.title}” cùng ${questionCount} câu hỏi bên trong. Hành động này không thể hoàn tác.`,
      };
    }
    case "question":
      return {
        title: "Xóa câu hỏi",
        message: `Bạn sắp xóa câu hỏi “${target.question.text}”. Hành động này không thể hoàn tác.`,
      };
  }
}