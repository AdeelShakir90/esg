# Synthetic fixture review

## Verified identity mapping and provisioning proposal

The operator reported six `VERIFIED` results after creating two synthetic Auth accounts and one active member membership. The private mapping assigns the older account previously labeled outsider to `suspended_a` and the newly created outsider to `outsider`. Keep all UUIDs and credentials in the private mapping.

| Persona | Verification | Membership in the two fixture organizations |
| --- | --- | --- |
| `owner_a` | VERIFIED | A, owner, active |
| `reviewer_a` | VERIFIED | A, reviewer, active |
| `owner_b` | VERIFIED | B, owner, active |
| `suspended_a` | VERIFIED | A, member, suspended |
| `member_a` | VERIFIED | A, member, active |
| `outsider` | VERIFIED | Zero memberships in A or B |

**Current checkpoint, 2026-11-12.** The operator reported successful upload and download integrity verification for A1, B1 and U1, followed by three PASS rows from the full-batch validator in envario-security-test (`gkhrtrakukqdhgvucudv`). The reported counts are three documents, three extractions, three fields and three Storage objects, with `path_count = 1` for each fixture. This establishes the known-present fixture controls for the next phase. The provisioning steps below are historical context. The three canonical predicate FAILs and all open REVIEW items remain recorded. [Live read test procedure](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-LIVE-READ-REVIEW.md)

1. Confirm the project ref and use the integration target guard before constructing an API client. Privately check the proposed test-only login identifiers for collisions. Inventory the non-internal Auth triggers and all direct inbound foreign keys to `auth.users` with the read-only catalog queries below. Review enabled trigger functions privately for automatic profiles, organizations, memberships or external calls. If any side effect conflicts with the proposed two accounts and single membership, resolve it before provisioning.
2. Create the accounts individually using the Auth dashboard or supported `auth.admin.createUser` from a private server-side operator session. Use distinct test-only login identifiers and privately generated passwords. Keep login identifiers, credentials and returned UUIDs in the private fixture manifest. Use a test-only confirmation flow. Record which accounts were created in this run. If the outcome is uncertain, inspect Auth Users before retrying.
3. Check each new account for unexpected memberships or app rows. For the active member, the proposed application insert uses `organization_id = org_a`, `user_id = member_a`'s returned Auth UUID, `role = 'member'` and `status = 'active'`. Verify no existing row for the unique pair before inserting. For the outsider, expect zero memberships in both A and B. Preserve all four verified users and their memberships, including the suspended A membership.
4. Populate the two missing UUIDs in the private verification query. Expect six `VERIFIED` results and share only the persona/result grid. Account existence and membership checks establish fixture eligibility. Real sign-in and RLS checks are a later phase.
5. For separately approved cleanup, remove only the membership created for `member_a` and reconcile any trigger-created rows against the receipts. If later fixture work creates owned objects or application references, remove the recorded objects through the Storage API and resolve dependencies before account deletion. Review all direct inbound Auth FKs and their actions, including organization creator restrictions and uploader `SET NULL`. Use Auth Admin `deleteUser` only for the two newly created accounts and only after confirming their references and side effects. Re-run the private mapping check to confirm the original four users still verify.

```sql
begin transaction read only;
select tgname, tgenabled, tgfoid::regprocedure::text as trigger_function,
       pg_get_triggerdef(oid) as definition
from pg_catalog.pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal
order by tgname;

select conrelid::regclass::text as referencing_table, conname,
       pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where confrelid = 'auth.users'::regclass and contype = 'f'
order by referencing_table, conname;
rollback;
```

These queries return schema metadata. Review definitions privately before sharing any excerpt. This proposal does not resolve the proposed Storage baseline, MAINTAIN or full role-graph limitations.

The reconnaissance summary reports zero documents, extractions, fields and objects in the documents bucket, RLS enabled on six tables, foreign keys and constraints present, and the `protect_objects_delete` and `update_objects_updated_at` Storage triggers. These counts provide the reported starting point for cleanup. Recheck collisions immediately before setup because the counts describe a prior snapshot.

Reviewed all 119 export rows, including 73 columns, 30 constraints, four inbound foreign keys and two triggers. The CSV SHA-256 is `5D3BBB93ED532E661D0BE9F0099126A09F0CC9966B539944BC73C3388792AE7F`. [Schema export](C:/Users/adeel/esg/docs/security/rls-synthetic-schema-preflight-results.csv)

