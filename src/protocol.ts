// ============================================
// protocol.ts - Facade to generated protocol data
// ============================================

// Re-export protocol types and data from the generated module.
// This is the single public interface for protocol metadata.
export { PROTOCOL_ID, PROTOCOL_STEPS } from "../generated/protocol_data";
export type { ProtocolDay, ProtocolPart } from "../generated/protocol_data";
