/**
 * Array Type Check Utility - Reliable Array Detection
 *
 * This module provides a reference to Array.isArray for consistent array
 * type checking throughout React. Array.isArray is the most reliable way
 * to check if a value is an array, as it works correctly across different
 * execution contexts (frames, workers, etc.).
 *
 * This is preferred over instanceof Array or Object.prototype.toString
 * checks for cross-frame compatibility.
 *
 * @module isArray
 */

/**
 * Array.isArray reference
 *
 * Determines whether the passed value is an Array.
 * Returns true if the value is an Array; otherwise, false.
 *
 * Usage: isArray(value)
 */
const { isArray } = Array;

export default isArray;
