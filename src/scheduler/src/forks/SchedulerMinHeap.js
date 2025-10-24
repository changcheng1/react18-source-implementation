/**
 * Scheduler Min Heap - Priority Queue Implementation
 *
 * This module implements a binary min heap data structure used by React's scheduler
 * to manage tasks by priority. The heap ensures that the highest priority task
 * (lowest sortIndex value) is always at the root and can be accessed in O(1) time.
 *
 * Key properties:
 * - Parent node value ≤ child node values (min heap property)
 * - Complete binary tree structure
 * - Efficient insertion and extraction: O(log n)
 * - Peek operation: O(1)
 *
 * Used for:
 * - Task queue management in scheduler
 * - Priority-based task execution
 * - Efficient task scheduling and dequeuing
 *
 * @module SchedulerMinHeap
 */

/**
 * Push - Insert Element into Heap
 *
 * Adds a new node to the heap while maintaining the min heap property.
 * The element is added at the end and then "bubbled up" to its correct position.
 *
 * Time complexity: O(log n)
 *
 * @param {Array} heap - The heap array
 * @param {Object} node - Node to insert (must have sortIndex property)
 */
export function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

/**
 * Peek - Get Minimum Element
 *
 * Returns the minimum element (root) without removing it from the heap.
 * In a min heap, this is always the first element.
 *
 * Time complexity: O(1)
 *
 * @param {Array} heap - The heap array
 * @returns {Object|null} Minimum element or null if heap is empty
 */
export function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}

/**
 * Pop - Remove and Return Minimum Element
 *
 * Removes and returns the minimum element (root) from the heap.
 * The last element replaces the root and is "bubbled down" to maintain heap property.
 *
 * Time complexity: O(log n)
 *
 * @param {Array} heap - The heap array
 * @returns {Object|null} Minimum element or null if heap is empty
 */
export function pop(heap) {
  if (heap.length === 0) {
    return null;
  }

  const first = heap[0];
  const last = heap.pop();

  if (last !== first) {
    heap[0] = last;
    siftDown(heap, last, 0);
  }

  return first;
}
function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}
function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      return;
    }
  }
}
function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
