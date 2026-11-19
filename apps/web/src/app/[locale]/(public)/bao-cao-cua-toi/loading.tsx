import { Container, LoadingRegion, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main>
      <Container className="py-8">
        <LoadingRegion className="mx-auto max-w-3xl space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="mt-6 h-28 w-full" />
        </LoadingRegion>
      </Container>
    </main>
  );
}
