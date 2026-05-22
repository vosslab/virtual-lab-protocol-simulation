/**
 * contract.ts
 *
 * Scene runtime contract API types. Defines the canonical shape of protocol
 * configuration, scenes, and completion paths that drive the scene runtime spine.
 * These types are generated-data-compatible and integration-ready.
 *
 * No imports from src/scenes/ or src/legacy_*. No runtime code; types only.
 */

export interface CompletionPathBase {
  completionEvent: string;
}

export interface Interaction {
  tool?: string;
  source?: string;
  destination?: string;
  liquid?: string;
  volumeMl?: number;
}

export interface PlateTarget {
  rows?: string[];
  cols?: number[];
  row?: string;
  col?: number;
  wellId?: string;
  liquid?: string;
  volumeMl?: number;
  label?: string;
}

export interface TubeTarget {
  tubeId: string;
}

export interface InteractionSequencePath extends CompletionPathBase {
  kind: "interactionSequence";
  tool?: string;
  source?: string;
  destination?: string;
  interactions?: Interaction[];
  plateTargets?: PlateTarget[];
  tubeTargets?: TubeTarget[];
}

export interface DirectToolPath extends CompletionPathBase {
  kind: "directTool";
  tool: string;
}

export interface ModalPath extends CompletionPathBase {
  kind: "modal";
  openClick: string;
  advanceClick?: string;
}

export interface ModalChoiceConfig {
  id: string;
  text: string;
  correct?: boolean;
  feedback?: string;
}

export interface MultipleChoicePath extends CompletionPathBase {
  kind: "multipleChoice";
  question: string;
  choices: ModalChoiceConfig[];
}

export type CompletionPath =
  | InteractionSequencePath
  | DirectToolPath
  | ModalPath
  | MultipleChoicePath;

export interface ProtocolEntry {
  scene: string;
  step: string;
}

export interface ProtocolStep {
  id: string;
  label: string;
  action?: string;
  why?: string;
  scene: string;
  requiredItems?: string[];
  usedItems?: string[];
  completionPath: CompletionPath;
  errorHints?: Record<string, string>;
  nextId?: string;
  stepIndex?: number;
  partId?: string;
  dayId?: string;
}

export type ProtocolType = "mini_protocol" | "sequence_runner" | "dev_smoke";

export interface LearningBlock {
  objectives: string;
  outcomes: string;
  goals: string;
}

export interface ProtocolPart {
  id: string;
  label: string;
  dayId?: string;
}

export interface ProtocolDay {
  id: string;
  label: string;
}

export interface ProtocolConfig {
  protocol_type: ProtocolType;
  entry: ProtocolEntry;
  id?: string;
  title?: string;
  description?: string;
  learning?: LearningBlock;
  steps?: ProtocolStep[];
  parts?: ProtocolPart[];
  sequence?: string[];
  days?: ProtocolDay[];
}

export interface SceneItem {
  id: string;
  label: string;
  scene: string;
  role?: string;
  asset?: string;
  liquidCapable?: boolean;
  capacityMl?: number;
  allowedLiquids?: string[];
  contains?: string;
  containsAny?: string[];
  visualOnly?: boolean;
}

export interface SceneReagent {
  label: string;
  colorKey: string;
  displayColor: string;
}

export interface SceneConfig {
  id: string;
  items: Record<string, SceneItem>;
  reagents?: Record<string, SceneReagent>;
}

export interface ProtocolCatalogEntry {
  summary: {
    id: string;
    title: string;
    kind: "full_protocol" | "tutorial";
    stepCount: number;
    description?: string;
  };
  steps: ProtocolStep[];
  parts: Record<string, ProtocolPart>;
  days: Record<string, ProtocolDay>;
}

export interface SceneCatalogEntry {
  equipment: Record<string, SceneItem>;
  reagents: Record<string, SceneReagent>;
}
