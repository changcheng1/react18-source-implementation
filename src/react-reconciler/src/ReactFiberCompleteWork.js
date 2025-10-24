/**
 * React Fiber Complete Work - Complete Phase Implementation
 *
 * This module implements the "complete work" phase of React's reconciliation process.
 * During this phase, React creates DOM nodes, processes props, and builds the
 * complete DOM tree structure. This phase works bottom-up through the fiber tree.
 *
 * Key responsibilities:
 * - Create DOM nodes for host components
 * - Process and apply props to DOM elements
 * - Build parent-child DOM relationships
 * - Handle refs and side effects
 * - Optimize with bailout conditions
 *
 * @module ReactFiberCompleteWork
 */

import {
  createTextInstance,
  createInstance,
  appendInitialChild,
  finalizeInitialChildren,
  prepareUpdate,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { NoFlags, Update, Ref } from "./ReactFiberFlags";
import {
  HostComponent,
  HostRoot,
  HostText,
  FunctionComponent,
} from "./ReactWorkTags";
import { NoLanes, mergeLanes } from "./ReactFiberLane";

/**
 * Mark Ref
 *
 * Marks a fiber as having a ref that needs to be attached during commit phase.
 *
 * @param {Fiber} workInProgress - Fiber with ref to mark
 */
function markRef(workInProgress) {
  workInProgress.flags |= Ref;
}
/**
 * Append All Children
 *
 * Appends all child DOM nodes of the completed fiber to its parent DOM node.
 * This function traverses the fiber tree and builds the actual DOM hierarchy
 * by connecting child DOM elements to their parent.
 *
 * The traversal skips over component fibers (function/class components) and
 * only processes host components (DOM elements) and text nodes.
 *
 * @param {Element} parent - Parent DOM node to append children to
 * @param {Fiber} workInProgress - Completed fiber whose children should be appended
 */
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;

  while (node) {
    // If child is a host component (DOM element) or text node, append it
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // If child is a component (function/class), traverse to its children
      node = node.child;
      continue;
    }

    // If we've processed all children of workInProgress, we're done
    if (node === workInProgress) {
      return;
    }

    // If current node has no sibling, go back up the tree
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      // Move back to parent node
      node = node.return;
    }
    node = node.sibling;
  }
}
function markUpdate(workInProgress) {
  workInProgress.flags |= Update; //给当前的fiber添加更新的副作用
}
/**
 * 在fiber(button)的完成阶段准备更新DOM
 * @param {*} current button老fiber
 * @param {*} workInProgress button的新fiber
 * @param {*} type 类型
 * @param {*} newProps 新属性
 */
function updateHostComponent(current, workInProgress, type, newProps) {
  const oldProps = current.memoizedProps; //老的属性
  const instance = workInProgress.stateNode; //老的DOM节点
  //比较新老属性，收集属性的差异
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps);
  //让原生组件的新fiber更新队列等于[]
  workInProgress.updateQueue = updatePayload;
  if (updatePayload) {
    markUpdate(workInProgress);
  }
}
/**
 * 完成一个fiber节点
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的构建的fiber
 */
export function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress);
      break;
    //如果完成的是原生节点的话
    case HostComponent:
      ///现在只是在处理创建或者说挂载新节点的逻辑，后面此处分进行区分是初次挂载还是更新
      //创建真实的DOM节点
      const { type } = workInProgress;
      //如果老fiber存在，并且老fiber上真实DOM节点，要走节点更新的逻辑
      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current, workInProgress, type, newProps);
        if ((current.ref !== workInProgress.ref) !== null) {
          markRef(workInProgress);
        }
      } else {
        const instance = createInstance(type, newProps, workInProgress);
        //把自己所有的儿子都添加到自己的身上
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
        finalizeInitialChildren(instance, type, newProps);
        if (workInProgress.ref !== null) {
          markRef(workInProgress);
        }
      }
      bubbleProperties(workInProgress);
      break;
    case FunctionComponent:
      bubbleProperties(workInProgress);
      break;
    case HostText:
      //如果完成的fiber是文本节点，那就创建真实的文本节点
      const newText = newProps;
      //创建真实的DOM节点并传入stateNode
      workInProgress.stateNode = createTextInstance(newText);
      //向上冒泡属性
      bubbleProperties(workInProgress);
      break;
  }
}

function bubbleProperties(completedWork) {
  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;
  //遍历当前fiber的所有子节点，把所有的子节的副作用，以及子节点的子节点的副作用全部合并
  let child = completedWork.child;
  while (child !== null) {
    newChildLanes = mergeLanes(
      newChildLanes,
      mergeLanes(child.lanes, child.childLanes)
    );
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.childLanes = newChildLanes;
  completedWork.subtreeFlags = subtreeFlags;
}
