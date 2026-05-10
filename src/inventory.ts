// ============================================
// inventory.ts - Facade to generated inventory data
// ============================================

// Re-export inventory types and data from the generated module.
// This is the single public interface for inventory metadata.
export {
	EQUIPMENT,
	REAGENTS,
	type InventoryItem,
	type InventoryReagent,
} from "../generated/inventory_data";
