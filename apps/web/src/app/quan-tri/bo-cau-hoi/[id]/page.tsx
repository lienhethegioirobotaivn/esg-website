import { BankEditorPage } from "@/features/bank-admin/components/bank-editor-page";

export default async function BankEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankEditorPage key={id} id={encodeURIComponent(id)} />;
}
