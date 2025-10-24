/**
 * React Fiber Work Loop - Core Rendering Engine
 *
 * This module contains the main work loop that drives React's rendering process.
 * It implements the concurrent rendering algorithm with time slicing, priority
 * scheduling, and interruptible rendering.
 *
 * The work loop is responsible for:
 * - Scheduling and executing render work
 * - Managing work-in-progress fiber tree
 * - Handling interruptions and yielding
 * - Coordinating commit phase operations
 *
 * @module ReactFiberWorkLoop
 */

import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  cancelCallback as Scheduler_cancelCallback,
  now,
} from "./scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { NoFlags, MutationMask, Passive } from "./ReactFiberFlags";
import {
  commitMutationEffectsOnFiber, // Execute DOM operations
  commitPassiveUnmountEffects, // Execute cleanup functions
  commitPassiveMountEffects, // Execute effect functions
  commitLayoutEffects,
} from "./ReactFiberCommitWork";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  NoLanes,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  SyncLane,
  includesBlockingLane,
  NoLane,
  markStarvedLanesAsExpired,
  includesExpiredLane,
  markRootFinished,
  NoTimestamp,
  mergeLanes,
} from "./ReactFiberLane";
import {
  getCurrentUpdatePriority,
  lanesToEventPriority,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { getCurrentEventPriority } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  scheduleSyncCallback,
  flushSyncCallbacks,
} from "./ReactFiberSyncTaskQueue";

// Global work loop state
let workInProgress = null; // Current fiber being worked on
let workInProgressRoot = null; // Root fiber currently being built
let rootDoesHavePassiveEffect = false; // Whether root has passive effects (useEffect)
let rootWithPendingPassiveEffects = null; // Root with pending passive effects
let workInProgressRootRenderLanes = NoLanes; // Lanes being rendered

// Work loop exit status constants
const RootInProgress = 0; // Fiber tree construction in progress
const RootCompleted = 5; // Fiber tree construction completed

// Current render state
let workInProgressRootExitStatus = RootInProgress; // Current fiber tree status
let currentEventTime = NoTimestamp; // Current event timestamp

/**
 * Schedule Update on Fiber
 *
 * Schedules an update on a fiber root. This is the entry point for all updates
 * in React, whether they come from setState, props changes, or other sources.
 *
 * @param {FiberRoot} root - The fiber root to update
 * @param {Fiber} fiber - The fiber that triggered the update
 * @param {Lane} lane - Priority lane for this update
 * @param {number} eventTime - Time when the event occurred
 */
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  // Mark the root as having updates in this lane
  markRootUpdated(root, lane);

  // Ensure the root is scheduled for updates
  ensureRootIsScheduled(root, eventTime);
}

/**
 * Ensure Root is Scheduled
 *
 * Ensures that a root is scheduled for updates. This function implements
 * React's scheduling logic, including priority management and batching.
 *
 * @param {FiberRoot} root - The fiber root to schedule
 * @param {number} currentTime - Current time for scheduling calculations
 */
function ensureRootIsScheduled(root, currentTime) {
  // Get existing callback node if any
  const existingCallbackNode = root.callbackNode;

  // Mark starved lanes as expired to prevent starvation
  markStarvedLanesAsExpired(root, currentTime);

  // Get the next lanes to work on (highest priority)
  const nextLanes = getNextLanes(root, workInProgressRootRenderLanes);

  // If no work to do, exit early
  if (nextLanes === NoLanes) {
    return;
  }

  // Get the priority of the new work
  let newCallbackPriority = getHighestPriorityLane(nextLanes);

  // Get the priority of existing work
  const existingCallbackPriority = root.callbackPriority;

  // If priorities match, we can batch the updates
  if (existingCallbackPriority === newCallbackPriority) {
    return;
  }

  // Cancel existing callback if priorities differ
  if (existingCallbackNode !== null) {
    console.log("cancelCallback");
    Scheduler_cancelCallback(existingCallbackNode);
  }

  // Schedule new callback
  let newCallbackNode = null;
  //如果新的优先级是同步的话
  if (newCallbackPriority === SyncLane) {
    //先把performSyncWorkOnRoot添回到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    //再把flushSyncCallbacks放入微任务
    queueMicrotask(flushSyncCallbacks);
    //如果是同步执行的话
    newCallbackNode = null;
  } else {
    //如果不是同步，就需要调度一个新的任务
    let schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
    }
    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  //the task executed on the root is newCallbackNode
  root.callbackNode = newCallbackNode;
  root.callbackPriority = newCallbackPriority;
  /*  if (workInProgressRoot) return;
   workInProgressRoot = root;
   //告诉 浏览器要执行performConcurrentWorkOnRoot 在此触发更新
   scheduleCallback(NormalSchedulerPriority, performConcurrentWorkOnRoot.bind(null, root)); */
}
/**
 * perform synchronous work on the root
 */
