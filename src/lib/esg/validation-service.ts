import "server-only";
import { getAuthorizedValidation } from "../security/read-server";

export async function getValidationData(documentId: string) {
  return (await getAuthorizedValidation(documentId)).validation;
}
