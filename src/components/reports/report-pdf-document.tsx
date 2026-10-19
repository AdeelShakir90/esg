import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { EffectiveEsgField } from "@/lib/esg/effective-fields";
import type { EsgReportSnapshot } from "@/lib/esg/report-export";

const colors = {
  navy: "#14243A",
  green: "#16815D",
  teal: "#0E6C66",
  ink: "#243447",
  muted: "#607080",
  border: "#DCE6E1",
  paleGreen: "#EEF7F3",
  paleAmber: "#FFF8E8",
  paleRed: "#FFF1F1",
  white: "#FFFFFF",
} as const;

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.45,
    paddingTop: 24,
    paddingRight: 42,
    paddingBottom: 20,
    paddingLeft: 42,
  },
  pageFrame: {
    display: "flex",
    flexDirection: "column",
    height: 796,
  },
  coverPage: {
    backgroundColor: colors.navy,
    color: colors.white,
    fontFamily: "Helvetica",
    paddingTop: 54,
    paddingRight: 48,
    paddingBottom: 48,
    paddingLeft: 48,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 8,
  },
  headerBrand: {
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  headerDraft: {
    color: colors.muted,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1.2,
  },
  footer: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 7,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
  },
  footerText: {
    color: colors.muted,
    fontSize: 6.8,
  },
  categoryFooter: {
    justifyContent: "flex-end",
  },
  watermark: {
    position: "absolute",
    top: "43%",
    left: "18%",
    color: "#E7F0EC",
    fontFamily: "Helvetica-Bold",
    fontSize: 60,
    letterSpacing: 8,
    opacity: 0.28,
    transform: "rotate(-28deg)",
  },
  coverTop: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
  },
  coverBadge: {
    borderColor: "#5BC79D",
    borderRadius: 10,
    borderWidth: 1,
    color: "#A4E6CD",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverAccent: {
    backgroundColor: "#31A779",
    borderRadius: 3,
    height: 6,
    marginTop: 86,
    width: 74,
  },
  coverEyebrow: {
    color: "#8EDBBE",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.8,
    marginTop: 26,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 34,
    lineHeight: 1.1,
    marginTop: 14,
    maxWidth: 420,
  },
  coverIntro: {
    color: "#C8D6DF",
    fontSize: 11,
    lineHeight: 1.55,
    marginTop: 18,
    maxWidth: 410,
  },
  coverMeta: {
    borderColor: "#3A4D61",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 54,
    padding: 20,
  },
  coverMetaRow: {
    borderBottomColor: "#3A4D61",
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "row",
    gap: 18,
    paddingBottom: 10,
    paddingTop: 10,
  },
  coverMetaRowLast: {
    borderBottomWidth: 0,
  },
  coverMetaLabel: {
    color: "#8FA5B4",
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    width: 110,
  },
  coverMetaValue: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    flexShrink: 1,
    width: 330,
  },
  coverDisclaimer: {
    bottom: 42,
    color: "#AEBEC9",
    fontSize: 7.5,
    left: 48,
    lineHeight: 1.5,
    position: "absolute",
    right: 110,
  },
  coverPageNumber: {
    bottom: 42,
    color: "#AEBEC9",
    fontSize: 7.5,
    position: "absolute",
    right: 48,
  },
  section: {
    marginBottom: 20,
  },
  sectionEyebrow: {
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1.3,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    lineHeight: 1.2,
    marginBottom: 7,
  },
  paragraph: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 1.55,
  },
  metadataGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  metadataItem: {
    backgroundColor: colors.paleGreen,
    borderRadius: 5,
    padding: 10,
    width: "48%",
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 6.5,
    letterSpacing: 0.8,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  metaValue: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  notice: {
    backgroundColor: colors.paleAmber,
    borderColor: "#E8C66A",
    borderRadius: 5,
    borderWidth: 1,
    color: "#765C17",
    fontSize: 8,
    lineHeight: 1.5,
    marginBottom: 20,
    padding: 11,
  },
  summaryRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  summaryBox: {
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    flexGrow: 1,
    padding: 10,
  },
  summaryNumber: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 7,
    marginTop: 2,
  },
  categoryHeader: {
    alignItems: "flex-end",
    borderBottomColor: colors.green,
    borderBottomWidth: 2,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 6,
  },
  categoryTitle: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
  },
  categoryBrand: {
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 1,
    marginBottom: 5,
  },
  categoryCount: {
    color: colors.muted,
    fontSize: 7,
  },
  indicatorCard: {
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 9,
    padding: 11,
  },
  indicatorRejected: {
    backgroundColor: colors.paleRed,
    borderColor: "#E6B2B2",
  },
  indicatorTop: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  indicatorLabel: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    maxWidth: "62%",
  },
  statusPill: {
    backgroundColor: colors.paleGreen,
    borderRadius: 8,
    color: colors.teal,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillRejected: {
    backgroundColor: "#F6DADA",
    color: "#8A3030",
  },
  indicatorValue: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginTop: 8,
  },
  indicatorSubline: {
    color: colors.muted,
    fontSize: 7,
    marginTop: 2,
  },
  detailRow: {
    display: "flex",
    flexDirection: "row",
    gap: 18,
    marginTop: 8,
  },
  detailItem: {
    flexGrow: 1,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 6.5,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 8,
    marginTop: 1,
  },
  originalValue: {
    backgroundColor: colors.paleGreen,
    borderRadius: 4,
    color: colors.ink,
    fontSize: 7.5,
    marginTop: 8,
    padding: 7,
  },
  evidence: {
    borderLeftColor: colors.green,
    borderLeftWidth: 2,
    color: colors.muted,
    fontSize: 7.5,
    lineHeight: 1.45,
    marginTop: 8,
    paddingLeft: 8,
  },
  attentionItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: 8,
    paddingBottom: 8,
  },
  attentionTitle: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  attentionReason: {
    color: colors.muted,
    fontSize: 7.5,
    marginTop: 2,
  },
  limitationItem: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 1.5,
    marginBottom: 5,
  },
  finalDisclaimer: {
    backgroundColor: colors.paleRed,
    borderColor: "#E6B2B2",
    borderRadius: 5,
    borderWidth: 1,
    color: "#7B2F2F",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    lineHeight: 1.5,
    marginTop: 10,
    padding: 12,
  },
});

