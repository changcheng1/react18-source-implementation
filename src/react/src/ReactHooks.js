/**
 * React Hooks - Public API Layer
 *
 * This module provides the public hooks API that developers use in their components.
 * It uses the dispatcher pattern to delegate to different implementations based on
 * the current rendering phase (mount vs update).
 *
 * @module ReactHooks
 */

import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

/**
 * Resolve Current Dispatcher
 *
 * Gets the current dispatcher implementation. The dispatcher changes based on
 * the rendering phase - different implementations for mount and update phases.
 *
 * @returns {Object} Current dispatcher with hook implementations
 */
function resolveDispatcher() {
  return ReactCurrentDispatcher.current;
}

/**
 * useReducer Hook
 *
 * Hook for managing complex state logic. Similar to useState but accepts a reducer
 * function that specifies how the state gets updated in response to actions.
 *
 * @param {Function} reducer - Reducer function that takes (state, action) and returns new state
 * @param {any} initialArg - Initial state value
 * @returns {Array} Array containing [state, dispatch] where dispatch triggers state updates
 */
export function useReducer(reducer, initialArg) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg);
}

/**
 * useState Hook
 *
 * Hook for managing component state. Returns current state value and a function
 * to update it. State updates are asynchronous and may be batched.
 *
 * @param {any} initialState - Initial state value or function that returns initial state
 * @returns {Array} Array containing [state, setState] where setState updates the state
 */
export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

/**
 * useEffect Hook
 *
 * Hook for performing side effects in function components. Runs after render
 * and can optionally clean up before the next effect or component unmount.
 *
 * @param {Function} create - Effect function, optionally returns cleanup function
 * @param {Array} deps - Dependency array, effect runs when dependencies change
 */
export function useEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

/**
 * useLayoutEffect Hook
 *
 * Similar to useEffect but runs synchronously after all DOM mutations.
 * Use this for DOM measurements or synchronous DOM updates.
 *
 * @param {Function} create - Effect function, optionally returns cleanup function
 * @param {Array} deps - Dependency array, effect runs when dependencies change
 */
export function useLayoutEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps);
}

/**
 * useRef Hook
 *
 * Hook for creating a mutable ref object. The ref object persists across renders
 * and doesn't cause re-renders when its value changes.
 *
 * @param {any} initialValue - Initial value for the ref.current property
 * @returns {Object} Ref object with current property
 */
export function useRef(initialValue) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}
