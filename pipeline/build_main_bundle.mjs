// pipeline/build_main_bundle.mjs
// Bundles the two dist entry points into dist/ using esbuild with
// esbuild-plugin-solid so JSX gets the proper Solid compiler transform
// (fine-grained reactivity, not h-variant call-once semantics).
//
// Two bundles:
//   src/launcher_entry.tsx       -> dist/launcher.js
//   src/protocol_host_entry.tsx  -> dist/protocol_host.js
//
// Set BUILD_METAFILE=1 to also emit dist/<name>.meta.json for bundle
// analysis (top-imports audit). Default off; does not break callers.
//
// Invoked by build_github_pages.sh after typecheck.

import * as esbuild from "esbuild";
import fs from "node:fs";
import { solidPlugin } from "esbuild-plugin-solid";

const writeMeta = process.env.BUILD_METAFILE === "1";

const targets = [
  { entry: "src/launcher_entry.tsx", out: "dist/launcher.js" },
  { entry: "src/protocol_host_entry.tsx", out: "dist/protocol_host.js" },
];

for (const t of targets) {
  const result = await esbuild.build({
    entryPoints: [t.entry],
    bundle: true,
    format: "esm",
    target: "es2020",
    platform: "browser",
    minify: true,
    sourcemap: true,
    outfile: t.out,
    plugins: [solidPlugin()],
    metafile: writeMeta,
    logLevel: "info",
  });
  if (result.errors.length > 0) {
    process.exit(1);
  }
  if (writeMeta && result.metafile) {
    const metaPath = t.out.replace(/\.js$/, ".meta.json");
    fs.writeFileSync(metaPath, JSON.stringify(result.metafile));
  }
}
