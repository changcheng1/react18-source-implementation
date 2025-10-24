/**
 * React Shared Internals - Internal API Access Point
 *
 * This module provides access to React's internal APIs that need to be shared
 * between different React packages (react, react-dom, react-reconciler, etc.).
 * It serves as a controlled interface for internal communication.
 *
 * These internals are:
 * - Not part of the public API
 * - Subject to change between versions
 * - Used for coordination between React packages
 * - Accessed via the __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED export
 *
 * @module ReactSharedInternals
 */

import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

/**
 * React Shared Internals Object
 *
 * Contains internal React APIs that need to be accessible across packages.
 * Currently includes the dispatcher system for hooks management.
 */
const ReactSharedInternals = {
  ReactCurrentDispatcher, // Hooks dispatcher management
};

export default ReactSharedInternals;
