export type NodeColor = 'red' | 'black' | 'none';

export interface VizNode {
  id: string;
  keys: number[];
  childrenIds: string[];
  color: NodeColor;
  highlight: boolean;
  faded: boolean;
  label?: string;
}

export interface SimFrame {
  message: string;
  array: number[];
  output: number[];
  highlightedIndexes: number[];
  lockedIndexes: number[];
  nodes: VizNode[];
  rootIds: string[];
  done: boolean;
}

export interface SimEngine {
  slug: string;
  run(input: number[]): SimFrame[];
}

export const emptyFrame: SimFrame = {
  message: 'Introduce un arreglo para comenzar la simulación.',
  array: [],
  output: [],
  highlightedIndexes: [],
  lockedIndexes: [],
  nodes: [],
  rootIds: [],
  done: false,
};

export const SAMPLE_INPUTS: Record<string, number[]> = {
  'tree-sort': [7, 3, 9, 1, 5],
  'heap-sort': [4, 10, 3, 5, 1],
  'tournament-sort': [6, 1, 4, 3, 8],
  smoothsort: [1, 2, 4, 3, 5, 8],
  'cartesian-tree-sort': [9, 3, 7, 1, 8, 12],
  'avl-tree-sort': [1, 2, 3, 4, 5, 6],
  'red-black-tree-sort': [10, 20, 30, 15, 25],
  'b-tree-sort': [10, 20, 5, 6, 12, 30, 7],
  'splay-tree-sort': [4, 2, 6, 1, 5, 8],
};

export const MAX_VALUES = 12;

export function formatValue(value: number): string {
  return Number.isFinite(value) ? String(value) : '∞';
}

export function parseInput(raw: string): number[] {
  const values = raw
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => Number(token));

  if (values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new Error('Usa solo enteros separados por coma o espacio.');
  }
  if (values.length < 2) {
    throw new Error('Necesitas al menos 2 números.');
  }
  if (values.length > MAX_VALUES) {
    throw new Error(`Como máximo ${MAX_VALUES} números para que el árbol se lea bien.`);
  }
  return values;
}

export function sortedCopy(input: number[]): number[] {
  return [...input].sort((a, b) => a - b);
}
