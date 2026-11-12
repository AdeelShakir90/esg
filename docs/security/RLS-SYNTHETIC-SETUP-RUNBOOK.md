# A1, B1 and U1 setup execution review

The operator reported admission PASS on envario-security-test (`gkhrtrakukqdhgvucudv`), with counts `0 / 0 / 0 / 0`, six verified personas, schema MATCH, the private PDF-only 5 MiB bucket and clear reserved IDs and paths. This runbook awaits separate execution approval for nine public rows and three Storage objects. Keep UUIDs and credentials in the operator's private copies. Application reads and writes remain disabled.

## Fixed payload and exact sequence

Use `output/pdf/envario-rls-synthetic.pdf` for all three objects. Its measured size is **1,638 bytes** and SHA-256 is `113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A`. Recompute both before setup and stop on a mismatch. The PDF contains only synthetic text. The SQL stores 1,638 as each document's `file_size`.

The persistent SQL transaction reuses the reviewed insert statements. It inserts three documents, then their three completed ESG extractions, then their three `not_found` fields. Each group must affect exactly three rows. The transaction repeats the six Auth parent and membership checks, requires full executor visibility and the zero baseline, and stops on reserved ID collisions. The operator flag defaults to false and all eight private UUIDs are NULL. After approval, populate them from the verified private mapping and set the flag after confirming the isolated project. Review the populated transaction before running the full block through `COMMIT`. [Exact nine-row SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURES-SETUP.sql)

| Fixture | Document UUID | Organization and uploader | Object path in `documents` |
| --- | --- | --- | --- |
| A1 | `70170000-0000-4000-8000-000000000001` | A and owner A | `<org_a>/70170000-0000-4000-8000-000000000001.pdf` |
| B1 | `70170000-0000-4000-8000-000000000002` | B and owner B | `<org_b>/70170000-0000-4000-8000-000000000002.pdf` |
| U1 | `70170000-0000-4000-8000-000000000003` | NULL and NULL | `<org_a>/70170000-0000-4000-8000-000000000003.pdf` |

1. Confirm the project and rerun the read-only admission if the prior snapshot is no longer current. Keep concurrent fixture operations paused. Record the exact populated SQL and PDF checksum privately. [Admission SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURE-ADMISSION.sql)
2. After separate approval, run the persistent SQL once as `postgres`. A pre-commit error rolls back all inserts. Stop on any error and issue `ROLLBACK` if the session still holds a failed transaction. If commit status is uncertain, inspect the exact fixture IDs before retrying.
3. Run the read-only validation query as `postgres` with the same organization and owner UUIDs. Set `target_confirmed = true` and leave `expect_uploaded_objects = false`. Require all three rows to PASS with counts `3 / 3 / 3 / 0` and zero per-path counts before uploading. This checks each exact ID, parent, ownership value, path, byte count and expected state. [Validation SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURES-VALIDATE.sql)
4. Upload and verify the objects as described below. Then rerun the validation query with `expect_uploaded_objects = true`. Require three PASS rows, one object per exact path and counts `3 / 3 / 3 / 3`. Rerun the private identity verification and require six VERIFIED rows. Report only fixture labels, result values and counts. Stop for review before role simulations or real-session reads.

## Storage API procedure

In a private server-side setup session, verify explicit integration opt-in, ref `gkhrtrakukqdhgvucudv` and URL `https://gkhrtrakukqdhgvucudv.supabase.co` through `requireIntegrationTarget` before constructing the client. Use authorized administrative credentials for that project and keep them out of code, shared logs and screenshots. Load the fixed PDF into `pdfBytes` and verify the byte count and SHA-256 locally. Substitute the same private organization UUIDs for the paths in the table.

For each path in order A1, B1, U1, use the supported Storage API with the existing private bucket:

```ts
const bucket = client.storage.from('documents');
const { data, error } = await bucket.upload(path, pdfBytes, {
  contentType: 'application/pdf',
  upsert: false,
});
if (error || data?.path !== path) throw new Error('Stop and reconcile the upload receipt');

const { data: object, error: downloadError } = await bucket.download(path);
if (downloadError || !object) throw new Error('Stop and reconcile the download');
const bytes = Buffer.from(await object.arrayBuffer());
const hash = createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (object.type !== 'application/pdf' || bytes.length !== 1638 ||
    hash !== '113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A') {
  throw new Error('Stop: fixture content does not match');
}
```

Use `createHash` from `node:crypto`. Record each successful upload response and exact path privately before the download check, so cleanup can reconcile an interrupted verification. Stop on the first error and check the actual object and bytes before deciding whether to retry. A colliding object stays untouched. These admin downloads establish fixture presence and byte integrity. Role-based authorization remains a separate test.

## Recovery and cleanup

The SQL transaction and Storage API have separate commit boundaries. Once the SQL commits, `ROLLBACK` cannot undo it. If a subsequent upload or check fails, preserve the receipts and review the partial state before continuing or cleaning up. Require separate cleanup approval. Match each recorded object to its receipt and hash, remove only those exact paths through the Storage API, and verify absence. Then use the existing guarded cleanup transaction to remove only the three fields, three extractions and three documents in dependency order. Review the populated persistent cleanup copy because the workspace draft defaults to rollback. Missing or changed metadata or extra dependents require reconciliation first. Finally compare counts with the admission baseline and verify the six identities. [Cleanup SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-CLEANUP-REVIEW.sql)

The remaining path-guard fixtures, role simulations, live RLS tests and application enablement require separate review. Original exact FAILs and unresolved Storage baseline, MAINTAIN and role-graph REVIEW findings remain in the evidence.
