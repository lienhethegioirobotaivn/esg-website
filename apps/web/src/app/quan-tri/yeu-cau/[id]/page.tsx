import { InquiryDetailPage } from "@/features/backoffice/components/crm/inquiry-detail-page";

export default async function InquiryRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InquiryDetailPage key={id} id={encodeURIComponent(id)} />;
}
