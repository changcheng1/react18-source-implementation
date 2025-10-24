/**
 * ReactDOMEventListener - Event Listener for ReactDOM
 *
 * This module provides the event listener functionality for ReactDOM.
 * It handles the creation and dispatch of synthetic events.
 *
 * @module ReactDOMEventListener
 */
import getEventTarget from "./getEventTarget";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority,
} from "react-reconciler/src/ReactEventPriorities";
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags
) {
  const listenerWrapper = dispatchDiscreteEvent;
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
}
/**
 * dispatch the discrete event of the listener function
 * @param {*} domEventName  click
 * @param {*} eventSystemFlags phase 0 bubble 4 capture
 * @param {*} container container div#root
 * @param {*} nativeEvent native event
 */
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  //when you click the button, you need to set the update priority
  //get the current old update priority
  const previousPriority = getCurrentUpdatePriority();
  try {
    //set the current update priority to the discrete event priority 1
    setCurrentUpdatePriority(DiscreteEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority);
  }
}
/**
 * this method is to delegate to the container's callback, when the container#root handles the event in the capture or bubble phase, this function will be executed
 * @param {*} domEventName
 * @param {*} eventSystemFlags phase 0 bubble 4 capture
 * @param {*} container container div#root
 * @param {*} nativeEvent native event
 */
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  // get the event target, it is a real DOM
  const nativeEventTarget = getEventTarget(nativeEvent);
  const targetInst = getClosestInstanceFromNode(nativeEventTarget);
  dispatchEventForPluginEventSystem(
    domEventName, //click
    eventSystemFlags, //0 4
    nativeEvent, //native event
    targetInst, //the fiber of the real DOM
    targetContainer //target container
  );
}
/**
 * get the event priority
 * @param {*} domEventName  click
 */
export function getEventPriority(domEventName) {
  switch (domEventName) {
    case "click":
      return DiscreteEventPriority;
    case "drag":
      return ContinuousEventPriority;
    default:
      return DefaultEventPriority;
  }
}
