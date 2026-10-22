import { cp, mkdir, readdir, rm } from "node:fs/promises";

// Next standalone output does not copy static assets automatically.
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });

await rm(".next/standalone/public", { recursive: true, force: true });
await cp("public", ".next/standalone/public", { recursive: true });

// Next may trace local environment files. Runtime secrets must never be artifacts.
for (const entry of await readdir(".next/standalone")) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    await rm(`.next/standalone/${entry}`);
  }
}
