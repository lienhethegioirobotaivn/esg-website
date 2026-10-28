import { Button } from "@/components/ui";

interface FormActionsProps {
  submitLabel: string;
  onCancel: () => void;
}

export function FormActions({ submitLabel, onCancel }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-4">
      <Button variant="secondary" onClick={onCancel}>
        Hủy
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
