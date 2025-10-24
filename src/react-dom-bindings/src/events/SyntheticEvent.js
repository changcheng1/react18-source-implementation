/**
 * Synthetic Event - Cross-Browser Event Wrapper
 *
 * This module implements React's synthetic event system, which provides a
 * consistent interface for handling events across different browsers.
 * Synthetic events wrap native browser events and normalize their behavior.
 *
 * Key features:
 * - Cross-browser compatibility
 * - Consistent API across different event types
 * - Event pooling for performance (in older React versions)
 * - preventDefault and stopPropagation support
 * - Integration with React's event delegation system
 *
 * @module SyntheticEvent
 */

import assign from "shared/assign";

/**
 * Helper functions for event state tracking
 */
function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

/**
 * Mouse Event Interface
 *
 * Defines the properties that should be copied from native mouse events
 * to synthetic mouse events. This ensures consistent access to mouse
 * position and button information.
 */
const MouseEventInterface = {
  clientX: 0, // X coordinate relative to viewport
  clientY: 0, // Y coordinate relative to viewport
};

/**
 * Create Synthetic Event
 *
 * Factory function that creates synthetic event constructors with specific interfaces.
 * This allows different event types (mouse, keyboard, etc.) to have their own
 * property sets while sharing common synthetic event behavior.
 *
 * @param {Object} inter - Interface object defining which properties to copy from native events
 * @returns {Function} Synthetic event constructor
 */
function createSyntheticEvent(inter) {
  /**
   * Synthetic Base Event Constructor
   *
   * Creates a synthetic event that wraps a native browser event with consistent
   * cross-browser behavior and React-specific functionality.
   *
   * @param {string} reactName - React event prop name (e.g., 'onClick')
   * @param {string} reactEventType - Event type (e.g., 'click')
   * @param {Fiber} targetInst - Fiber instance of the event target
   * @param {Event} nativeEvent - Original native browser event
   * @param {Element} nativeEventTarget - DOM element that triggered the event
   */
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    // React-specific properties
    this._reactName = reactName; // React prop name (onClick, onChange, etc.)
    this.type = reactEventType; // Event type (click, change, etc.)
    this._targetInst = targetInst; // Target fiber instance
    this.nativeEvent = nativeEvent; // Original native event
    this.target = nativeEventTarget; // DOM element that triggered event

    // Copy interface-specific properties from native event
    for (const propName in inter) {
      if (!inter.hasOwnProperty(propName)) {
        continue;
      }
      this[propName] = nativeEvent[propName];
    }

    // Initialize event state tracking
    this.isDefaultPrevented = functionThatReturnsFalse; // Default behavior not prevented
    this.isPropagationStopped = functionThatReturnsFalse; // Propagation not stopped

    return this;
  }
  // Add synthetic event methods to prototype
  assign(SyntheticBaseEvent.prototype, {
    /**
     * Prevent Default
     *
     * Prevents the default browser behavior for this event.
     * Uses cross-browser compatible approach for older browsers.
     */
    preventDefault() {
      const event = this.nativeEvent;
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        // Fallback for older browsers (IE8 and below)
        event.returnValue = false;
      }
      this.isDefaultPrevented = functionThatReturnsTrue;
    },

    /**
     * Stop Propagation
     *
     * Stops the event from bubbling up or capturing down the DOM tree.
     * Uses cross-browser compatible approach for older browsers.
     */
    stopPropagation() {
      const event = this.nativeEvent;
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        // Fallback for older browsers (IE8 and below)
        event.cancelBubble = true;
      }
      this.isPropagationStopped = functionThatReturnsTrue;
    },
  });
  return SyntheticBaseEvent;
}
export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
