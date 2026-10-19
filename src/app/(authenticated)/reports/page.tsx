import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ReportView } from "@/components/reports/report-view";
import { parseValidationDocumentId } from "@/lib/esg/validation-format";

type ReportsPageProps = {
  searchParams: Promise<{
    documentId?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { documentId: rawDocumentId } = await searchParams;
  const documentId = parseValidationDocumentId(rawDocumentId);

  return (
    <DashboardShell>
      <ReportView
        key={documentId ?? "missing-document"}
        documentId={documentId}
        invalidDocumentId={rawDocumentId !== undefined && documentId === null}
      />
    </DashboardShell>
  );
}
