import { VizNode } from './models';

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const KEY_W = 28;
const PAD = 12;
const MIN_GAP = 18;

export function layoutForest(
  nodes: VizNode[],
  rootIds: string[],
  width: number,
  height: number,
): Map<string, NodePosition> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pos = new Map<string, NodePosition>();
  if (rootIds.length === 0 || nodes.length === 0) {
    return pos;
  }

  const sizeOf = (id: string): number => {
    const node = byId.get(id);
    if (!node) {
      return 1;
    }
    const self = Math.max(node.keys.length, 1) * KEY_W + PAD;
    if (node.childrenIds.length === 0) {
      return self;
    }
    const kids = node.childrenIds.reduce((sum, child) => sum + sizeOf(child), 0) + MIN_GAP * (node.childrenIds.length - 1);
    return Math.max(self, kids);
  };

  const depths = new Map<string, number>();
  const mark = (id: string, depth: number) => {
    depths.set(id, depth);
    const node = byId.get(id);
    node?.childrenIds.forEach((child) => mark(child, depth + 1));
  };
  rootIds.forEach((id) => mark(id, 0));
  const maxDepth = Math.max(0, ...depths.values());

  const place = (id: string, left: number, span: number) => {
    const node = byId.get(id);
    if (!node) {
      return;
    }
    const depth = depths.get(id) ?? 0;
    const nodeWidth = Math.max(node.keys.length, 1) * KEY_W + PAD;
    const nodeHeight = node.keys.length > 1 ? 36 : 32;
    const x = left + span / 2;
    const y = 28 + (maxDepth === 0 ? 0 : (depth / Math.max(maxDepth, 1)) * (height - 64));
    pos.set(id, { x, y, width: nodeWidth, height: nodeHeight });

    if (node.childrenIds.length === 0) {
      return;
    }
    const childSizes = node.childrenIds.map(sizeOf);
    const total = childSizes.reduce((sum, size) => sum + size, 0) + MIN_GAP * (childSizes.length - 1);
    let cursor = left + Math.max(0, (span - total) / 2);
    node.childrenIds.forEach((child, index) => {
      const size = childSizes[index];
      place(child, cursor, size);
      cursor += size + MIN_GAP;
    });
  };

  const rootSizes = rootIds.map(sizeOf);
  const forest = rootSizes.reduce((sum, size) => sum + size, 0) + MIN_GAP * Math.max(rootIds.length - 1, 0);
  const scale = forest > 0 ? Math.min(1, (width - 24) / forest) : 1;
  let cursor = (width - forest * scale) / 2;
  rootIds.forEach((id, index) => {
    const span = rootSizes[index] * scale;
    place(id, cursor, span);
    cursor += span + MIN_GAP * scale;
  });

  return pos;
}
