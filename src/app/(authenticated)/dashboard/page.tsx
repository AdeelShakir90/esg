import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { parseValidationDocumentId } from "@/lib/esg/validation-format";

type DashboardPageProps = {
  searchParams: Promise<{
    documentId?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { documentId: rawDocumentId } = await searchParams;
  const documentId = parseValidationDocumentId(rawDocumentId);

  return (
    <DashboardShell>
      <DashboardOverview
        key={documentId ?? "missing-document"}
        documentId={documentId}
        invalidDocumentId={rawDocumentId !== undefined && documentId === null}
      />
    </DashboardShell>
  );
}
