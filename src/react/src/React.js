/**
 * React Core Package - Main Entry Point
 *
 * This module exports the public React API including hooks and internal utilities.
 * It serves as the main interface that developers interact with when using React.
 *
 * @module React
 */

import {
  useReducer,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "./ReactHooks";
import ReactSharedInternals from "./ReactSharedInternals";

// Export public React API
export {
  useReducer,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  // Internal utilities for React DevTools and other React packages
  ReactSharedInternals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
};
