/**
 * Object Assign Utility - Cross-Browser Object Property Assignment
 *
 * This module provides a reference to Object.assign for use throughout React.
 * Object.assign is used to copy properties from source objects to a target object.
 *
 * In modern environments, this uses the native Object.assign implementation.
 * This module provides a centralized place to handle any polyfills if needed
 * for older browser support.
 *
 * @module assign
 */

/**
 * Object.assign reference
 *
 * Copies all enumerable own properties from one or more source objects
 * to a target object and returns the target object.
 *
 * Usage: assign(target, source1, source2, ...)
 */
const { assign } = Object;

export default assign;
