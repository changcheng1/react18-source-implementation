/**
 * React Fiber Hooks - Internal Hooks Implementation
 *
 * This module contains the internal implementation of React hooks. It manages
 * hook state, effects, and the hook dispatcher system that switches between
 * mount and update phases.
 *
 * Key concepts:
 * - Hook objects store state and form a linked list per component
 * - Different dispatchers for mount vs update phases
 * - Effect hooks manage side effects with dependency tracking
 * - State hooks manage component state with update queues
 *
 * @module ReactFiberHooks
 */

import ReactSharedInternals from "shared/ReactSharedInternals";
import {
  scheduleUpdateOnFiber,
  requestUpdateLane,
  requestEventTime,
} from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from "./ReactHookEffectTags";
import { NoLane, NoLanes, isSubsetOfLanes, mergeLanes } from "./ReactFiberLane";

// Global hook state
const { ReactCurrentDispatcher } = ReactSharedInternals;
let currentlyRenderingFiber = null; // Fiber currently being rendered
let workInProgressHook = null; // Current hook being processed
let currentHook = null; // Hook from previous render
let renderLanes = NoLanes; // Current render priority lanes

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useRef: mountRef,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useRef: updateRef,
};
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = {
    current: initialValue,
  };
  hook.memoizedState = ref;
  return ref;
}
function updateRef() {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}
function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}
function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}
function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy;
  // the previous old hook
  if (currentHook !== null) {
    // get the old effect object on this useEffect hook create deps destroy
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // compare the new array with the old array, if they are the same
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // regardless of whether it needs to be re-executed, the new effect needs to be added to the fiber.updateQueue
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  // if it needs to be executed, the fiber's flags need to be modified
  currentlyRenderingFiber.flags |= fiberFlags;
  // if it needs to be executed, add the HookHasEffect flag
  // recently a student asked Passive还需HookHasEffect, because not every Passive will be executed
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  );
}
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null;
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}
/* function mountLayoutEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
} */
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  //给当前的函数组件fiber添加flags
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}
/**
 * add effect list
 * @param {*} tag effect tag
 * @param {*} create create method
 * @param {*} destroy destroy method
 * @param {*} deps dependencies array
 */
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}
// useState is actually a useReducer with a reducer built in
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}
function updateState(initialState) {
  return updateReducer(baseStateReducer, initialState);
}
/**
 * hook attributes
 * hook.memoizedState the current hook's真正显示出来的状态
 * hook.baseState the old state before the first skipped update
 * hook.queue.lastRenderedState the previous calculated state
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, // the previous reducer
    lastRenderedState: initialState, // the previous state
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
function dispatchSetState(fiber, queue, action) {
  // get the current update lane lane 1
  const lane = requestUpdateLane();
  const update = {
    lane, // the current update priority is 1
    action,
    hasEagerState: false, // whether there is an eager update
    eagerState: null, // eager update state
    next: null,
  };
  const alternate = fiber.alternate;

  // when you dispatch an action, I immediately use the previous state and the previous reducer to calculate the new state
  // as long as the first update can perform this optimization
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes == NoLanes)
  ) {
    // get the old state and reducer on the queue
    const { lastRenderedReducer, lastRenderedState } = queue;
    // use the previous state and reducer to calculate the new state
    const eagerState = lastRenderedReducer(lastRenderedState, action);
    update.hasEagerState = true;
    update.eagerState = eagerState;
    if (Object.is(eagerState, lastRenderedState)) {
      return;
    }
  }
  // below is the actual enqueue update, and schedule update logic
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  const eventTime = requestEventTime();
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}
/**
 * build new hooks
 */
function updateWorkInProgressHook() {
  // get the old hook of the new hook to be built
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  // create new hook based on the old hook
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}
function updateReducer(reducer) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  queue.lastRenderedReducer = reducer;
  const current = currentHook;
  let baseQueue = current.baseQueue;
  const pendingQueue = queue.pending;
  // merge the new and old update lists
  if (pendingQueue !== null) {
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  if (baseQueue !== null) {
    printQueue(baseQueue);
    const first = baseQueue.next;
    let newState = current.baseState;
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    do {
      const updateLane = update.lane;
      const shouldSkipUpdate = !isSubsetOfLanes(renderLanes, updateLane);
      if (shouldSkipUpdate) {
        const clone = {
          lane: updateLane,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane
        );
      } else {
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        if (update.hasEagerState) {
          newState = update.eagerState;
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }
      update = update.next;
    } while (update !== null && update !== first);
    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }
  if (baseQueue === null) {
    queue.lanes = NoLanes;
  }
  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}
function printQueue(queue) {
  const first = queue.next;
  let desc = "";
  let update = first;
  do {
    desc += "=>" + update.action.id;
    update = update.next;
  } while (update !== null && update !== first);
  desc += "=>null";
  console.log(desc);
}
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialArg;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
/**
 * execute the method of dispatching an action, it needs to update the state, and make the interface re-update
 * @param {*} fiber the fiber corresponding to the function
 * @param {*} queue the update queue corresponding to the hook
 * @param {*} action the action to be dispatched
 */
function dispatchReducerAction(fiber, queue, action) {
  // in each hook, there will be an update queue, the update queue is a circular list of update objects update1.next=update2.next=update1
  const lane = requestUpdateLane();
  const update = {
    lane, // the current update priority
    action, //{ type: 'add', payload: 1 } the action to be dispatched
    hasEagerState: false, // whether there is an eager update
    eagerState: null, // eager update state
    next: null, // point to the next update object
  };
  // add the current latest update to the update queue, and return the current root fiber
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  const eventTime = requestEventTime();
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}
/**
 * mount the hook being built
 * */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, //hook's state 0
    queue: null, // the update queue corresponding to the hook queue.pending=update's circular list
    next: null, // point to the next hook, a function can have multiple hooks, they will form a singly linked list
    baseState: null, // the state before the first skipped update
    baseQueue: null, // the list of skipped updates
  };
  if (workInProgressHook === null) {
    // the state of the fiber corresponding to the current function is equal to the first hook object
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
/**
 * render the function component
 * @param {*} current old fiber
 * @param {*} workInProgress new fiber
 * @param {*} Component component definition
 * @param {*} props component properties
 * @returns virtual DOM or React element
 */
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  nextRenderLanes
) {
  // the current render lane
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;
  // the update queue of the function component stores the effect
  workInProgress.updateQueue = null;
  // the linked list of hooks stored in the function component state
  workInProgress.memoizedState = null;
  // if there is an old fiber and an old hook linked list
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  // need to assign the value of ReactCurrentDispatcher.current before executing the function component
  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLanes = NoLanes;
  return children;
}
