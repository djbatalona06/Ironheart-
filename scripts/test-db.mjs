// Runs supabase/tests/*.sql against the local stack. The files use psql features
// (\gset, :'vars'), so this needs psql: the local one, or the one inside the
// Supabase DB container (no local install needed, e.g. on Windows).
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testsDir = join(root, "supabase", "tests");
const dbUrl = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const projectId = (await readFile(join(root, "supabase", "config.toml"), "utf8")).match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
const helper = await readFile(join(testsDir, "_helpers.psql"), "utf8");
const tests = (await readdir(testsDir)).filter((name) => /^\d.*\.sql$/.test(name)).sort();

const psqlArgs = ["-v", "ON_ERROR_STOP=1", "-q", "-f", "-"];
const run = (sql) => {
  const local = spawnSync("psql", [dbUrl, ...psqlArgs], { input: sql, encoding: "utf8" });
  if (local.error?.code !== "ENOENT") return local;
  return spawnSync("docker", ["exec", "-i", `supabase_db_${projectId}`, "psql", "-U", "postgres", ...psqlArgs], { input: sql, encoding: "utf8" });
};

for (const name of tests) {
  console.log(`== ${name}`);
  const source = await readFile(join(testsDir, name), "utf8");
  const result = run(source.replace(/^\\ir _helpers\.psql\s*$/m, () => helper)); // fn: "$$" in a string replacement collapses to "$"
  if (result.error) throw result.error;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr.replace(/^psql:[^\n]*NOTICE:\s*/gm, ""));
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}

if (!process.exitCode) console.log("all SQL tests passed");
