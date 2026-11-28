import { CustomerDetailPage } from "@/features/backoffice/components/crm/customer-detail-page";

export default async function CustomerRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailPage key={id} id={encodeURIComponent(id)} />;
}
