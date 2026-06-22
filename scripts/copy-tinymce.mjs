// Copies the self-hosted TinyMCE assets from node_modules into public/ so they
// are served at /tinymce/*. Runs in postinstall. Cross-platform (uses Node fs,
// not `cp`), and never fails the install if the source is missing.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = join("node_modules", "tinymce");
const dest = join("public", "tinymce");

if (!existsSync(src)) {
  console.warn("[copy-tinymce] node_modules/tinymce not found; skipping.");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-tinymce] copied tinymce -> public/tinymce");
