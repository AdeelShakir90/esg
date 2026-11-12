-- READ-ONLY TEST PREPARATION; NOT EXECUTED. ONLY envario-security-test /
-- gkhrtrakukqdhgvucudv, after separate approval of function invocation.
-- Unlike catalog preflights, this WILL CALL the parser on synthetic inputs when
-- manually run. First reconcile the helper-body evidence and review the body as
-- a pure immutable SECURITY INVOKER parser. No member/role helper is called.
-- No app/user/object rows, credentials, JWTs or real identifiers are read.
-- A UUID cast exception aborts this SELECT/transaction: it is NOT caught or
-- silently converted to NULL/PASS. Record SQLSTATE (e.g. 22P02), ROLLBACK, stop.
-- To isolate a failing case later, edit selected_case below and run in a fresh
-- read-only transaction. Without execution, no runtime PASS/error claim is made.
-- Parser result/Storage path shape are NOT authorization: no membership,
-- document metadata, exact document ID, bucket policy or RLS decision is tested.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
options as (select null::text as selected_case),
cases(case_id, input_path, expected_uuid, purpose) as (values
  ('canonical_lowercase', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Accepted v4/RFC variant organization prefix; full policy authorization still untested.'),
  ('canonical_uppercase', 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA/BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB.PDF', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Supplied regex explicitly permits upper-case hex.'),
  ('version_1', 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa/file.pdf', 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa', 'Version 1 is within the parser version range.'),
  ('version_8_variant_b', 'aaaaaaaa-aaaa-8aaa-baaa-aaaaaaaaaaaa/file.pdf', 'aaaaaaaa-aaaa-8aaa-baaa-aaaaaaaaaaaa', 'Version 8 and RFC variant b are within the parser range.'),
  ('legacy_date_prefix', '2026-10-27/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf', null, 'Legacy date prefix does not match UUID grammar.'),
  ('null_input', null, null, 'NULL split/regex condition reaches ELSE NULL; function need not be STRICT.'),
  ('empty_input', '', null, 'Empty first segment fails regex.'),
  ('empty_first_segment', '/file.pdf', null, 'Empty prefix fails regex.'),
  ('slash_only', '/', null, 'No UUID prefix.'),
  ('invalid_hex', 'gaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'Nonhex first character rejected before cast.'),
  ('short_uuid', 'aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'Wrong group length rejected.'),
  ('missing_hyphens', 'aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa/file.pdf', null, 'Parser rejects this even though PostgreSQL accepts some noncanonical UUID spellings.'),
  ('braced_uuid', '{aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa}/file.pdf', null, 'Braces are outside this parser grammar.'),
  ('nil_uuid', '00000000-0000-0000-0000-000000000000/file.pdf', null, 'Valid PostgreSQL UUID but not accepted version/variant grammar.'),
  ('version_0', 'aaaaaaaa-aaaa-0aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'Version 0 excluded by [1-8].'),
  ('version_9', 'aaaaaaaa-aaaa-9aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'Version 9 excluded by [1-8].'),
  ('variant_7', 'aaaaaaaa-aaaa-4aaa-7aaa-aaaaaaaaaaaa/file.pdf', null, 'Non-RFC variant 7 excluded.'),
  ('variant_c', 'aaaaaaaa-aaaa-4aaa-caaa-aaaaaaaaaaaa/file.pdf', null, 'Variant c excluded by [89abAB].'),
  ('extra_segments', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/folder/file.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Parser ignores suffix segments; full Storage CASE denies this shape.'),
  ('non_pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.txt', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Parser does not check MIME/extension; full Storage CASE denies this shape.'),
  ('no_filename', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Only first segment is parsed.'),
  ('bare_uuid', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'split_part returns the entire input when slash is absent.'),
  ('empty_middle_segment', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa//file.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Empty suffix segment is irrelevant to parser, invalid for full policy shape.'),
  ('dotdot_suffix', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../file.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Not filesystem authorization; suffix is ignored by parser.'),
  ('leading_space', ' aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'No prefix trimming in supplied body.'),
  ('trailing_prefix_space', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa /file.pdf', null, 'Anchored regex rejects trailing prefix whitespace.'),
  ('encoded_prefix', '%61aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'No percent decoding in the parser.'),
  ('unicode_prefix', 'áaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf', null, 'Adversarial non-ASCII hex probe; confirm runtime regex/cast behavior.'),
  ('newline_in_prefix', E'aaaaaaaa-aaaa-4aaa-8aaa-aaaa\naaaaaaaa/file.pdf', null, 'Embedded newline cannot form the accepted UUID.'),
  ('newline_after_prefix', E'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\n/file.pdf', null, 'Probe anchored-regex behavior at a trailing newline.'),
  ('oversized_bad_prefix', repeat('z', 4096) || '/file.pdf', null, 'Bounded long malformed first segment; no valid cast input.')
),
selected as materialized (
  select c.* from cases c cross join options o
  where o.selected_case is null or c.case_id = o.selected_case
),
observed as materialized (
  select s.*, public.document_storage_organization_id(s.input_path) as actual_uuid
  from selected s
)
select 'parser_test'::text as category, case_id as object_name,
  'synthetic_first_segment_parse'::text as check_name,
  case when actual_uuid is not distinct from expected_uuid::uuid then 'PASS' else 'FAIL' end as result,
  jsonb_build_object('synthetic_input', input_path, 'expected_uuid', expected_uuid::uuid,
    'actual_uuid', actual_uuid, 'purpose', purpose,
    'matches_full_storage_shape_only', coalesce(input_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$', false),
    'authorization_evaluated', false,
    'case_count_returned', count(*) over (),
    'reason', 'PASS validates this parser output only. Missing/foreign/unowned metadata, wrong document IDs, member/suspended callers and Storage policies still require independent authorization tests.') as details
from observed order by case_id;
rollback;
