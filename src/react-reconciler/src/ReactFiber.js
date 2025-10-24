/**
 * React Fiber - Core Fiber Node Implementation
 *
 * This module contains the Fiber node structure and related utilities.
 * Fiber is React's reconciliation algorithm that enables interruptible rendering,
 * priority-based scheduling, and efficient updates.
 *
 * @module ReactFiber
 */

import {
  HostComponent,
  HostRoot,
  IndeterminateComponent,
  HostText,
} from "./ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";

/**
 * Fiber Node Constructor
 *
 * Creates a new Fiber node which represents a unit of work in React's reconciliation.
 * Each React element corresponds to a Fiber node in the Fiber tree.
 *
 * @param {number} tag - Fiber type (FunctionComponent: 0, ClassComponent: 1, HostComponent: 5, HostRoot: 3)
 * @param {any} pendingProps - New props waiting to be processed
 * @param {string|number|null} key - Unique identifier for reconciliation
 */
export function FiberNode(tag, pendingProps, key) {
  // Instance properties
  this.tag = tag; // Fiber type identifier
  this.key = key; // Unique key for reconciliation
  this.type = null; // Component type (function, class, or DOM tag name)
  this.stateNode = null; // Reference to DOM node or component instance

  // Fiber tree structure - forms a linked list tree
  this.return = null; // Parent fiber (return pointer)
  this.child = null; // First child fiber
  this.sibling = null; // Next sibling fiber

  // Props and state management
  this.pendingProps = pendingProps; // New props waiting to be applied
  this.memoizedProps = null; // Props from the last completed render

  // State varies by fiber type:
  // - Class components: component instance state
  // - Host root: elements to render
  // - Function components: hooks state
  this.memoizedState = null;

  // Update queue for managing state updates
  this.updateQueue = null;

  // Side effects - indicate what operations need to be performed
  this.flags = NoFlags; // Side effects for this fiber
  this.subtreeFlags = NoFlags; // Side effects for child fibers

  // Double buffering - enables efficient updates
  this.alternate = null; // Alternate fiber for double buffering

  // Additional properties
  this.index = 0; // Index of this fiber among siblings
  this.deletions = null; // Child fibers to be deleted
  this.lanes = NoLanes; // Priority lanes for this fiber
  this.childLanes = NoLanes; // Priority lanes for child fibers
  this.ref = null; // Ref object or callback
}
// We use a double buffering pooling technique because we know that we'll only ever need at most two versions of a tree.
// We pool the "other" unused  node that we're free to reuse.

// This is lazily created to avoid allocating
// extra objects for things that are never updated. It also allow us to
// reclaim the extra memory if needed.
export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}
export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}
/**
 * Create Work-in-Progress Fiber
 *
 * Creates a work-in-progress fiber based on the current fiber and new props.
 * This implements React's double buffering technique where we maintain two fiber trees:
 * - Current tree: represents the current state
 * - Work-in-progress tree: represents the next state being built
 *
 * Reuse has two meanings:
 * 1. Reuse the old fiber object structure
 * 2. Reuse the actual DOM nodes when possible
 *
 * @param {Fiber} current - The current fiber (old fiber)
 * @param {any} pendingProps - New props to be applied
 * @returns {Fiber} Work-in-progress fiber
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;

  if (workInProgress === null) {
    // No alternate exists, create a new fiber
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    // Establish bidirectional connection for double buffering
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // Reuse existing alternate fiber
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;

    // Reset side effects
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }

  // Copy properties from current fiber
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.flags = current.flags;
  workInProgress.lanes = current.lanes;
  workInProgress.childLanes = current.childLanes;

  return workInProgress;
}
/**
 * Create Fiber from React Element
 *
 * Converts a React element (virtual DOM node) into a Fiber node.
 * This is used during the reconciliation process to build the Fiber tree.
 *
 * @param {ReactElement} element - React element to convert
 * @returns {Fiber} New fiber node
 */
export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element;
  return createFiberFromTypeAndProps(type, key, pendingProps);
}

/**
 * Create Fiber from Type and Props
 *
 * Creates a fiber node based on the component type and props.
 * Determines the appropriate fiber tag based on the component type.
 *
 * @param {string|function|class} type - Component type
 * @param {string|number|null} key - Unique key
 * @param {object} pendingProps - Component props
 * @returns {Fiber} New fiber node
 */
function createFiberFromTypeAndProps(type, key, pendingProps) {
  let tag = IndeterminateComponent; // Default for function components

  // If type is a string (span, div, etc.), this is a host component
  if (typeof type === "string") {
    tag = HostComponent;
  }

  const fiber = createFiber(tag, pendingProps, key);
  fiber.type = type;
  return fiber;
}

/**
 * Create Fiber from Text Content
 *
 * Creates a fiber node for text content. Text nodes are leaf nodes
 * in the Fiber tree and represent actual text content in the DOM.
 *
 * @param {string} content - Text content
 * @returns {Fiber} Text fiber node
 */
export function createFiberFromText(content) {
  return createFiber(HostText, content, null);
}
