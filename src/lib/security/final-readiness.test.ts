import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const bytes = readFileSync(resolve("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql"));
const migration = bytes.toString("utf8");
const review = readFileSync(resolve("docs/security/STEP-7R12-EXECUTION-READINESS.md"), "utf8");

test("final reviewed artifact retains the exact migration and closed application gate", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), "B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087");
  assert.ok(readFileSync(resolve("src/lib/security/database-verification.ts"), "utf8").includes("DATABASE_READS_VERIFIED = false"));
});

// Boolean model of the supplied CURRENT membership predicate and the added AND
// restriction. This does not execute SQL or certify the remote helper bodies.
for (const callerRole of ["owner", "reviewer", "member", "admin", "unknown"]) {
  for (const status of ["active", "suspended"]) {
    for (const self of [true, false]) {
      test(`current self OR owner/admin policy narrowed: ${status} ${callerRole}, self=${self}`, () => {
        const original = self || (status === "active" && ["owner", "admin"].includes(callerRole));
        const rowRole = self ? callerRole : "reviewer";
        const rowStatus = self ? status : "active";
        const added = self && rowStatus === "active" && ["owner", "reviewer"].includes(rowRole);
        assert.equal(original && added, self && status === "active" && ["owner", "reviewer"].includes(callerRole));
      });
    }
  }
}

test("membership OR is enclosed before AND and introduces no peer-directory permission", () => {
  assert.ok(migration.includes("TO authenticated USING ((%s) AND (%s))"));
  assert.ok(migration.includes("user_id = auth.uid() and status::text = 'active'"));
  assert.ok(migration.includes("role::text in ('owner', 'reviewer')"));
  assert.ok(review.includes("Owners cannot list other members"));
});

test("readiness distinguishes configured platform authority from actual DDL execution", () => {
  assert.ok(review.includes("First actual policy-DDL execution | REVIEW"));
  assert.ok(review.includes("CURRENT state, not recovered historical SQL"));
  assert.ok(review.includes("R9's native-ownership-only Storage FAIL"));
  assert.ok(review.includes("No SET ROLE attempt"));
});

test("postflight and recovery do not restore insecure predicates or enable app access", () => {
  assert.ok(review.includes("STEP-7R8-POSTFLIGHT.sql"));
  assert.ok(review.includes("keep gates closed") || review.includes("Keep gates closed"));
  assert.ok(review.includes("Never revert to broad member predicates"));
  assert.ok(review.includes("separate administrative approval"));
});
