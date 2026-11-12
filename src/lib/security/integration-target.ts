export const SECURITY_TEST_PROJECT_REF = "gkhrtrakukqdhgvucudv";
const SECURITY_TEST_URL = `https://${SECURITY_TEST_PROJECT_REF}.supabase.co`;

export type IntegrationTargetConfiguration = {
  optIn?: string;
  projectRef?: string;
  supabaseUrl?: string;
};

/**
 * Pure preflight. No process.env, dotenv, credentials, clients or network access.
 * A future runner must call this BEFORE constructing any client or doing I/O.
 * Only explicit test configuration belongs here; never fall back to app settings.
 */
export function requireIntegrationTarget(config: IntegrationTargetConfiguration) {
  if (
    config.optIn !== "true" ||
    config.projectRef !== SECURITY_TEST_PROJECT_REF ||
    (config.supabaseUrl !== SECURITY_TEST_URL &&
      config.supabaseUrl !== `${SECURITY_TEST_URL}/`)
  ) {
    // Do not echo supplied URLs: they might contain credentials or tokens.
    throw new Error("Security integration tests require explicit approved target configuration.");
  }
  return Object.freeze({
    projectRef: SECURITY_TEST_PROJECT_REF,
    supabaseUrl: SECURITY_TEST_URL,
  });
}