function pdfText(value: string) {
  return value
    .replace(/[\u2011\u2013\u2014]/g, "-")
    .replace(/\u2082/g, "2")
    .replace(/\u00b7/g, "-");
}

function breakLongText(value: string) {
  return pdfText(value)
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part)
        ? part
        : part.match(/.{1,28}/g)?.join("\n") ?? part
    )
    .join("");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Vienna",
  }).format(new Date(value));
}

function reviewLabel(field: EffectiveEsgField) {
  const suffix = field.isTemporary && field.reviewStatus !== "pending" ? " (demo)" : "";
  const labels = {
    approved: "Approved",
    edited: "Edited",
    pending: "Pending review",
    rejected: "Rejected",
  } as const;
  return `${labels[field.reviewStatus]}${suffix}`;
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryNumber}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Indicator({ field }: { field: EffectiveEsgField }) {
  const rejected = field.disposition === "rejected";
  const pending = field.disposition === "unverified";
  const missing = field.disposition === "missing";
  const value = field.effectiveValue && field.unit
    ? `${field.displayValue} ${field.unit}`
    : field.displayValue;

  return (
    <View
      wrap={false}
      style={[styles.indicatorCard, rejected ? styles.indicatorRejected : {}]}
    >
      <View style={styles.indicatorTop}>
        <Text style={styles.indicatorLabel}>{pdfText(field.label)}</Text>
        <Text
          style={[
            styles.statusPill,
            rejected ? styles.statusPillRejected : {},
          ]}
        >
          {reviewLabel(field)}
        </Text>
      </View>
      <Text style={styles.indicatorValue}>{pdfText(value)}</Text>
      <Text style={styles.indicatorSubline}>
        {missing
          ? "Not found in the source document"
          : rejected
            ? "Source value shown for traceability only - excluded from accepted findings"
            : pending
              ? "Unverified AI-extracted draft information"
              : field.reviewStatus === "edited"
                ? "Temporary reviewed value"
                : "AI-extracted source value"}
      </Text>

      {field.reviewStatus === "edited" ? (
        <Text style={styles.originalValue}>
          Original AI value: {pdfText(field.sourceDisplayValue)}
          {field.sourceValue && field.unit ? ` ${pdfText(field.unit)}` : ""}
        </Text>
      ) : null}

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Source status</Text>
          <Text style={styles.detailValue}>
            {field.extractionStatus === "found" ? "Found" : "Not found"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Reporting period</Text>
          <Text style={styles.detailValue}>
            {pdfText(field.reportingPeriod ?? "Not specified")}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>AI confidence</Text>
          <Text style={styles.detailValue}>
            {field.confidence ?? "Not available"}
          </Text>
        </View>
      </View>

      {field.evidence.quote ? (
        <Text style={styles.evidence}>
          Source evidence: {pdfText(field.evidence.quote)}
        </Text>
      ) : null}
    </View>
  );
}

function CoverPage({ report }: { report: EsgReportSnapshot }) {
  const rows = [
    ["Source PDF", report.document.fileName],
    ["Generated", formatTimestamp(report.generatedAt)],
    [
      "Reporting period",
      report.commonReportingPeriod ??
        (report.hasMixedReportingPeriods
          ? "Multiple field-specific periods"
          : "Not specified"),
    ],
    ["Extraction ID", report.extraction.id],
  ] as const;

  return (
    <Page key="page-1" size="A4" style={styles.coverPage}>
      <View style={styles.coverTop}>
        <Text style={styles.coverBrand}>envario</Text>
        <Text style={styles.coverBadge}>DRAFT / NOT CERTIFIED</Text>
      </View>
      <View style={styles.coverAccent} />
      <Text style={styles.coverEyebrow}>DOCUMENT-SCOPED ESG DATA</Text>
      <Text style={styles.coverTitle}>DRAFT ESG DATA REPORT</Text>
      <Text style={styles.coverIntro}>
        A structured preview of ESG indicators extracted from one source PDF and the temporary human review decisions active at download time.
      </Text>
      <View style={styles.coverMeta}>
        {rows.map(([label, value], index) => (
          <View
            key={label}
            style={[
              styles.coverMetaRow,
              index === rows.length - 1 ? styles.coverMetaRowLast : {},
            ]}
          >
            <Text style={styles.coverMetaLabel}>{label}</Text>
            <Text style={styles.coverMetaValue}>{breakLongText(value)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.coverDisclaimer}>
        {pdfText(report.disclaimer)} Temporary demo review decisions are held only in browser memory and are not saved to Supabase.
      </Text>
      <Text style={styles.coverPageNumber}>Page 1 of 8</Text>
    </Page>
  );
}

function BodyPage({
  children,
  category = false,
  pageNumber,
}: {
  children: React.ReactNode;
  category?: boolean;
  pageNumber: number;
}) {
  return (
    <Page key={`page-${pageNumber}`} size="A4" style={styles.page} wrap>
      <View style={styles.pageFrame}>
        <View style={styles.body}>
          <Text style={styles.watermark}>DRAFT</Text>
          {category ? null : (
            <View style={styles.header}>
              <Text style={styles.headerBrand}>envario</Text>
              <Text style={styles.headerDraft}>DRAFT ESG DATA REPORT</Text>
            </View>
          )}
          <View style={styles.content}>{children}</View>
          <View style={[styles.footer, category ? styles.categoryFooter : {}]}>
            {category ? null : (
              <Text style={styles.footerText}>Draft ESG data report - not certified</Text>
            )}
            <Text style={styles.footerText}>Page {pageNumber} of 8</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function CategoryContent({
  report,
  category,
  fields,
  part,
  topInset = 0,
}: {
  report: EsgReportSnapshot;
  category: EsgReportSnapshot["sections"][number];
  fields: EffectiveEsgField[];
  part?: string;
  topInset?: number;
}) {
  return (
    <>
      <View style={[styles.section, topInset ? { paddingTop: topInset } : {}]}>
        <View style={styles.categoryHeader}>
          <View>
            <Text style={styles.categoryBrand}>ENVARIO / DRAFT ESG DATA REPORT</Text>
            <Text style={styles.categoryTitle}>
              {category.label}{part ? ` - ${part}` : ""}
            </Text>
          </View>
          <Text style={styles.categoryCount}>
            {category.accepted} accepted / {category.unverified} pending / {category.rejected} rejected / {category.missing} missing
          </Text>
        </View>
        {fields.map((field) => (
          <Indicator key={field.id} field={field} />
        ))}
      </View>
      <Text style={styles.paragraph}>
        Indicators on this page belong only to extraction {report.extraction.id}.
      </Text>
    </>
  );
}

function BodyPages({ report }: { report: EsgReportSnapshot }) {
  const environmental = report.sections.find(
    (section) => section.category === "environmental"
  );
  const social = report.sections.find((section) => section.category === "social");
  const governance = report.sections.find(
    (section) => section.category === "governance"
  );

  if (!environmental || !social || !governance) {
    throw new Error("The report snapshot must contain all ESG categories.");
  }

  return (
    <>
      <BodyPage key="overview-page" pageNumber={2}>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Report scope</Text>
        <Text style={styles.sectionTitle}>Source and methodology</Text>
        <Text style={styles.paragraph}>
          This report uses text extracted from one uploaded PDF, AI-assisted mapping to 12 canonical ESG indicators, and the temporary human review state captured when the download began. It does not combine documents or extraction runs, calculate ESG scores, or assess reporting compliance.
        </Text>
      </View>

      <View style={styles.metadataGrid}>
        <View style={styles.metadataItem}>
          <Text style={styles.metaLabel}>Source PDF</Text>
          <Text style={styles.metaValue}>{breakLongText(report.document.fileName)}</Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metaLabel}>Extraction schema</Text>
          <Text style={styles.metaValue}>{pdfText(report.extraction.schemaVersion)}</Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metaLabel}>Extraction completed</Text>
          <Text style={styles.metaValue}>
            {formatTimestamp(report.extraction.completedAt)}
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metaLabel}>Reporting period</Text>
          <Text style={styles.metaValue}>
            {pdfText(
              report.commonReportingPeriod ??
                (report.hasMixedReportingPeriods
                  ? "Multiple field-specific periods"
                  : "Not specified")
            )}
          </Text>
        </View>
      </View>

      {report.temporaryDecisionCount > 0 ? (
        <Text style={styles.notice}>
          Demo mode: this PDF includes temporary review decisions captured from browser memory. They were not saved to Supabase and will be lost on refresh.
        </Text>
      ) : null}

      <View wrap={false} style={styles.section}>
        <Text style={styles.sectionEyebrow}>Data quality</Text>
        <Text style={styles.sectionTitle}>Source coverage</Text>
        <View style={styles.summaryRow}>
          <SummaryBox label="Total indicators" value={report.total} />
          <SummaryBox label="Found" value={report.found} />
          <SummaryBox label="Not found" value={report.notFound} />
        </View>
      </View>

      <View wrap={false} style={styles.section}>
        <Text style={styles.sectionTitle}>Review summary</Text>
        <View style={styles.summaryRow}>
          <SummaryBox label="Pending" value={report.pending} />
          <SummaryBox label="Approved" value={report.approved} />
          <SummaryBox label="Edited" value={report.edited} />
          <SummaryBox label="Rejected" value={report.rejected} />
        </View>
      </View>
      </BodyPage>

      <BodyPage key="environmental-page-1" pageNumber={3} category>
        <CategoryContent
          report={report}
          category={environmental}
          fields={environmental.fields.slice(0, 3)}
          part="Part 1"
        />
      </BodyPage>
      <BodyPage key="environmental-page-2" pageNumber={4} category>
        <CategoryContent
          report={report}
          category={environmental}
          fields={environmental.fields.slice(3, 6)}
          part="Part 2"
        />
      </BodyPage>
      <BodyPage key="environmental-page-3" pageNumber={5} category>
        <CategoryContent
          report={report}
          category={environmental}
          fields={environmental.fields.slice(6)}
          part="Part 3"
          topInset={24}
        />
      </BodyPage>
      <BodyPage key="social-page" pageNumber={6} category>
        <CategoryContent
          report={report}
          category={social}
          fields={social.fields}
        />
      </BodyPage>
      <BodyPage key="governance-page" pageNumber={7} category>
        <CategoryContent
          report={report}
          category={governance}
          fields={governance.fields}
          topInset={24}
        />
      </BodyPage>

      <BodyPage key="traceability-page" pageNumber={8}>
        <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Traceability</Text>
        <Text style={styles.sectionTitle}>Missing, pending and rejected indicators</Text>
        <Text style={[styles.paragraph, { marginBottom: 10 }]}>
          Pending values are unverified draft information. Rejected values are excluded from accepted findings. Missing indicators have no supported source value.
        </Text>
        {report.attentionFields.length > 0 ? (
          report.attentionFields.map((field) => (
            <View key={field.id} wrap={false} style={styles.attentionItem}>
              <Text style={styles.attentionTitle}>{pdfText(field.label)}</Text>
              <Text style={styles.attentionReason}>
                {field.disposition === "rejected"
                  ? `Rejected - original source value ${pdfText(field.sourceDisplayValue)} is retained for traceability and excluded from accepted findings.`
                  : field.disposition === "missing"
                    ? "Not found in the source document."
                    : `Pending human review - ${pdfText(field.displayValue)}${field.effectiveValue && field.unit ? ` ${pdfText(field.unit)}` : ""} is unverified.`}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.paragraph}>No indicators currently require attention.</Text>
        )}
        </View>

        <View wrap={false} style={styles.section}>
        <Text style={styles.sectionEyebrow}>Important context</Text>
        <Text style={styles.sectionTitle}>Limitations and disclaimer</Text>
        {report.limitations.map((limitation) => (
          <Text key={limitation} style={styles.limitationItem}>
            - {pdfText(limitation)}
          </Text>
        ))}
        <Text style={styles.finalDisclaimer}>{pdfText(report.disclaimer)}</Text>
        </View>
      </BodyPage>
    </>
  );
}

export function EsgReportPdfDocument({
  report,
}: {
  report: EsgReportSnapshot;
}) {
  return (
    <Document
      title="Draft ESG Data Report"
      author="envario"
      subject="Document-scoped draft ESG data report"
      creator="envario"
      producer="envario"
      language="en"
    >
      <CoverPage report={report} />
      <BodyPages report={report} />
    </Document>
  );
}
