<!--
 * @Author: changcheng
 * @LastEditTime: 2023-08-02 14:11:22
-->

### Fiber uses depth-first traversal (last in, first out)

Depth-first search is abbreviated as DFS, which stands for Depth First Search

The process is to go as deep as possible along each possible branch path, and each node can only be visited once
Application scenarios

React virtual DOM construction

React fiber tree construction

Advantages: Low memory usage, Disadvantages: Inefficient when depth is very deep

```javaScript
let root = {
  name: "A",
  children: [
    {
      name: "B",
      children: [{ name: "B1" }, { name: "B2" }],
    },
    {
      name: "C",
      children: [{ name: "C1" }, { name: "C2" }],
    },
  ],
};
function dfs(node) {
  console.log(node.name);
   node.children?.forEach(dfs);
}
dfs(root);
```

### Breadth-first (BFS) (first in, first out)

Breadth-first search algorithm (also known as breadth-first search), its full English name is Breadth First Search

The algorithm first searches all vertices at distance k, then searches other vertices at distance k+1

Advantages: Small search depth, Disadvantages: High memory usage

```javaScript
let root = {
  name: "A",
  children: [
    {
      name: "B",
      children: [{ name: "B1" }, { name: "B2" }],
    },
    {
      name: "C",
      children: [{ name: "C1" }, { name: "C2" }],
    },
  ],
};
function bfs(node) {
  const stack = [];
  stack.push(node);
  let current;
  while ((current = stack.shift())) {
    console.log(current.name);
    current.children?.forEach(child => {
      stack.push(child);
    });
  }
}
bfs(root)
```
