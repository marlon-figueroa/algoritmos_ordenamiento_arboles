import { SimFrame, VizNode, NodeColor } from './models';

export class BinNode {
  left: BinNode | null = null;
  right: BinNode | null = null;
  parent: BinNode | null = null;
  color: NodeColor = 'none';
  height = 1;
  faded = false;

  constructor(
    public value: number,
    public id: string,
  ) {}
}

export function createIdFactory(): () => string {
  let n = 0;
  return () => `n${++n}`;
}

export function heightOf(node: BinNode | null): number {
  return node ? node.height : 0;
}

export function updateHeight(node: BinNode): void {
  node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
}

export function balanceFactor(node: BinNode): number {
  return heightOf(node.left) - heightOf(node.right);
}

export function attachLeft(parent: BinNode, child: BinNode | null): void {
  parent.left = child;
  if (child) {
    child.parent = parent;
  }
}

export function attachRight(parent: BinNode, child: BinNode | null): void {
  parent.right = child;
  if (child) {
    child.parent = parent;
  }
}

export function rotateLeft(root: BinNode, x: BinNode): BinNode {
  const y = x.right;
  if (!y) {
    return root;
  }
  const parent = x.parent;
  attachRight(x, y.left);
  attachLeft(y, x);
  y.parent = parent;
  if (!parent) {
    root = y;
  } else if (parent.left === x) {
    parent.left = y;
  } else {
    parent.right = y;
  }
  updateHeight(x);
  updateHeight(y);
  return root;
}

export function rotateRight(root: BinNode, x: BinNode): BinNode {
  const y = x.left;
  if (!y) {
    return root;
  }
  const parent = x.parent;
  attachLeft(x, y.right);
  attachRight(y, x);
  y.parent = parent;
  if (!parent) {
    root = y;
  } else if (parent.left === x) {
    parent.left = y;
  } else {
    parent.right = y;
  }
  updateHeight(x);
  updateHeight(y);
  return root;
}

export function inorderValues(root: BinNode | null): number[] {
  const out: number[] = [];
  const walk = (node: BinNode | null) => {
    if (!node || node.faded) {
      return;
    }
    walk(node.left);
    out.push(node.value);
    walk(node.right);
  };
  walk(root);
  return out;
}

export function flattenBinary(
  roots: Array<BinNode | null>,
  highlightIds: string[] = [],
): { nodes: VizNode[]; rootIds: string[] } {
  const nodes: VizNode[] = [];
  const seen = new Set<string>();
  const highlight = new Set(highlightIds);

  const walk = (node: BinNode | null) => {
    if (!node || seen.has(node.id)) {
      return;
    }
    seen.add(node.id);
    walk(node.left);
    walk(node.right);
    nodes.push({
      id: node.id,
      keys: [node.value],
      childrenIds: [node.left?.id, node.right?.id].filter((id): id is string => Boolean(id)),
      color: node.color,
      highlight: highlight.has(node.id),
      faded: node.faded,
    });
  };

  const rootIds: string[] = [];
  for (const root of roots) {
    if (root) {
      walk(root);
      rootIds.push(root.id);
    }
  }
  return { nodes, rootIds };
}

export function frameFromBinary(options: {
  message: string;
  array: number[];
  output?: number[];
  highlightedIndexes?: number[];
  lockedIndexes?: number[];
  roots: Array<BinNode | null>;
  highlightIds?: string[];
  done?: boolean;
}): SimFrame {
  const tree = flattenBinary(options.roots, options.highlightIds);
  return {
    message: options.message,
    array: [...options.array],
    output: [...(options.output ?? [])],
    highlightedIndexes: [...(options.highlightedIndexes ?? [])],
    lockedIndexes: [...(options.lockedIndexes ?? [])],
    nodes: tree.nodes,
    rootIds: tree.rootIds,
    done: options.done ?? false,
  };
}
