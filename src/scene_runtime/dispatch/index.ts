/**
 * dispatch/index.ts
 *
 * Public dispatch API. Re-exports gesture-specific resolvers that translate
 * DOM interaction events to semantic InteractionEvent records.
 *
 * WP-DISPATCH-1 lands the click resolver. WP-CHROME-ADJUST-1A lands the adjust
 * resolver. Additional gestures (drag, select, type) land in later WPs as content requires them.
 */

export { attachClickDispatch } from './click';
export { attachAdjustDispatchToElement, dispatchAdjustCommit } from './adjust';
export type { InteractionEvent } from '../types';
export type { AdjustCommit } from './adjust';
