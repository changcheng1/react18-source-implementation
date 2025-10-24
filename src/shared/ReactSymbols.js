/**
 * React Symbols - Type Identification for React Elements
 *
 * This module defines symbols used throughout React to identify different
 * types of objects and elements. Symbols provide a way to create unique
 * identifiers that cannot be accidentally duplicated.
 *
 * These symbols are used for:
 * - Type checking React elements
 * - Security (preventing XSS through fake React elements)
 * - Internal React object identification
 *
 * @module ReactSymbols
 */

/**
 * REACT_ELEMENT_TYPE Symbol
 *
 * Identifies objects as React elements (virtual DOM nodes).
 * This symbol is attached to all React elements created by JSX or React.createElement.
 * It helps React distinguish between real React elements and plain objects,
 * which is important for security and proper rendering.
 */
export const REACT_ELEMENT_TYPE = Symbol.for("react.element");
