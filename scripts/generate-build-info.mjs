/**
 * Writes build-info.json for the production baseline badge (footer on live site).
 * Run from Jenkins after tests pass and master is updated.
 *
 * Env (optional): BUILD_NUMBER, JOB_NAME, BUILD_URL
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outPath = join(root, "build-info.json");

function git(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function countTestsFromJUnit() {
  const junitPath = join(root, "test-results/junit.xml");
  if (!existsSync(junitPath)) return { passed: null, total: null };
  const xml = readFileSync(junitPath, "utf8");
  const suiteMatch = xml.match(/<testsuites[^>]*tests="(\d+)"[^>]*failures="(\d+)"/);
  if (!suiteMatch) return { passed: null, total: null };
  const total = Number(suiteMatch[1]);
  const failures = Number(suiteMatch[2]);
  return { passed: total - failures, total };
}

const gitShaFull = git("git rev-parse HEAD");
const gitSha = gitShaFull.slice(0, 7);
const branch = process.env.BRANCH_NAME || git("git rev-parse --abbrev-ref HEAD");
const buildNumber = process.env.BUILD_NUMBER || "local";
const now = new Date();
const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
const baseline = `BL-${datePart}-#${buildNumber}`;
const counts = countTestsFromJUnit();

if (existsSync(outPath)) {
  try {
    const existing = JSON.parse(readFileSync(outPath, "utf8"));
    if (existing.gitShaFull === gitShaFull && existing.baseline === baseline) {
      console.log("build-info.json already up to date.");
      process.exit(0);
    }
  } catch {
    // overwrite invalid file
  }
}

const info = {
  baseline,
  gitSha,
  gitShaFull,
  branch: branch.replace(/^origin\//, ""),
  testsPassed: counts.passed,
  testsTotal: counts.total,
  buildNumber: String(buildNumber),
  jenkinsJob: process.env.JOB_NAME || null,
  buildUrl: process.env.BUILD_URL || null,
  deployedAt: now.toISOString(),
  verifiedBy: buildNumber === "local" ? "local dev" : "Jenkins CI",
};

writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`);
console.log(`Wrote ${outPath}: ${baseline} (${gitSha})`);
