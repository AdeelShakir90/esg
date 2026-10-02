"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ValidationFile = {
  fileName: string;
  category: string;
  confidence: string;
  fields: {
    label: string;
    value: string;
  }[];
};

export default function ValidationPage() {
  const searchParams = useSearchParams();

  const extractedFiles: ValidationFile[] = [
    {
      fileName: "Nachhaltigkeitsbericht_Entwurf.pdf",
      category: "ESG / Sustainability Report",
      confidence: "90%",
      fields: [
        { label: "Report type", value: "Sustainability report draft" },
        { label: "Environmental section", value: "Found" },
        { label: "Social section", value: "Found" },
        { label: "Governance section", value: "Found" },
      ],
    },
    {
      fileName: "Energie_2025_Q1-Q2.xlsx",
      category: "Environmental / Energy",
      confidence: "92%",
      fields: [
        { label: "Electricity consumption", value: "42,500 kWh" },
        { label: "Thermal energy", value: "18,200 kWh" },
        { label: "Reporting period", value: "Q1–Q2 2025" },
        { label: "Detected unit", value: "kWh" },
      ],
    },
    {
      fileName: "Emissionen_Scope1_2.csv",
      category: "Environmental / Emissions",
      confidence: "91%",
      fields: [
        { label: "Scope 1 emissions", value: "18.6 tCO₂e" },
        { label: "Scope 2 emissions", value: "42.1 tCO₂e" },
        { label: "Reporting year", value: "2025" },
        { label: "Emission unit", value: "tCO₂e" },
      ],
    },
    {
      fileName: "HR_Policies_de.pdf",
      category: "Social / HR",
      confidence: "87%",
      fields: [
        { label: "Employee training policy", value: "Found" },
        { label: "Health & safety policy", value: "Found" },
        { label: "Diversity policy", value: "Found" },
        { label: "Employee handbook language", value: "German" },
      ],
    },
    {
      fileName: "Lieferanten_Übersicht.xlsx",
      category: "Governance / Supply Chain",
      confidence: "84%",
      fields: [
        { label: "Supplier list", value: "Found" },
        { label: "Supplier country data", value: "Found" },
        { label: "Risk classification", value: "Partially found" },
        { label: "Review status", value: "Needs validation" },
      ],
    },
  ];

const selectedFileNames = searchParams.get("files")
  ? decodeURIComponent(searchParams.get("files") || "").split(",")
  : [];

const selectedFileName = searchParams.get("file") || "";

 const matchedFiles =
  selectedFileNames.length > 0
    ? extractedFiles.filter((file) => selectedFileNames.includes(file.fileName))
    : selectedFileName
    ? extractedFiles.filter((file) => file.fileName === selectedFileName)
    : [];

const visibleFiles =
  matchedFiles.length > 0
    ? matchedFiles
    : [
        {
          fileName: selectedFileName || "Uploaded document",
          category: "Detected ESG Document",
          confidence: "86%",
          fields: [
            { label: "Document type", value: "Uploaded file" },
            { label: "ESG relevance", value: "Detected" },
            { label: "Extraction status", value: "Ready for validation" },
            { label: "Manual review", value: "Recommended" },
          ],
        },
      ];

  const totalFields = visibleFiles.reduce(
    (total, file) => total + file.fields.length,
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="envario logo" className="h-8 w-8 rounded-md" />
            <span className="text-lg font-semibold tracking-tight">
              en<span className="text-primary">vario</span>
            </span>
          </div>

          <Link
            href="/upload"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary/60"
          >
            Back to Upload
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 md:px-8 lg:px-10">
        <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Validation Step
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Validate Extracted Data
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Please review the data extracted from your uploaded document.
                Confirm that the values are correct before continuing to AI
                analysis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card px-4 py-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-foreground">
                  {visibleFiles.length}
                </div>
                <div className="text-xs text-muted-foreground">Files</div>
              </div>

              <div className="rounded-2xl border bg-card px-4 py-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-foreground">
                  {totalFields}
                </div>
                <div className="text-xs text-muted-foreground">Fields</div>
              </div>

              <div className="rounded-2xl border bg-card px-4 py-3 text-center shadow-sm col-span-2 sm:col-span-1">
                <div className="text-2xl font-bold text-foreground">
                  {visibleFiles[0].confidence}
                </div>
                <div className="text-xs text-muted-foreground">Confidence</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {visibleFiles.map((file, index) => (
            <article
              key={file.fileName}
              className="group rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {file.category}
                    </span>

                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {file.fileName}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      AI extracted the following information from this document.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {file.confidence} confidence
                  </span>
                </div>

                <div className="space-y-3 rounded-2xl bg-secondary/30 p-4">
                  {file.fields.map((field) => (
                    <div
                      key={field.label}
                      className="flex flex-col gap-1 rounded-xl border border-border/50 bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {field.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90">
                    Confirm Data
                  </button>
                  <button className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-secondary/60">
                    Edit Extracted Data
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-background/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Ready to continue?
            </h2>
            <p className="text-sm text-muted-foreground">
              Once the extracted data is validated, the AI can generate ESG
              insights and reports.
            </p>
          </div>

          <Link
            href="/processing"
            className="rounded-xl bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90"
          >
            Confirm All & Continue
          </Link>
        </section>
      </div>
    </main>
  );
}
