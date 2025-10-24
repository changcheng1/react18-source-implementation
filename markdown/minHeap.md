<!--
 * @Author: changcheng
 * @LastEditTime: 2023-10-09 21:27:27
-->
### Min Heap

1. A min heap is a sorted complete binary tree

2. The data value of any non-terminal node is not greater than the value of its left and right child nodes

3. The root node value is the smallest among all heap node values

Index relationships

+ Left child index = (parent index * 2) + 1

+ Right child index = left child index + 1

+ Parent index = (child index - 1) / 2



### Why use min heap

1. This is because in the min heap structure, the minimum value is at the first position, and React can quickly extract the minimum value.

2. Why does React extract the minimum value instead of the maximum value? We can think of it this way: React breaks update tasks into multiple small tasks, each small task's data structure is an object with expirationTime, where expirationTime represents the expiration time of this task. The smaller the expirationTime, the closer the expiration time, and the higher the priority of the task. Extracting the minimum value is equivalent to extracting the highest priority task.


### Min heap scheduling


1. peek() View the top of the heap

2. pop() After popping the top of the heap, need to call siftDown function to adjust the heap downward

3. push() After adding a new node, need to call siftUp function to adjust the heap upward

4. siftDown() Adjust heap structure downward to ensure min heap

5. siftUp() Need to adjust heap structure upward to ensure min heap

```javaScript
//scheduler/src/SchedulerMinHeap.js
/**
 * Add a node
 * @param {*} heap 
 * @param {*} node 
 */
export function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}
/**
 * View the top node of the heap
 * @param {*} heap 
 * @returns 
 */
export function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}
/**
 * Pop the top node of the heap
 * @param {*} heap 
 * @returns 
 */
export function pop(heap) {
  if (heap.length === 0) {
    return null;
  }
  // Take out the first element, which is the top element of the heap
  const first = heap[0];
  // Take out the last element, which is the tail element of the heap
  const last = heap.pop();
  if (last !== first) {
    // Swap the top and tail of the heap, then adjust downward from the top
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first;
}
/**
 * Adjust a node upward to put it in the correct position
 * @param {*} heap min heap
 * @param {*} node node
 * @param {*} i index
 * @returns 
 */
function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    // Get parent index (child-1)/2 is equivalent to right shift, this way of writing has the advantage of direct rounding
    const parentIndex = index - 1 >>> 1;
    // Get parent node
    const parent = heap[parentIndex];
    // Parent node is larger than child node
    if (compare(parent, node) > 0) {
      // Put child's value to parent index
      heap[parentIndex] = node;
      // Put parent's value to child index
      heap[index] = parent;
      // Let index = parent index
      index = parentIndex;
    } else {
      // Child node is larger than parent node
      return;
    }
  }
}
/**
 * Adjust a node downward to put it in the correct position
 * @param {*} heap min heap
 * @param {*} node node
 * @param {*} i index
 * @returns 
 */
function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  // Similar to binary search, but this is sorting
  const halfLength = length >>> 1;
  while (index < halfLength) {
    // Left index
    const leftIndex = (index + 1) * 2 - 1;
    // Left child node
    const left = heap[leftIndex];
    // Right index
    const rightIndex = leftIndex + 1;
    // Right node
    const right = heap[rightIndex];
    // Compare and move index
    if (compare(left, node) < 0) {
     // Right node is smaller than left node, swap parent and right node
      if (rightIndex < length && compare(right, left) < 0) {
        // Current index is right node
        heap[index] = right;
        // Right index set as parent node
        heap[rightIndex] = node;
        // Index equals right index
        index = rightIndex;
      } else {
        // Current index set as left node
        heap[index] = left;
        // Left index set as parent node
        heap[leftIndex] = node;
        // Index equals left index
        index = leftIndex;
      }
    // Right node is smaller than parent node
    } else if (rightIndex < length && compare(right, node) < 0) {
      // Current index is right node
      heap[index] = right;
      // Right index is parent node
      heap[rightIndex] = node;
      // Index set as right index
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
```

```javaScript
const { push, pop, peek } = require('./SchedulerMinHeap');
let heap = [];
let id = 1;
push(heap, { sortIndex: 1,id:id++ });
push(heap, { sortIndex: 2,id:id++  });
push(heap, { sortIndex: 3,id:id++ });
console.log(peek(heap));
push(heap, { sortIndex: 4 });
push(heap, { sortIndex: 5 });
push(heap, { sortIndex: 6 });
push(heap, { sortIndex: 7 });
console.log(peek(heap));
pop(heap);
console.log(peek(heap));
```