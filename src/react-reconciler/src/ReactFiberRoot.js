/**
 * React Fiber Root - Root Container Management
 *
 * This module manages the root container of a React application. The FiberRootNode
 * represents the top-level container that holds the entire React fiber tree.
 * It manages scheduling, priority lanes, and the connection between React and the DOM.
 *
 * Key responsibilities:
 * - Root container lifecycle management
 * - Priority lane tracking and scheduling
 * - Connection between React fiber tree and DOM container
 * - Update queue initialization
 *
 * @module ReactFiberRoot
 */

import { createHostRootFiber } from "./ReactFiber";
import { initialUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { NoLanes, NoLane, createLaneMap, NoTimestamp } from "./ReactFiberLane";

/**
 * Fiber Root Node Constructor
 *
 * Creates the root node that represents the entire React application container.
 * This node sits above the React fiber tree and manages scheduling and updates.
 *
 * @param {Element} containerInfo - DOM container element (e.g., div#root)
 */
function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo; // DOM container element (div#root)

  // Scheduling and priority management
  this.pendingLanes = NoLanes; // Lanes with pending work
  this.callbackNode = null; // Current scheduler callback
  this.callbackPriority = NoLane; // Priority of current callback

  // Expiration tracking
  this.expirationTimes = createLaneMap(NoTimestamp); // Expiration time for each lane
  this.expiredLanes = NoLanes; // Lanes that have expired
}

/**
 * Create Fiber Root
 *
 * Creates and initializes a complete fiber root structure. This includes:
 * 1. Creating the FiberRootNode (container management)
 * 2. Creating the HostRootFiber (root of the fiber tree)
 * 3. Establishing bidirectional connection between them
 * 4. Initializing the update queue
 *
 * This function sets up the foundation for React's rendering system.
 *
 * @param {Element} containerInfo - DOM container element
 * @returns {FiberRootNode} Complete fiber root structure
 */
export function createFiberRoot(containerInfo) {
  // Create the root container node
  const root = new FiberRootNode(containerInfo);

  // Create the root fiber (HostRoot represents the container element)
  const uninitializedFiber = createHostRootFiber();

  // Establish bidirectional connection for double buffering
  root.current = uninitializedFiber; // Root points to current fiber tree
  uninitializedFiber.stateNode = root; // Root fiber points back to container

  // Initialize update queue for the root fiber
  initialUpdateQueue(uninitializedFiber);

  return root;
}
