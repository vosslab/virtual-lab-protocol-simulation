// ============================================
// src/brands.ts - branded id constructors
// ============================================
// Placeholder. The legacy runtime contract uses plain string-literal
// unions for ids (see src/types/ids.ts). Branded id wrappers are an
// M7 type-tightening concern; introducing them now would violate the
// "mechanical move first" rule of M1.
//
// When M7 lands, brand constructors live here and nowhere else; every
// `as VesselId` / `as ToolId` cast in the runtime must route through
// this file.

export {};
