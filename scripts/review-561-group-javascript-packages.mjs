#!/usr/bin/env node
import { createWriteStream, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { canonical, parse } from "@red-cup-engineering/json-codec-service";
import { listPackageFiles, reviewJsnodePackage } from "@red-cup-engineering/review-jsnode-package-service";

const PRUNED_DIRECTORIES = new Set(["node_modules", "legacy", "data", ".git"]);

/** Lists every directory beneath root that holds a package.json. */
export function listPackageDirectories(root) {
  const found = [];
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((entry) => entry.isFile() && entry.name === "package.json")) found.push(directory);
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink() && !PRUNED_DIRECTORIES.has(entry.name)) walk(join(directory, entry.name));
    }
  };
  walk(root);
  return found;
}

/** Reviews one package directory; optionally writes the normalized manifest back. */
export function reviewPackageDirectory(directory, { apply = false } = {}) {
  const manifestPath = join(directory, "package.json");
  let manifest;
  try {
    manifest = parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return { packageDirectory: directory, deviations: [{ code: "manifest-unreadable", detail: error instanceof Error ? error.message : String(error) }], manifestChanged: false };
  }
  const review = reviewJsnodePackage({ manifest, files: listPackageFiles(directory) });
  const changed = review.deviations.some((deviation) => deviation.code === "manifest-not-normalized");
  if (apply && changed) writeFileSync(manifestPath, `${canonical(review.normalizedManifest)}\n`);
  return { packageDirectory: directory, deviations: review.deviations, manifestChanged: apply && changed };
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      root: { type: "string" },
      "package-list": { type: "string" },
      offset: { type: "string", default: "0" },
      count: { type: "string" },
      apply: { type: "boolean", default: false },
      output: { type: "string" },
    },
  });
  if (!values.root && !values["package-list"]) {
    process.stderr.write("usage: review-561-group-javascript-packages (--root DIR | --package-list FILE [--offset N] [--count N]) [--apply] [--output PATH]\n");
    process.exit(1);
  }
  // On slow filesystems (WSL), prefer --package-list: one package directory per line,
  // no tree walk. --offset/--count bound one chunk of the list.
  let directories;
  if (values["package-list"]) {
    const lines = readFileSync(values["package-list"], "utf8").split("\n").filter(Boolean);
    const offset = Number(values.offset);
    directories = lines.slice(offset, values.count === undefined ? undefined : offset + Number(values.count));
  } else {
    directories = listPackageDirectories(values.root);
  }
  const out = values.output ? createWriteStream(values.output) : process.stdout;
  const counts = new Map();
  let reviewed = 0;
  for (const directory of directories) {
    const record = reviewPackageDirectory(directory, { apply: values.apply });
    reviewed += 1;
    for (const deviation of record.deviations) counts.set(deviation.code, (counts.get(deviation.code) ?? 0) + 1);
    out.write(`${canonical(record)}\n`);
  }
  const summary = [...counts.entries()].map(([code, count]) => `${code}: ${count}`).join(", ");
  process.stderr.write(`reviewed ${reviewed} packages${summary ? ` — ${summary}` : " — no deviations"}\n`);
}