| Fixture | Validation against the export |
| --- | --- |
| Organizations | Required `name`, `slug` and `created_by`. For new fixtures, use names `Security RLS Synthetic A` and `Security RLS Synthetic B`, unique slugs `security-rls-synthetic-a` and `security-rls-synthetic-b`, and the respective owner’s Auth UUID. Verify slug availability. UUID and timestamps have defaults. The creator FK uses `ON DELETE RESTRICT`. |
| Memberships | Insert `organization_id`, `user_id`, `role` and explicit `status` if new rows are later approved. Default status is `invited`, so supply `active` or `suspended` as planned. The pair `(organization_id, user_id)` is unique. Both FKs cascade. The constraint permits `admin` as well as owner, reviewer and member. The minimal fixture matrix leaves admin and invited cases for additional coverage. |
| Documents | `file_name`, `storage_path`, `file_type` and bigint `file_size` are required. `uploaded` matches the status default, and omitted `extraction_status` defaults to `pending`. `organization_id` is nullable and restricts organization deletion. `uploaded_by` is nullable and its Auth FK uses `ON DELETE SET NULL`. The draft now sets A1/B1 uploaders to the respective Auth owners and leaves both ownership fields NULL on U1. |
| Extractions | Each row references its exact document. `completed` requires a non-null `completed_at` and NULL `error`, which the draft supplies through `now()` and omission. The required version/provider/model fields are populated. The document FK cascades. |
| Fields | Each row references its exact extraction and uses allowed `electricity_consumption`, `environmental` and `not_found` values. The omitted evidence/value fields satisfy the NULL checks. Default validation status is `pending`. One field per extraction satisfies the unique pair constraint. The extraction FK cascades. |
| Storage | `bucket_id` references `storage.buckets`, and `path_tokens` is a stored generated `text[]`. Both reported triggers are enabled in origin mode and reference `storage.protect_delete()` and `storage.update_updated_at_column()`. The CSV establishes their presence and function names. Their bodies and the complete inbound dependency graph for `auth.users` are outside this export. |

1. **Map the six Auth identities and two organizations.** Use the actual Auth UUID for each persona. Reuse verified synthetic identities where available. For missing users, a separately approved administrator can use the Supabase Auth Admin API `createUser`, record the returned ID and keep credentials private. Review any `auth.users` triggers first since account creation can create application rows. The two organizations and five memberships must exist before document setup. Use the validated columns above for any later approved new application rows. Leave the outsider without a membership in either organization.
2. **Verify the private manifest.** Fill the NULL parameters in a private copy of the read-only admission check. It requires six distinct Auth parents and five exact memberships across A and B. A second membership for any mapped persona in A or B stops the check. The check reports a summary without UUIDs and checks the nine reserved public row IDs and ten Storage paths for collisions. An Auth row establishes FK eligibility. The later real-session tests establish sign-in behavior. [Admission SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURE-ADMISSION.sql)
3. **Review the nine public rows.** Reserve A1, B1 and U1 plus one extraction and one field each. U1 has NULL organization ownership. Keep the deterministic ID ranges already in the fixtures draft and enter the exact synthetic PDF byte count. Confirm both positive document paths and the unowned path match the Storage manifest. Any unresolved schema discrepancy blocks persistence. The reviewed draft defaults to ROLLBACK. [Fixture SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURES-REVIEW.sql)
4. **Use the supported Storage API.** Verify the project ref and URL with the existing integration target guard before client creation. The separately approved setup operator uploads only the ten manifest paths using the bucket's `upload` method with `upsert: false`. Record which uploads succeeded and the byte hashes. A name rejected by Storage is a setup outcome. Test RLS denial only for objects whose presence the setup operator verified. Keep `protect_objects_delete` and `update_objects_updated_at` enabled and leave the managed `storage.objects` table to the Storage service. Review the separate exact-path wrong-ID and wrong-organization pairs before extending the minimal fixtures. [Path and test matrix](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-TEST-PLAN.md)
5. **Check roles with positive controls.** Anonymous, active member, suspended member and outsider see no protected rows or files. Owner A and reviewer A see A1 and its children and object. Owner B sees B1 and its children and object. All callers are denied U1 and its descendants and object. Verify self-only membership visibility, cross-organization UUID probes, exact Storage list results and direct downloads using real sessions. The read-only SQL template checks exact fixture row sets under simulated claims. Storage HTTP behavior and session authentication require the separate API checks. [Role simulation SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-ROLE-READS.sql)
6. **Clean up in dependency order.** Remove only recorded successful uploads using the supported Storage `remove` API, then verify their absence. The managed deletion trigger and file lifecycle are reasons to route object removal through the Storage API. Remove exact synthetic fields, extractions and documents in that order. For any newly created memberships and organizations, review inbound FKs and delete only recorded fixture rows. Delete newly created Auth identities last through Auth Admin `deleteUser` after confirming no remaining references or owned objects. Preserve reused users and organizations. Reconcile any partial operation using the private receipts and compare counts with the starting snapshot. [Public cleanup SQL](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-CLEANUP-REVIEW.sql)

The original exact FAIL results and separate accepted semantic finding remain part of the evidence. The proposed Storage baseline, pre-migration MAINTAIN evidence and full role graph remain unresolved. Effective SQL privileges, real-session RLS, managed Storage write policies and signed URL behavior require distinct evidence. This phase is review only. Application reads and writes remain disabled.
