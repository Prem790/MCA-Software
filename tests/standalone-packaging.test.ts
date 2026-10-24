import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";

const execute = promisify(execFile);
const script = fileURLToPath(
  new URL("../scripts/prepare-standalone.mjs", import.meta.url),
);
const directories: string[] = [];

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "mca-packaging-"));
  directories.push(directory);
  await mkdir(join(directory, ".next/static"), { recursive: true });
  await mkdir(join(directory, ".next/standalone"), { recursive: true });
  await writeFile(join(directory, ".next/static/app.js"), "static fixture");
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

it("packages static output without public assets and removes stale assets and traced secrets", async () => {
  const directory = await fixture();
  const output = join(directory, ".next/standalone");
  await mkdir(join(output, "public"));
  await writeFile(join(output, "public/old.txt"), "retired sample");
  await writeFile(join(output, ".env"), "TEST_FIXTURE=true");
  await writeFile(join(output, ".env.local"), "TEST_FIXTURE=true");

  await execute(process.execPath, [script], { cwd: directory });

  expect(await readFile(join(output, ".next/static/app.js"), "utf8")).toBe(
    "static fixture",
  );
  expect(existsSync(join(output, "public"))).toBe(false);
  expect(existsSync(join(output, ".env"))).toBe(false);
  expect(existsSync(join(output, ".env.local"))).toBe(false);
});

it("still copies public assets when they exist", async () => {
  const directory = await fixture();
  await mkdir(join(directory, "public"));
  await writeFile(join(directory, "public/asset.txt"), "public fixture");

  await execute(process.execPath, [script], { cwd: directory });

  expect(
    await readFile(
      join(directory, ".next/standalone/public/asset.txt"),
      "utf8",
    ),
  ).toBe("public fixture");
});

it("fails when required Next static output is missing", async () => {
  const directory = await fixture();
  await rm(join(directory, ".next/static"), { recursive: true });

  await expect(
    execute(process.execPath, [script], { cwd: directory }),
  ).rejects.toMatchObject({ code: 1 });
});
