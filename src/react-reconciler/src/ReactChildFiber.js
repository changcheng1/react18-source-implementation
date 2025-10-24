/**
 * React Child Fiber - Reconciliation Algorithm Implementation
 *
 * This module implements React's reconciliation algorithm (also known as the "diffing" algorithm).
 * It's responsible for comparing the current fiber tree with the new virtual DOM tree and
 * determining what changes need to be made to efficiently update the DOM.
 *
 * Key concepts:
 * - Reconciliation: Process of comparing old and new trees
 * - Side effects: Tracking what DOM operations need to be performed
 * - Keys: Used for efficient list reconciliation
 * - Placement/Deletion flags: Mark fibers for DOM operations
 *
 * The reconciler handles:
 * - Single element reconciliation
 * - Array/list reconciliation with keys
 * - Text node reconciliation
 * - Deletion of removed elements
 *
 * @module ReactChildFiber
 */

import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { Placement, ChildDeletion } from "./ReactFiberFlags";
import isArray from "shared/isArray";
import { HostText } from "./ReactWorkTags";

/**
 * Create Child Reconciler
 *
 * Factory function that creates a child reconciler with configurable side effect tracking.
 * During mount phase, side effects aren't tracked since everything is new.
 * During update phase, side effects are tracked to determine what DOM operations are needed.
 *
 * @param {boolean} shouldTrackSideEffects - Whether to track side effects (placement, deletion)
 * @returns {Function} Reconciler function for processing children
 */
