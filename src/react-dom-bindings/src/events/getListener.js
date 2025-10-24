/*
 * @Author: changcheng 364000100@#qq.com
 * @Date: 2025-10-24 11:20:15
 * @LastEditors: changcheng 364000100@#qq.com
 * @LastEditTime: 2025-10-24 14:31:12
 * @FilePath: /myself-space/mini_React/src/react-dom-bindings/src/events/getListener.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { getFiberCurrentPropsFromNode } from "../client/ReactDOMComponentTree";

/**
 * get the callback function of the fiber
 * @param {*} inst
 * @param {*} registrationName
 */
export default function getListener(inst, registrationName) {
  const { stateNode } = inst;
  if (stateNode === null) return null;
  const props = getFiberCurrentPropsFromNode(stateNode);
  if (props === null) return null;
  const listener = props[registrationName]; //props.onClick
  return listener;
}
