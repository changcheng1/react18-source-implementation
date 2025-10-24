/**
 * React Scheduler - Task Scheduling and Time Slicing
 *
 * This module implements React's scheduler which manages task execution with
 * priority-based scheduling and time slicing. It ensures that high-priority
 * tasks can interrupt low-priority ones and that the main thread remains
 * responsive by yielding control back to the browser.
 *
 * Key features:
 * - Priority-based task scheduling
 * - Time slicing with configurable frame intervals
 * - Task queue management using min heap
 * - Cooperative scheduling with shouldYield
 *
 * @module Scheduler
 */

import { push, peek, pop } from "./SchedulerMinHeap";
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from "./SchedulerPriorities";

/**
 * Get Current Time
 *
 * Returns the current time in milliseconds using high-resolution timer.
 *
 * @returns {number} Current time in milliseconds
 */
function getCurrentTime() {
  return performance.now();
}

// Maximum 31-bit signed integer value
var maxSigned31BitInt = 1073741823;

// Priority timeout constants (in milliseconds)
var IMMEDIATE_PRIORITY_TIMEOUT = -1; // Expires immediately
var USER_BLOCKING_PRIORITY_TIMEOUT = 250; // Expires in 250ms
var NORMAL_PRIORITY_TIMEOUT = 5000; // Expires in 5 seconds
var LOW_PRIORITY_TIMEOUT = 10000; // Expires in 10 seconds
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt; // Never expires

// Scheduler state
let taskIdCounter = 1; // Task ID counter for unique identification
const taskQueue = []; // Min heap of scheduled tasks
let scheduleHostCallback = null; // Host callback scheduler function
let startTime = -1; // Work start time for yielding calculations
let currentTask = null; // Currently executing task

// Time slicing configuration
// React requests 5ms per frame for task execution
// If tasks don't complete within 5ms, React yields control back to browser
const frameInterval = 5;

const channel = new MessageChannel();
var port2 = channel.port2;
var port1 = channel.port1;
port1.onmessage = performWorkUntilDeadline;

/**
 * 按优先级执行任务
 * @param {*} priorityLevel
 * @param {*} callback
 */
function scheduleCallback(priorityLevel, callback) {
  // 获取当前的时候
  const currentTime = getCurrentTime();
  // 此任务的开时间
  const startTime = currentTime;
  //超时时间
  let timeout;
  //根据优先级计算过期的时间
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT; // -1
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT; // 250ms
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT; //1073741823
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT; //10000
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT; //5000
      break;
  }
  //计算此任务的过期时间
  const expirationTime = startTime + timeout;
  const newTask = {
    id: taskIdCounter++,
    callback, //回调函数或者说任务函数
    priorityLevel, //优先级别
    startTime, //任务的开始时间
    expirationTime, //任务的过期时间
    sortIndex: expirationTime, //排序依赖
  };
  //向任务最小堆里添加任务，排序的依据是过期时间
  push(taskQueue, newTask);
  //flushWork执行工作，刷新工作，执行任务，司机接人
  requestHostCallback(workLoop);
  return newTask;
}
function shouldYieldToHost() {
  //用当前时间减去开始的时间就是过去的时间
  const timeElapsed = getCurrentTime() - startTime;
  //如果流逝或者说经过的时间小于5毫秒，那就不需要放弃执行
  if (timeElapsed < frameInterval) {
    return false;
  } //否则就是表示5毫秒用完了，需要放弃执行
  return true;
}
function workLoop(startTime) {
  let currentTime = startTime;
  //取出优先级最高的任务 局长
  currentTask = peek(taskQueue);
  while (currentTask !== null) {
    //如果此任务的过期时间小于当前时间，也就是说没有过期,并且需要放弃执行 时间片到期
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      //跳出工作循环
      break;
    }
    //取出当前的任务中的回调函数 performConcurrentWorkOnRoot
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      //执行工作，如果返回新的函数，则表示当前的工作没有完成
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      const continuationCallback = callback(didUserCallbackTimeout);
      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
        return true; //还有任务要执行
      }
      //如果此任务已经完成，则不需要再继续执行了，可以把此任务弹出
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue);
      }
    } else {
      pop(taskQueue);
    }
    //如果当前的任务执行完了，或者当前任务不合法，取出下一个任务执行
    currentTask = peek(taskQueue);
  }
  //如果循环结束还有未完成的任务，那就表示hasMoreWork=true
  if (currentTask !== null) {
    return true;
  }
  //没有任何要完成的任务了
  return false;
}
function requestHostCallback(workLoop) {
  //先缓存回调函数
  scheduleHostCallback = workLoop;
  //执行工作直到截止时间
  schedulePerformWorkUntilDeadline();
}
function schedulePerformWorkUntilDeadline() {
  port2.postMessage(null);
}
function performWorkUntilDeadline() {
  if (scheduleHostCallback) {
    // 先获取开始执行任务的时间
    //表示时间片的开始
    startTime = getCurrentTime();
    // 是否有更多的工作要做
    let hasMoreWork = true;
    try {
      //执行 flushWork ，并判断有没有返回值
      hasMoreWork = scheduleHostCallback(startTime);
    } finally {
      //执行完以后如果为true,说明还有更多工作要做
      if (hasMoreWork) {
        //继续执行
        schedulePerformWorkUntilDeadline();
      } else {
        scheduleHostCallback = null;
      }
    }
  }
}
function unstable_cancelCallback(task) {
  task.callback = null;
}
export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
  unstable_cancelCallback,
  getCurrentTime as now,
};

/*
开始执行任务队列中的任务

function flushWork(startTime) {
  return workLoop(startTime);
}
 */