function createChildReconciler(shouldTrackSideEffects) {
  /**
   * Use Fiber
   *
   * Reuses an existing fiber by creating a work-in-progress copy with new props.
   * This is an optimization to avoid creating new fiber objects when possible.
   *
   * @param {Fiber} fiber - Existing fiber to reuse
   * @param {any} pendingProps - New props for the fiber
   * @returns {Fiber} Work-in-progress fiber
   */
  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  /**
   * Delete Child
   *
   * Marks a child fiber for deletion during the commit phase.
   * Adds the fiber to the parent's deletions array and sets the ChildDeletion flag.
   *
   * @param {Fiber} returnFiber - Parent fiber
   * @param {Fiber} childToDelete - Child fiber to mark for deletion
   */
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return;

    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      returnFiber.deletions.push(childToDelete);
    }
  }

  /**
   * Delete Remaining Children
   *
   * Marks all remaining children starting from currentFirstChild for deletion.
   * This is used when the new children list is shorter than the old one.
   *
   * @param {Fiber} returnFiber - Parent fiber
   * @param {Fiber} currentFirstChild - First child to start deleting from
   * @returns {null} Always returns null
   */
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return null;

    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }
  /**
   * Reconcile Single Element
   *
   * Reconciles a single React element with the existing fiber tree. This function
   * implements the core diffing logic for single elements, comparing keys and types
   * to determine if a fiber can be reused or if a new one needs to be created.
   *
   * Algorithm:
   * 1. Compare keys - if different, delete old fiber and create new one
   * 2. Compare types - if same key but different type, delete old and create new
   * 3. If key and type match, reuse existing fiber with new props
   *
   * @param {Fiber} returnFiber - Parent fiber (e.g., div#root fiber)
   * @param {Fiber} currentFirstChild - Existing first child fiber
   * @param {ReactElement} element - New virtual DOM element to reconcile
   * @returns {Fiber} New or reused first child fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    // Get the key from new virtual DOM element (used for reconciliation)
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      //判断此老fiber对应的key和新的虚拟DOM对象的key是否一样 null===null
      if (child.key === key) {
        //判断老fiber对应的类型和新虚拟DOM元素对应的类型是否相同
        if (child.type === element.type) {
          // p div
          deleteRemainingChildren(returnFiber, child.sibling);
          //如果key一样，类型也一样，则认为此节点可以复用
          const existing = useFiber(child, element.props);
          existing.ref = element.ref;
          existing.return = returnFiber;
          return existing;
        } else {
          //如果找到一key一样老fiber,但是类型不一样，不能此老fiber,把剩下的全部删除
          deleteRemainingChildren(returnFiber, child);
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    //因为我们现实的初次挂载，老节点currentFirstChild肯定是没有的，所以可以直接根据虚拟DOM创建新的Fiber节点
    const created = createFiberFromElement(element);
    created.ref = element.ref;
    created.return = returnFiber;
    return created;
  }
  /**
   * 设置副作用
   * @param {*} newFiber
   * @returns
   */
  function placeSingleChild(newFiber) {
    //说明要添加副作用
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      //要在最后的提交阶段插入此节点  React渲染分成渲染(创建Fiber树)和提交(更新真实DOM)二个阶段
      newFiber.flags |= Placement;
    }
    return newFiber;
  }
  function createChild(returnFiber, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      created.return = returnFiber;
      return created;
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          created.ref = newChild.ref;
          created.return = returnFiber;
          return created;
        }
        default:
          break;
      }
    }
    return null;
  }
  function placeChild(newFiber, lastPlacedIndex, newIdx) {
    //指定新的fiber在新的挂载索引
    newFiber.index = newIdx;
    //如果不需要跟踪副作用
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    //获取它的老fiber
    const current = newFiber.alternate;
    //如果有，说明这是一个更新的节点，有老的真实DOM。
    if (current !== null) {
      const oldIndex = current.index;
      //如果找到的老fiber的索引比lastPlacedIndex要小，则老fiber对应的DOM节点需要移动
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      //如果没有，说明这是一个新的节点，需要插入
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }
  function updateElement(returnFiber, current, element) {
    const elementType = element.type;
    if (current !== null) {
      //判断是否类型一样，则表示key和type都一样，可以复用老的fiber和真实DOM
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.ref = element.ref;
        existing.return = returnFiber;
        return existing;
      }
    }
    const created = createFiberFromElement(element);
    created.ref = element.ref;
    created.return = returnFiber;
    return created;
  }
  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (newChild !== null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          //如果key一样，进入更新元素的逻辑
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild);
          }
        }
        default:
          return null;
      }
    }
    return null;
  }
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;
    while (existingChild != null) {
      //如果有key用key,如果没有key使用索引
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }
  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }
  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild);
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key
            ) || null;
          return updateElement(returnFiber, matchedFiber, newChild);
        }
      }
    }
  }
  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    let resultingFirstChild = null; //返回的第一个新儿子
    let previousNewFiber = null; //上一个的一个新的儿fiber
    let newIdx = 0; //用来遍历新的虚拟DOM的索引
    let oldFiber = currentFirstChild; //第一个老fiber
    let nextOldFiber = null; //下一个第fiber
    let lastPlacedIndex = 0; //上一个不需要移动的老节点的索引
    // 开始第一轮循环 如果老fiber有值，新的虚拟DOM也有值
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      //先暂下一个老fiber
      nextOldFiber = oldFiber.sibling;
      //试图更新或者试图复用老的fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      if (newFiber === null) {
        break;
      }
      if (shouldTrackSideEffects) {
        //如果有老fiber,但是新的fiber并没有成功复用老fiber和老的真实DOM，那就删除老fiber,在提交阶段会删除真实DOM
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }
      //指定新fiber的位置
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber; //li(A).sibling=p(B).sibling=>li(C)
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    //新的虚拟DOM已经循环完毕，3=>2
    if (newIdx === newChildren.length) {
      //删除剩下的老fiber
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }
    if (oldFiber === null) {
      //如果老的 fiber已经没有了， 新的虚拟DOM还有，进入插入新节点的逻辑
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) continue;
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        //如果previousNewFiber为null，说明这是第一个fiber
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber; //这个newFiber就是大儿子
        } else {
          //否则说明不是大儿子，就把这个newFiber添加上一个子节点后面
          previousNewFiber.sibling = newFiber;
        }
        //让newFiber成为最后一个或者说上一个子fiber
        previousNewFiber = newFiber;
      }
    }
    // 开始处理移动的情况
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    //开始遍历剩下的虚拟DOM子节点
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          //如果要跟踪副作用，并且有老fiber
          if (newFiber.alternate !== null) {
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key
            );
          }
        }
        //指定新的fiber存放位置 ，并且给lastPlacedIndex赋值
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber; //这个newFiber就是大儿子
        } else {
          //否则说明不是大儿子，就把这个newFiber添加上一个子节点后面
          previousNewFiber.sibling = newFiber;
        }
        //让newFiber成为最后一个或者说上一个子fiber
        previousNewFiber = newFiber;
      }
    }
    if (shouldTrackSideEffects) {
      //等全部处理完后，删除map中所有剩下的老fiber
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }
    return resultingFirstChild;
  }
  /**
   * 比较子Fibers  DOM-DIFF 就是用老的子fiber链表和新的虚拟DOM进行比较的过程
   * @param {*} returnFiber 新的父Fiber
   * @param {*} currentFirstChild 老fiber第一个子fiber   current一般来说指的是老
   * @param {*} newChild 新的子虚拟DOM  h1虚拟DOM
   */
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    //现在需要处理更新的逻辑了，处理dom diff
    //现在暂时只考虑新的节点只有一个的情况
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
          );
        default:
          break;
      }
    }
    //newChild [hello文本节点,span虚拟DOM元素]
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }
    return null;
  }
  return reconcileChildFibers;
}
//有老父fiber更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true);
//如果没有老父fiber,初次挂载的时候用这个
export const mountChildFibers = createChildReconciler(false);
