// ============================================
// protocol.ts - Facade to generated protocol data
// ============================================

// Re-export protocol types and data from the generated module.
// This is the single public interface for protocol metadata.
export {
	DEFAULT_PROTOCOL_ID,
	HAS_REQUESTED_PROTOCOL,
	INVALID_REQUESTED_PROTOCOL_ID,
	PROTOCOL_CATALOG,
	PROTOCOL_DAYS,
	PROTOCOL_ID,
	PROTOCOL_IDS,
	PROTOCOL_PARTS,
	PROTOCOL_STEPS,
	PROTOCOL_SUMMARY,
	REQUESTED_PROTOCOL_ID,
	REQUESTED_PROTOCOL_IS_VALID,
	SELECTED_PROTOCOL_ID,
	getRequestedProtocolId,
	isKnownProtocolId,
} from "../generated/protocol_data";
export type {
	ProtocolCatalogEntry,
	ProtocolDay,
	ProtocolId,
	ProtocolPart,
	ProtocolSummary,
} from "../generated/protocol_data";
