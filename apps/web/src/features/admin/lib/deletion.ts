import type { Pillar, Question, QuestionGroup, Survey } from "@esg/shared";

export type DeleteTarget =
  | { type: "pillar"; pillar: Pillar }
  | { type: "group"; group: QuestionGroup }
  | { type: "question"; question: Question };

export function describeDeletion(
  target: DeleteTarget,
  survey: Survey,
): { title: string; message: string } {
  switch (target.type) {
    case "pillar": {
      const pillar = survey.find((item) => item.id === target.pillar.id);
      const groupCount = pillar?.groups.length ?? 0;
      const questionCount =
        pillar?.groups.reduce(
          (total, group) => total + group.questions.length,
          0,
        ) ?? 0;
      return {
        title: "Xóa trụ cột",
        message: `Bạn sắp xóa trụ cột “${target.pillar.name}” cùng ${groupCount} nhóm và ${questionCount} câu hỏi bên trong. Hành động này không thể hoàn tác.`,
      };
    }
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
