import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { listPackageDirectories, reviewPackageDirectory } from "../scripts/review-561-group-javascript-packages.mjs";

function makeFixtureTree() {
  const root = mkdtempSync(join(tmpdir(), "js-normalization-"));
  const clean = join(root, "services", "clean-service");
  mkdirSync(join(clean, "test"), { recursive: true });
  writeFileSync(join(clean, "package.json"), JSON.stringify({
    name: "@561-group/clean-service", version: "1.0.0", type: "module",
    scripts: { test: "node --test test/*.test.mjs" },
  }));
  writeFileSync(join(clean, "test", "clean.test.mjs"), "");
  const drifted = join(root, "services", "drifted-service");
  mkdirSync(drifted, { recursive: true });
  writeFileSync(join(drifted, "package.json"), JSON.stringify({
    name: "@561-group/drifted-service", version: "1.0.0", type: "module",
    packageManager: "pnpm@9.0.0",
    scripts: { verify: "npm run check && npm test" },
  }));
  const skipped = join(root, "node_modules", "vendored");
  mkdirSync(skipped, { recursive: true });
  writeFileSync(join(skipped, "package.json"), "{}");
  return { root, clean, drifted };
}

test("package discovery finds packages and skips node_modules", () => {
  const { root, clean, drifted } = makeFixtureTree();
  assert.deepEqual(listPackageDirectories(root).sort(), [clean, drifted].sort());
});

test("a clean package reports no deviations", () => {
  const { clean } = makeFixtureTree();
  const record = reviewPackageDirectory(clean);
  assert.deepEqual(record.deviations, []);
  assert.equal(record.manifestChanged, false);
});

test("a drifted package reports deviations and stays unchanged without --apply", () => {
  const { drifted } = makeFixtureTree();
  const record = reviewPackageDirectory(drifted);
  const codes = record.deviations.map((deviation) => deviation.code).sort();
  assert.deepEqual(codes, ["manifest-not-normalized", "verification-script-layer"]);
  assert.equal(record.manifestChanged, false);
  assert.ok(JSON.parse(readFileSync(join(drifted, "package.json"), "utf8")).packageManager);
});

test("--apply writes the normalized manifest back", () => {
  const { drifted } = makeFixtureTree();
  const record = reviewPackageDirectory(drifted, { apply: true });
  assert.equal(record.manifestChanged, true);
  const written = JSON.parse(readFileSync(join(drifted, "package.json"), "utf8"));
  assert.equal(written.packageManager, undefined);
  assert.equal(written.name, "@561-group/drifted-service");
});
