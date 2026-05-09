//============================================
// legacy_tokens.ts
// Construct compatibility interaction tokens from actor/liquid pairs.
// Token format: '<base_tool>_with_<liquid>' (e.g., 'serological_pipette_with_pbs').
// These tokens are consumed by token-shaped switches in the hood and bench
// adapters' interaction-result dispatch (see callers of buildLegacyToken).
// When the adapter responsibility-seam decomposition lands (see docs/ROADMAP.md)
// and those switches move to completionPath dispatch, this module's call sites
// reach zero and the file can be deleted.
//============================================

//============================================
// buildLegacyToken(actor, liquid): string | null
// Construct a legacy token string from an actor (tool) and liquid type.
// Used by the legacy interaction ladder before the K2 completionPath
// dispatch fully replaced these paths. Routes to appropriate tool variants.
//============================================
export function buildLegacyToken(actor: string | null, liquid: string | null): string | null {
	// Default tool when caller did not resolve a held tool. Most call sites pass
	// canonicalTool() output which falls back to serological_pipette for any
	// pipette-shaped held item; mirror that default here so the two paths agree.
	const tool = actor || 'serological_pipette';
	const legacyToken = liquid === 'pbs'     ? `${tool}_with_pbs`
					  : liquid === 'trypsin' ? `${tool}_with_trypsin`
					  : liquid === 'media'   ? `${tool}_with_media`
					  : liquid === 'cells'   ? `${tool}_with_cells`
					  : null;
	return legacyToken;
}
