/**
 * React Work Tags - Fiber Node Type Definitions
 *
 * This module defines constants for different types of React fiber nodes.
 * Each fiber node has a 'tag' property that identifies what kind of component
 * or element it represents. This enables React to handle different node types
 * appropriately during reconciliation and rendering.
 *
 * The tag system allows React to:
 * - Determine how to process each fiber during work loops
 * - Apply appropriate lifecycle methods and effects
 * - Handle different rendering strategies for different component types
 * - Optimize performance based on component characteristics
 *
 * @module ReactWorkTags
 */

// Component types
export const FunctionComponent = 0; // Function components (hooks-based)
export const ClassComponent = 1; // Class components (lifecycle-based)
export const IndeterminateComponent = 2; // Components whose type is not yet determined

// Host types (DOM-related)
export const HostRoot = 3; // Root container node (div#root)
export const HostComponent = 5; // Native DOM elements (span, div, h1, etc.)
export const HostText = 6; // Text nodes (pure text content)
