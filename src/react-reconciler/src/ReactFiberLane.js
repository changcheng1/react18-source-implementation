/**
 * React Fiber Lane - Priority-Based Scheduling System
 *
 * This module implements React's lane-based priority system for concurrent rendering.
 * Lanes are represented as binary flags, allowing efficient bitwise operations for
 * priority management, merging, and comparison.
 *
 * Key concepts:
 * - Lower numeric values = higher priority
 * - Lanes can be combined using bitwise OR
 * - Each lane represents a different type of work or priority level
 * - Enables fine-grained control over update scheduling
 *
 * Lane types (from highest to lowest priority):
 * - SyncLane: Synchronous updates (highest priority)
 * - InputContinuous: User input events (high priority)
 * - Default: Normal updates (medium priority)
 * - Idle: Background updates (lowest priority)
 *
 * @module ReactFiberLane
 */

import { allowConcurrentByDefault } from "shared/ReactFeatureFlags";

// Total number of available lanes (31-bit system)
export const TotalLanes = 31;

// Lane constants - binary representation for efficient bitwise operations
export const NoLanes = 0b0000000000000000000000000000000; // No work scheduled
export const NoLane = 0b0000000000000000000000000000000; // Alias for NoLanes

// Synchronous lane - highest priority, cannot be interrupted
export const SyncLane = 0b0000000000000000000000000000001;

// Input continuous lanes - for user interactions
export const InputContinuousHydrationLane = 0b0000000000000000000000000000010;
export const InputContinuousLane = 0b0000000000000000000000000000100;

// Default lanes - for normal updates
export const DefaultHydrationLane = 0b0000000000000000000000000001000;
export const DefaultLane = 0b0000000000000000000000000010000;

// Special purpose lanes
export const SelectiveHydrationLane = 0b0001000000000000000000000000000;
export const IdleHydrationLane = 0b0010000000000000000000000000000;
export const IdleLane = 0b0100000000000000000000000000000;
export const OffscreenLane = 0b1000000000000000000000000000000;

// Mask for non-idle lanes (excludes idle and offscreen work)
const NonIdleLanes = 0b0001111111111111111111111111111;

// Timestamp constants
export const NoTimestamp = -1; // Indicates no timestamp set

/**
 * Mark Root Updated
 *
 * Marks a root as having pending updates in the specified lane.
 * This adds the update lane to the root's pending lanes using bitwise OR.
 *
 * @param {FiberRoot} root - Fiber root to mark as updated
 * @param {Lane} updateLane - Lane containing the update
 */
export function markRootUpdated(root, updateLane) {
  // Add the update lane to pending lanes (bitwise OR combines lanes)
  root.pendingLanes |= updateLane;
}

/**
 * Get Next Lanes
 *
 * Determines which lanes should be processed next based on priority.
 * This function implements React's scheduling logic, considering:
 * - Pending work lanes
 * - Currently rendering work
 * - Priority levels
 *
 * @param {FiberRoot} root - Fiber root to get lanes for
 * @param {Lanes} wipLanes - Currently work-in-progress lanes
 * @returns {Lanes} Next lanes to process
 */
export function getNextLanes(root, wipLanes) {
  // Get all lanes with pending updates
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }

  // Get the highest priority lanes from pending work
  const nextLanes = getHighestPriorityLanes(pendingLanes);

  if (wipLanes !== NoLane && wipLanes !== nextLanes) {
    // If new lanes have lower priority than current work, continue current work
    // (Higher numeric value = lower priority)
    if (nextLanes > wipLanes) {
      return wipLanes;
    }
  }

  return nextLanes;
}
export function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes);
}
//找到最右边的1 只能返回一个车道
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}
export function includesNonIdleWork(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes;
}
/**
 * 源码此处的逻辑有大的改变动
 * 以前
 * pendingLanes= 001100
 * 找到最右边的1  000100
 * nextLanes     000111
 *
 * 现在的源码已经改了
 * pendingLanes= 001100
 * 找到最右边的1  000100
 *  update 000010
 * 那是不是意味着以前是不检测车道上有没有任务的，就是先拿优先级再检测？
 */

export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}
export function mergeLanes(a, b) {
  return a | b;
}

export function includesBlockingLane(root, lanes) {
  //如果允许默认并行渲染
  if (allowConcurrentByDefault) {
    return false;
  }
  const SyncDefaultLanes = InputContinuousLane | DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLane;
}
/**
 * 取是左侧的1的索引
 * 00011000
 * 7-3=4
 */
function pickArbitraryLaneIndex(lanes) {
  //clz32返回最左侧的1的左边0的个数
  //  000100010
  return 31 - Math.clz32(lanes);
}

export function markStarvedLanesAsExpired(root, currentTime) {
  //获取当前有更新赛 道
  const pendingLanes = root.pendingLanes;
  //记录每个赛道上的过期时间
  const expirationTimes = root.expirationTimes;
  let lanes = pendingLanes;
  while (lanes > 0) {
    //获取最左侧的1的索引
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    const expirationTime = expirationTimes[index];
    //如果此赛道上没有过期时间,说明没有为此车道设置过期时间
    if (expirationTime === NoTimestamp) {
      expirationTimes[index] = computeExpirationTime(lane, currentTime);
      //如果此车道的过期时间已经小于等于当前时间了
    } else if (expirationTime <= currentTime) {
      //把此车道添加到过期车道里
      root.expiredLanes |= lane;
      console.log(
        "expirationTime",
        expirationTime,
        "currentTime",
        currentTime,
        root.expiredLanes
      );
    }
    lanes &= ~lane;
  }
}
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250;
    case DefaultLane:
      return currentTime + 5000;
    case IdleLane:
      return NoTimestamp;
    default:
      return NoTimestamp;
  }
}

export function createLaneMap(initial) {
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}
export function includesExpiredLane(root, lanes) {
  return (lanes & root.expiredLanes) !== NoLanes;
}
export function markRootFinished(root, remainingLanes) {
  //pendingLanes根上所有的将要被渲染的车道 1和2
  //remainingLanes 2
  //noLongerPendingLanes指的是已经更新过的lane
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
  root.pendingLanes = remainingLanes;
  const expirationTimes = root.expirationTimes;
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    //获取最左侧的1的索引
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    //清除已经计算过的车道的过期时间
    expirationTimes[index] = NoTimestamp;
    lanes &= ~lane;
  }
}
