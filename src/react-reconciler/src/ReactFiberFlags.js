/**
 * React Fiber Flags - Side Effect Tracking System
 *
 * This module defines binary flags used to track side effects on fiber nodes.
 * Flags are used during the render phase to mark what operations need to be
 * performed during the commit phase. Using binary flags allows efficient
 * bitwise operations for combining and checking multiple effects.
 *
 * The flag system enables:
 * - Efficient side effect tracking during reconciliation
 * - Batching of similar operations during commit
 * - Quick checks for specific types of work needed
 * - Minimal memory overhead for effect tracking
 *
 * @module ReactFiberFlags
 */

// Basic flags for different types of side effects
export const NoFlags = 0b00000000000000000000000000; // 0 - No side effects
export const Placement = 0b00000000000000000000000010; // 2 - Node needs to be inserted
export const Update = 0b00000000000000000000000100; // 4 - Node needs to be updated
export const ChildDeletion = 0b00000000000000000000001000; // 8 - Child nodes need deletion
export const Ref = 0b00000000000000000100000000; // 256 - Ref needs to be attached/detached

// Composite masks for efficient batch processing
export const MutationMask = Placement | Update | ChildDeletion | Ref; // All mutation effects

// Effect-related flags
export const Passive = 0b00000000000000010000000000; // 1024 - Has passive effects (useEffect)
export const LayoutMask = Update; // Effects that run during layout phase
