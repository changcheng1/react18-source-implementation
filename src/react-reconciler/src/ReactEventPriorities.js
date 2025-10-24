/**
 * React Event Priorities - Event-Based Priority Management
 *
 * This module manages the mapping between different types of events and their
 * corresponding priority levels in React's scheduling system. It bridges the
 * gap between user interactions and React's internal lane-based priority system.
 *
 * Priority levels (from highest to lowest):
 * - Discrete: User interactions that need immediate response (click, input)
 * - Continuous: Events that fire frequently (mousemove, scroll)
 * - Default: Normal updates and state changes
 * - Idle: Background work that can be deferred
 *
 * @module ReactEventPriorities
 */

import {
  NoLane,
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  IdleLane,
  getHighestPriorityLane,
  includesNonIdleWork,
} from "./ReactFiberLane";

// Event priority constants mapped to corresponding lanes
export const DiscreteEventPriority = SyncLane; // 1 - Discrete events (click, change)
export const ContinuousEventPriority = InputContinuousLane; // 4 - Continuous events (mousemove)
export const DefaultEventPriority = DefaultLane; // 16 - Default priority events
export const IdleEventPriority = IdleLane; // Idle priority events

// Global state for current update priority
let currentUpdatePriority = NoLane;

export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}
export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority;
}

/**
 * 判断eventPriority是不是比lane要小，更小意味着优先级更高
 * @param {*} a
 * @param {*} b
 * @returns
 */
export function isHigherEventPriority(eventPriority, lane) {
  return eventPriority !== 0 && eventPriority < lane;
}
/**
 * 把lane转成事件优先级
 * lane 31
 * 事件优先级是4
 * 调度优先级5
 * @param {*} lanes
 * @returns
 */
export function lanesToEventPriority(lanes) {
  //获取最高优先级的lane
  let lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority; //1
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority; //4
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority; //16
  }
  return IdleEventPriority;
}
