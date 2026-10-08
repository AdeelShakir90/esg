import { ValidationView } from "@/components/validation/validation-view";
import { parseValidationDocumentId } from "@/lib/esg/validation-format";

type ValidationPageProps = {
  searchParams: Promise<{
    documentId?: string | string[];
  }>;
};

export default async function ValidationPage({
  searchParams,
}: ValidationPageProps) {
  const { documentId: rawDocumentId } = await searchParams;
  const documentId = parseValidationDocumentId(rawDocumentId);

  return (
    <ValidationView
      key={documentId ?? "missing-document"}
      documentId={documentId}
      invalidDocumentId={rawDocumentId !== undefined && documentId === null}
    />
  );
}
