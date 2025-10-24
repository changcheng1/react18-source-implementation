/**
 * React DOM Root - Client-side Rendering Entry Point
 *
 * This module implements the new React 18 createRoot API, which replaces
 * the legacy ReactDOM.render method. It provides better support for
 * concurrent features and improved error handling.
 *
 * @module ReactDOMRoot
 */

import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/ReactFiberReconciler";
import { listenToAllSupportedEvents } from "react-dom-bindings/src/events/DOMPluginEventSystem";

/**
 * ReactDOMRoot Constructor
 *
 * Creates a ReactDOMRoot instance that wraps the internal fiber root.
 * This provides the public API for rendering React elements.
 *
 * @param {FiberRoot} internalRoot - Internal fiber root node
 */
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

/**
 * Render Method
 *
 * Renders React elements into the root container. This method can be called
 * multiple times to update the rendered content. It clears the container
 * and renders the new content.
 *
 * @param {ReactElement} children - React elements to render
 */
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;

  // Clear existing content (in production, this might be more sophisticated)
  root.containerInfo.innerHTML = "";

  // Update the container with new content
  updateContainer(children, root);
};

/**
 * Create Root
 *
 * Creates a new React root for the given container element. This is the
 * entry point for React 18's concurrent rendering features.
 *
 * @param {Element} container - DOM element to render into (e.g., div#root)
 * @returns {ReactDOMRoot} Root instance with render method
 */
export function createRoot(container) {
  // Create the internal fiber root structure
  const root = createContainer(container);

  // Set up event delegation for the container
  listenToAllSupportedEvents(container);

  // Return public root API
  return new ReactDOMRoot(root);
}