function performSyncWorkOnRoot(root) {
  //get the highest priority lane
  const lanes = getNextLanes(root);
  //render the new fiber tree
  renderRootSync(root, lanes);
  //get the new rendered fiber root node
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  return null;
}
/**
 * build the fiber tree according to the fiber, to create the real DOM node, you also need to insert the real DOM node into the container
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root, didTimeout) {
  //get the task on the current root node
  const originalCallbackNode = root.callbackNode;
  //get the highest priority lane
  const lanes = getNextLanes(root, NoLanes); //16
  if (lanes === NoLanes) {
    return null;
  }
  //if it does not contain the blocking lane, and it is not timed out, it can be rendered in parallel, that is, the time slice is enabled
  //所以说默认更新车道是同步的,不能启用时间分片
  //whether it does not contain the blocking lane
  const nonIncludesBlockingLane = !includesBlockingLane(root, lanes);
  //whether it does not contain the expired lane
  const nonIncludesExpiredLane = !includesExpiredLane(root, lanes);
  //the time slice is not expired
  const nonTimeout = !didTimeout;
  //three variables are true, the time slice can be enabled, that is, the concurrent rendering can be performed, that is, the execution can be interrupted
  const shouldTimeSlice =
    nonIncludesBlockingLane && nonIncludesExpiredLane && nonTimeout;
  // console.log('shouldTimeSlice', shouldTimeSlice);
  //execute rendering, get the exit status
  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);
  //if it is not rendering, then it means that the rendering must be finished
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    commitRoot(root);
  }
  //it means that the task is not completed
  if (root.callbackNode === originalCallbackNode) {
    //return this function, next time to continue
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}
function renderRootConcurrent(root, lanes) {
  //because this method will be repeatedly entered during the construction of the fiber tree, it will be entered multiple times
  //only when the first time comes in will the new fiber tree be created, or the new fiber
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  //execute the fiber tree construction or rendering within the current time slice(5ms)
  workLoopConcurrent();
  //if workInProgress is not null, it means that the fiber tree construction is not completed
  if (workInProgress !== null) {
    return RootInProgress;
  }
  //if workInProgress is null, it means that the rendering work is completely finished
  return workInProgressRootExitStatus;
}
function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    //execute the unmount effect, destroy
    commitPassiveUnmountEffects(root.current);
    //execute the mount effect, create
    commitPassiveMountEffects(root, root.current);
  }
}
function commitRoot(root) {
  const previousUpdatePriority = getCurrentUpdatePriority();
  try {
    //set the current update priority to 1
    setCurrentUpdatePriority(DiscreteEventPriority);
    commitRootImpl(root);
  } finally {
    setCurrentUpdatePriority(previousUpdatePriority);
  }
}
function commitRootImpl(root) {
  //get the new built fiber tree root fiber tag=3
  const { finishedWork } = root;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  root.callbackNode = null;
  root.callbackPriority = NoLane;
  //merge the remaining lanes on the current new root
  const remainingLanes = mergeLanes(
    finishedWork.lanes,
    finishedWork.childLanes
  );
  markRootFinished(root, remainingLanes);
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      Scheduler_scheduleCallback(NormalSchedulerPriority, flushPassiveEffect);
    }
  }
  //whether the subtree has effects
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  //if the effect or the subtree has effects, the DOM operation should be committed
  if (subtreeHasEffects || rootHasEffect) {
    //after the DOM is executed, the DOM operation should be committed
    commitMutationEffectsOnFiber(finishedWork, root);
    //execute the layout effect
    commitLayoutEffects(finishedWork, root);
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }
  //after the DOM is changed, the root's current can be pointed to the new fiber tree
  root.current = finishedWork;
  //after the submission, because the root may have skipped updates, so the scheduling needs to be re-scheduled
  ensureRootIsScheduled(root, now());
}
function prepareFreshStack(root, renderLanes) {
  workInProgress = createWorkInProgress(root.current, null);
  workInProgressRootRenderLanes = renderLanes;
  workInProgressRoot = root;
  finishQueueingConcurrentUpdates();
}
function renderRootSync(root, renderLanes) {
  //if the new root is different from the old root, or the new render priority is different from the old render priority
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    // create a substitute
    prepareFreshStack(root, renderLanes);
  }
  workLoopSync();
  return RootCompleted;
}
function workLoopConcurrent() {
  //if there is a next fiber to build and the time slice is not expired
  while (workInProgress !== null && !shouldYield()) {
    //console.log('shouldYield()', shouldYield(), workInProgress);
    sleep(5);
    performUnitOfWork(workInProgress);
  }
}
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
/**
 * execute a work unit
 * @param {*} unitOfWork
 */
function performUnitOfWork(unitOfWork) {
  //get the old fiber corresponding to the new fiber
  const current = unitOfWork.alternate;
  //after the current fiber's child fiber chain list is built, complete the work
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    //if there is no child node, it means that the current fiber has been completed
    completeUnitOfWork(unitOfWork);
  } else {
    //if there is a child node, let the child node become the next work unit
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    //execute the completion work of this fiber, if it is a native component, it is to create the real DOM node
    completeWork(current, completedWork);
    //if there is a sibling, build the fiber child chain list corresponding to the sibling
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    //if there is no sibling, it means that the current completed is the last node of the parent fiber
    //也就是说一个父fiber,所有的子fiber全部完成了
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  //if you get here, it means that the entire fiber tree has been built, and the build status is set to empty
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

export function requestUpdateLane() {
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLanes) {
    return updateLane;
  }
  const eventLane = getCurrentEventPriority();
  return eventLane;
}
function sleep(duration) {
  const timeStamp = new Date().getTime();
  const endTime = timeStamp + duration;
  while (true) {
    if (new Date().getTime() > endTime) {
      return;
    }
  }
}
//request the current time
export function requestEventTime() {
  currentEventTime = now();
  return currentEventTime; //performance.now()
}
