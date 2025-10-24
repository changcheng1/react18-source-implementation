/**
 * React Hook Effect Tags - Effect Type Classification
 *
 * This module defines binary flags for classifying different types of hook effects.
 * These tags are used to determine when and how effects should be executed during
 * the commit phase. The binary flag system allows efficient combination and
 * checking of multiple effect types.
 *
 * Effect execution timing:
 * - Layout effects: Run synchronously after DOM mutations (useLayoutEffect)
 * - Passive effects: Run asynchronously after paint (useEffect)
 *
 * @module ReactHookEffectTags
 */

export const NoFlags = 0b0000; // No effect flags

// Core effect control flag
export const HasEffect = 0b0001; // 1 - Effect should be executed (must be present)

// Effect timing flags
export const Layout = 0b0100; // 4 - Layout effect (useLayoutEffect)
//     Runs synchronously before browser paint
//     Similar to microtask timing

export const Passive = 0b1000; // 8 - Passive effect (useEffect)
//     Runs asynchronously after browser paint
//     Similar to macrotask timing
