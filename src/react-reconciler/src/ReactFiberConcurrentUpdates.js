import { HostRoot } from "./ReactWorkTags";
import { mergeLanes } from "./ReactFiberLane";

const concurrentQueues = [];
let concurrentQueuesIndex = 0;

/**
 * Cache updates to the concurrentQueue array first
 * @param {*} fiber
 * @param {*} queue
 * @param {*} update
 */
function enqueueUpdate(fiber, queue, update, lane) {
  //012 setNumber1 345 setNumber2 678 setNumber3
  concurrentQueues[concurrentQueuesIndex++] = fiber; // The fiber corresponding to the function component
  concurrentQueues[concurrentQueuesIndex++] = queue; // The update queue corresponding to the hook to be updated
  concurrentQueues[concurrentQueuesIndex++] = update; // Update object
  concurrentQueues[concurrentQueuesIndex++] = lane; // Lane corresponding to the update
  // When we add an update to a fiber, we need to merge the lane of this update into the lane of this fiber
  fiber.lanes = mergeLanes(fiber.lanes, lane);
}

export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex; //9 Just a boundary condition
  concurrentQueuesIndex = 0;
  let i = 0;
  while (i < endIndex) {
    const fiber = concurrentQueues[i++];
    const queue = concurrentQueues[i++];
    const update = concurrentQueues[i++];
    const lane = concurrentQueues[i++];
    if (queue !== null && update !== null) {
      const pending = queue.pending;
      if (pending === null) {
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
  }
}
/**
 * Add the update queue to the update queue
 * @param {*} fiber The fiber corresponding to the function component
 * @param {*} queue The update queue corresponding to the hook to be updated
 * @param {*} update Update object
 */
export function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
/**
 * Enqueue the update
 * @param {*} fiber The fiber to be enqueued, root fiber
 * @param {*} queue shareQueue The queue to be effective
 * @param {*} update Update
 * @param {*} lane The lane of this update
 */
export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function getRootForUpdatedFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null; //FiberRootNode div#root
}
