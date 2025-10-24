/**
 * DOM Plugin Event System - React's Event Delegation Implementation
 *
 * This module implements React's synthetic event system with event delegation.
 * Instead of attaching event listeners to individual DOM elements, React uses
 * a single event delegation system at the root container level.
 *
 * Key features:
 * - Event delegation at root container level
 * - Cross-browser event normalization
 * - Synthetic event creation and dispatch
 * - Support for both capture and bubble phases
 * - Priority-based event handling
 *
 * Benefits:
 * - Better performance (fewer event listeners)
 * - Consistent behavior across browsers
 * - Dynamic event handling for added/removed elements
 * - Memory efficiency
 *
 * @module DOMPluginEventSystem
 */

import { allNativeEvents } from "./EventRegistry";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import {
  addEventCaptureListener,
  addEventBubbleListener,
} from "./EventListener";
import getEventTarget from "./getEventTarget";
import { HostComponent } from "react-reconciler/src/ReactWorkTags";
import getListener from "./getListener";

// Register all simple events (click, change, etc.)
SimpleEventPlugin.registerEvents();

// Unique marker to track if container already has listeners
const listeningMarker = `_reactListening` + Math.random().toString(36).slice(2);
/**
 * Listen to All Supported Events
 *
 * Sets up event delegation for all supported events on the root container.
 * This function is called once per root container and registers listeners
 * for both capture and bubble phases of all native events.
 *
 * The event delegation approach means that instead of attaching listeners
 * to individual elements, we attach them to the root and handle all events
 * from there, determining the actual target through event bubbling/capturing.
 *
 * @param {Element} rootContainerElement - Root DOM element (e.g., div#root)
 */
export function listenToAllSupportedEvents(rootContainerElement) {
  // Only set up listeners once per container
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;

    // Register listeners for all native events (click, change, focus, etc.)
    allNativeEvents.forEach((domEventName) => {
      // Register for capture phase (events flow down from root to target)
      listenToNativeEvent(domEventName, true, rootContainerElement);
      // Register for bubble phase (events flow up from target to root)
      listenToNativeEvent(domEventName, false, rootContainerElement);
    });
  }
}
/**
 * Listen to Native Event
 *
 * Registers a native event listener on the target DOM element for a specific
 * event type and phase (capture or bubble). This creates the actual DOM event
 * listener that will handle all events of this type.
 *
 * @param {string} domEventName - Native event name (e.g., 'click', 'change')
 * @param {boolean} isCapturePhaseListener - Whether this is for capture phase
 * @param {Element} target - Target DOM element (root container)
 */
export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  target
) {
  // Set event system flags: 0 for bubble phase, IS_CAPTURE_PHASE for capture
  let eventSystemFlags = 0;
  if (isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  );
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags
  );
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}

export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  dispatchEventForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  );
}

function dispatchEventForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  //派发事件的数组
  const dispatchQueue = [];
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}
function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  //判断是否在捕获阶段
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i];
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase);
  }
}
function executeDispatch(event, listener, currentTarget) {
  //合成事件实例currentTarget是在不断的变化的
  // event nativeEventTarget 它的是原始的事件源，是永远不变的
  // event currentTarget 当前的事件源，它是会随着事件回调的执行不断变化的
  event.currentTarget = currentTarget;
  listener(event);
}
function processDispatchQueueItemsInOrder(
  event,
  dispatchListeners,
  inCapturePhase
) {
  if (inCapturePhase) {
    //dispatchListeners[子，父]
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispatchListeners[i];
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  } else {
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i];
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  }
}
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
}

export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase
) {
  const captureName = reactName + "Capture";
  const reactEventName = isCapturePhase ? captureName : reactName;
  const listeners = [];
  let instance = targetFiber;
  while (instance !== null) {
    const { stateNode, tag } = instance; //stateNode 当前的执行回调的DOM节点
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName);
      if (listener) {
        listeners.push(createDispatchListener(instance, listener, stateNode));
      }
    }
    instance = instance.return;
  }
  return listeners;
}
function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget };
}
