import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import {
  scheduleUpdateOnFiber,
  requestUpdateLane,
  requestEventTime,
} from "./ReactFiberWorkLoop";
export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo);
}
/**
 * Update container, convert virtual DOM element to real DOM and insert into container
 * @param {*} element Virtual DOM
 * @param {*} container DOM container FiberRootNode containerInfo div#root
 */
export function updateContainer(element, container) {
  // Get the current root fiber
  const current = container.current;
  const eventTime = requestEventTime();
  // Request an update lane 16
  const lane = requestUpdateLane(current);
  // Create update
  const update = createUpdate(lane);
  // Virtual DOM to be updated
  update.payload = { element }; //h1
  // Add this update object to the update queue of the current root Fiber, return the root node
  const root = enqueueUpdate(current, update, lane);
  scheduleUpdateOnFiber(root, current, lane, eventTime);
}
