// Production entry point.
// Re-exports from src/scene_runtime/bundle/entry.ts (the new runtime entry
// after the M2 legacy delete).
//
// Kept as a thin re-export so build_github_pages.sh and tsc see src/main.ts
// at the conventional location while the actual bootstrap logic lives under
// src/scene_runtime/.

export * from "./scene_runtime/bundle/entry.js";
