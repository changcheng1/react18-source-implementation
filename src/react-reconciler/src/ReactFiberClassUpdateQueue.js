import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import assign from "shared/assign";
import { NoLanes, mergeLanes, isSubsetOfLanes } from "./ReactFiberLane";

export const UpdateState = 0;

export function initialUpdateQueue(fiber) {
  // Create a new update queue
  // pending is actually a circular linked list
  const queue = {
    baseState: fiber.memoizedState, // The current fiber state before this update, updates will be calculated based on it
    firstBaseUpdate: null, // The head of the previously skipped update linked list saved on this fiber before this update
    lastBaseUpdate: null, // The tail of the previously skipped update linked list saved on this fiber before this update
    shared: {
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate(lane) {
  const update = { tag: UpdateState, lane, next: null };
  return update;
}
export function enqueueUpdate(fiber, update, lane) {
  // Get the update queue
  const updateQueue = fiber.updateQueue;
  // Get the shared queue
  const sharedQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}
/**
 * Calculate the latest state based on the old state and updates in the update queue
 * @param {*} workInProgress The fiber to be calculated
 */
export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  const queue = workInProgress.updateQueue;
  // Old linked list head
  let firstBaseUpdate = queue.firstBaseUpdate;
  // Old linked list tail
  let lastBaseUpdate = queue.lastBaseUpdate;
  // New linked list tail
  const pendingQueue = queue.shared.pending;
  // Merge new and old linked lists into a single linked list
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    // New linked list tail
    const lastPendingUpdate = pendingQueue;
    // New linked list tail
    const firstPendingUpdate = lastPendingUpdate.next;
    // Cut off the old linked list to make it a single linked list, circular linked list becomes single linked list
    lastPendingUpdate.next = null;
    // If there is no old linked list
    if (lastBaseUpdate === null) {
      // Point to the new linked list head
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }
  // If the linked list is not empty firstBaseUpdate=>lastBaseUpdate
  if (firstBaseUpdate !== null) {
    // State before the last skipped update
    let newState = queue.baseState;
    // Lanes of updates that have not been executed yet
    let newLanes = NoLanes;
    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;
    let update = firstBaseUpdate; //updateA
    do {
      // Get the lane of this update
      const updateLane = update.lane;
      // If updateLane is not a subset of renderLanes, it means this render does not need to process this update, so this update needs to be skipped
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // Clone this update
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload,
        };
        // If the new skipped base linked list is empty, it means the current update is the first skipped update
        if (newLastBaseUpdate === null) {
          // Let both the head and tail of the new skipped linked list point to this first skipped update
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          // Calculate and save the new baseState as the state when this update is skipped
          newBaseState = newState; // ""
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        // If there are skipped updates, merge the lanes of the skipped updates into newLanes,
        // Finally, newLanes will be assigned to fiber.lanes
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        // It means there are already skipped updates
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: 0,
            payload: update.payload,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newState = getStateFromUpdate(update, newState);
      }
      update = update.next;
    } while (update);
    // If there are no skipped updates
    if (!newLastBaseUpdate) {
      newBaseState = newState;
    }
    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.lanes = newLanes;
    // After this render is complete, it will check if there are any non-zero lanes on this fiber, and if so, it will render again
    workInProgress.memoizedState = newState;
  }
}
/**
 * state=0 update=>1 update=2
 * Calculate new state based on old state and update
 * @param {*} update The update object, there are actually many types
 * @param {*} prevState
 */
function getStateFromUpdate(update, prevState, nextProps) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      let partialState;
      if (typeof payload === "function") {
        partialState = payload.call(null, prevState, nextProps);
      } else {
        partialState = payload;
      }
      return assign({}, prevState, partialState);
  }
}

export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue;
  const currentQueue = current.updateQueue;
  // If the new queue and the old queue are not the same object
  if (currentQueue === workInProgressQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
    };
    workInProgress.updateQueue = clone;
  }
}
