import { pdf } from "@react-pdf/renderer";

import type { EsgReportSnapshot } from "@/lib/esg/report-export";
import { createEsgReportFileName } from "@/lib/esg/report-export";

import { EsgReportPdfDocument } from "./report-pdf-document";

export async function downloadEsgReportPdf(report: EsgReportSnapshot) {
  const blob = await pdf(<EsgReportPdfDocument report={report} />).toBlob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = createEsgReportFileName(
    report.document.fileName,
    report.generatedAt
  );
  anchor.hidden = true;
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
