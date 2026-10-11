import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testsDir = join(root, "supabase", "tests");
const cliPath = join(root, "node_modules", "supabase", "dist", "supabase.js");
const helper = await readFile(join(testsDir, "_helpers.psql"), "utf8");
const tests = (await readdir(testsDir))
  .filter((name) => /^\d.*\.sql$/.test(name))
  .sort();
const tempDir = await mkdtemp(join(tmpdir(), "ironheart-db-tests-"));

try {
  for (const name of tests) {
    console.log(`== ${name}`);
    const source = await readFile(join(testsDir, name), "utf8");
    const sql = source.replace(/^\\ir _helpers\.psql\s*$/m, helper);
    const sqlFile = join(tempDir, name);
    await writeFile(sqlFile, sql, "utf8");

    const result = spawnSync(
      process.execPath,
      [cliPath, "db", "query", "--local", "--file", sqlFile],
      { cwd: root, encoding: "utf8" },
    );

    if (result.error) throw result.error;
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (result.status !== 0) break;
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (!process.exitCode) console.log("all SQL tests passed");
