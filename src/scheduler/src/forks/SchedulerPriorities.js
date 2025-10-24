/**
 * Scheduler Priorities - Task Priority Level Definitions
 *
 * This module defines the priority levels used by React's scheduler to determine
 * the order in which tasks should be executed. Higher priority tasks can interrupt
 * lower priority ones, ensuring that critical updates (like user interactions)
 * are processed quickly.
 *
 * Priority hierarchy (from highest to lowest):
 * 1. Immediate - Critical tasks that must run synchronously
 * 2. UserBlocking - User interactions that should feel responsive
 * 3. Normal - Regular updates and state changes
 * 4. Low - Non-critical updates that can be deferred
 * 5. Idle - Background work that runs when nothing else is pending
 *
 * @module SchedulerPriorities
 */

// Priority level constants (lower numbers = higher priority)
export const NoPriority = 0; // No priority assigned
export const ImmediatePriority = 1; // Immediate execution (highest priority)
export const UserBlockingPriority = 2; // User interactions (clicks, input)
export const NormalPriority = 3; // Normal updates (default priority)
export const LowPriority = 4; // Low priority updates (can be deferred)
export const IdlePriority = 5; // Idle work (lowest priority)
