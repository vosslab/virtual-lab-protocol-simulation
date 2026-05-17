/**
 * css.d.ts
 *
 * Type declarations for CSS imports in the scene runtime.
 * Allows TypeScript to accept .css imports for bundler-side CSS processing.
 */

declare module '*.css' {
	const content: string;
	export default content;
}
