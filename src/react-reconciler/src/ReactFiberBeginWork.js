/**
 * React Fiber Begin Work - Render Phase Implementation
 *
 * This module implements the "begin work" phase of React's reconciliation process.
 * During this phase, React processes each fiber node, updates its state and props,
 * and creates child fibers based on the new virtual DOM.
 *
 * Key responsibilities:
 * - Process different types of components (host, function, class)
 * - Reconcile children (create, update, delete child fibers)
 * - Handle state updates and prop changes
 * - Optimize rendering with bailout conditions
 *
 * @module ReactFiberBeginWork
 */

import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
  FunctionComponent,
} from "./ReactWorkTags";
import {
  processUpdateQueue,
  cloneUpdateQueue,
} from "./ReactFiberClassUpdateQueue";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { renderWithHooks } from "react-reconciler/src/ReactFiberHooks";
import { NoLane, NoLanes } from "./ReactFiberLane";

/**
 * Reconcile Children
 *
 * Creates a new fiber child list based on the new virtual DOM. This function
 * implements React's reconciliation algorithm (diffing) to determine what
 * changes need to be made to the DOM.
 *
 * @param {Fiber|null} current - Current (old) parent fiber
 * @param {Fiber} workInProgress - Work-in-progress (new) parent fiber
 * @param {ReactElement|ReactElement[]|string|number} nextChildren - New child virtual DOM
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    // If there's no current fiber, this is a mount (initial render)
    // All children are new, so we use mountChildFibers which doesn't track side effects
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // If there's a current fiber, this is an update
    // We need to diff the old child fiber list with new virtual DOM
    // This enables minimal updates and proper side effect tracking
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps;
  cloneUpdateQueue(current, workInProgress);
  //需要知道它的子虚拟DOM，知道它的儿子的虚拟DOM信息
  processUpdateQueue(workInProgress, nextProps, renderLanes); //workInProgress.memoizedState={ element }
  const nextState = workInProgress.memoizedState;
  //nextChildren就是新的子虚拟DOM
  const nextChildren = nextState.element; //h1
  //根据新的虚拟DOM生成子fiber链表
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child; //{tag:5,type:'h1'}
}
/**
 * 构建原生组件的子fiber链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber h1
 */
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;
  //判断当前虚拟DOM它的儿子是不是一个文本独生子
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  if (isDirectTextChild) {
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}
/**
 * 挂载函数组件
 * @param {*} current  老fiber
 * @param {*} workInProgress 新的fiber
 * @param {*} Component 组件类型，也就是函数组件的定义
 */
export function mountIndeterminateComponent(
  current,
  workInProgress,
  Component
) {
  const props = workInProgress.pendingProps;
  //const value = Component(props);
  const value = renderWithHooks(current, workInProgress, Component, props);
  workInProgress.tag = FunctionComponent;
  reconcileChildren(current, workInProgress, value);
  return workInProgress.child;
}
export function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}
/**
 * 目标是根据新虚拟DOM构建新的fiber子链表 child .sibling
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的fiber h1
 * @returns
 */
export function beginWork(current, workInProgress, renderLanes) {
  //在构建fiber树之后清空lanes
  workInProgress.lanes = 0;
  switch (workInProgress.tag) {
    // 因为在React里组件其实有两种，一种是函数组件，一种是类组件，但是它们都是都是函数
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes
      );
    case FunctionComponent: {
      const Component = workInProgress.type;
      const nextProps = workInProgress.pendingProps;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        nextProps,
        renderLanes
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return null;
    default:
      return null;
  }
}
