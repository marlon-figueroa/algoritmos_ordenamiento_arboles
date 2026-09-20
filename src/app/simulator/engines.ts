import { SimFrame, VizNode, sortedCopy } from './models';
import {
  BinNode,
  attachLeft,
  attachRight,
  balanceFactor,
  createIdFactory,
  frameFromBinary,
  rotateLeft,
  rotateRight,
  updateHeight,
} from './tree';

function implicitHeapTree(arr: number[], heapSize: number, highlight: number[]): { nodes: VizNode[]; rootIds: string[] } {
  const nodes: VizNode[] = [];
  if (heapSize <= 0) {
    return { nodes, rootIds: [] };
  }
  for (let i = 0; i < heapSize; i++) {
    const children: string[] = [];
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < heapSize) {
      children.push(`h${left}`);
    }
    if (right < heapSize) {
      children.push(`h${right}`);
    }
    nodes.push({
      id: `h${i}`,
      keys: [arr[i]],
      childrenIds: children,
      color: 'none',
      highlight: highlight.includes(i),
      faded: false,
    });
  }
  return { nodes, rootIds: ['h0'] };
}

function inorderCollect(
  node: BinNode | null,
  treeRoot: BinNode | null,
  output: number[],
  frames: SimFrame[],
  array: number[],
): void {
  if (!node || node.faded) {
    return;
  }
  inorderCollect(node.left, treeRoot, output, frames, array);
  output.push(node.value);
  frames.push(
    frameFromBinary({
      message: `Inorden visita ${node.value}. Salida: [${output.join(', ')}].`,
      array,
      output,
      roots: [treeRoot],
      highlightIds: [node.id],
    }),
  );
  inorderCollect(node.right, treeRoot, output, frames, array);
}

function findValue(node: BinNode, value: number): string {
  let current: BinNode | null = node;
  while (current) {
    if (current.value === value) {
      return current.id;
    }
    current = value < current.value ? current.left : current.right;
  }
  return node.id;
}

export function simulateTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  let root: BinNode | null = null;

  frames.push(
    frameFromBinary({
      message: 'Árbol binario de búsqueda vacío. Cada inserción sigue izquierda < raíz ≤ derecha.',
      array: input,
      roots: [],
    }),
  );

  const insert = (node: BinNode | null, value: number): BinNode => {
    if (!node) {
      return new BinNode(value, nextId());
    }
    if (value < node.value) {
      attachLeft(node, insert(node.left, value));
    } else {
      attachRight(node, insert(node.right, value));
    }
    return node;
  };

  input.forEach((value, index) => {
    root = insert(root, value);
    frames.push(
      frameFromBinary({
        message: `Inserta ${value} en el BST.`,
        array: input,
        highlightedIndexes: [index],
        roots: [root],
        highlightIds: root ? [findValue(root, value)] : [],
      }),
    );
  });

  const output: number[] = [];
  inorderCollect(root, root, output, frames, input);
  frames.push(
    frameFromBinary({
      message: 'Tree Sort terminó. El recorrido inorden es el arreglo ordenado.',
      array: input,
      output,
      roots: [root],
      done: true,
    }),
  );
  return frames;
}

export function simulateHeapSort(input: number[]): SimFrame[] {
  const a = [...input];
  const frames: SimFrame[] = [];
  const n = a.length;

  const snap = (message: string, highlight: number[], heapSize: number, done = false) => {
    const tree = implicitHeapTree(a, heapSize, highlight);
    frames.push({
      message,
      array: [...a],
      output: a.slice(heapSize),
      highlightedIndexes: highlight,
      lockedIndexes: Array.from({ length: n - heapSize }, (_, i) => heapSize + i),
      nodes: tree.nodes,
      rootIds: tree.rootIds,
      done,
    });
  };

  const heapify = (size: number, i: number) => {
    while (true) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < size && a[left] > a[largest]) {
        largest = left;
      }
      if (right < size && a[right] > a[largest]) {
        largest = right;
      }
      if (largest === i) {
        break;
      }
      [a[i], a[largest]] = [a[largest], a[i]];
      snap(`Heapify: intercambia posiciones ${i} y ${largest} para restaurar el max-heap.`, [i, largest], size);
      i = largest;
    }
  };

  snap('El arreglo se lee como árbol binario completo (hijos 2i+1 y 2i+2).', [], n);
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }
  snap('Max-heap listo. La raíz es el mayor elemento.', [0], n);

  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    snap(`Mueve ${a[end]} al final ordenado y reduce el heap.`, [0, end], end);
    heapify(end, 0);
  }
  snap('Heap Sort terminó. El arreglo está ordenado de menor a mayor.', [], 0, true);
  return frames;
}

export function simulateTournamentSort(input: number[]): SimFrame[] {
  const frames: SimFrame[] = [];
  const n = input.length;
  const leafCount = Math.max(2, 2 ** Math.ceil(Math.log2(n)));
  const tree = Array.from({ length: 2 * leafCount }, () => Number.POSITIVE_INFINITY);
  for (let i = 0; i < n; i++) {
    tree[leafCount + i] = input[i];
  }
  for (let i = leafCount - 1; i >= 1; i--) {
    tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
  }
  const output: number[] = [];

  const toViz = (highlight: number[]) => {
    const nodes: VizNode[] = [];
    for (let i = 1; i < 2 * leafCount; i++) {
      const isLeaf = i >= leafCount;
      const children: string[] = [];
      if (!isLeaf) {
        children.push(`t${2 * i}`, `t${2 * i + 1}`);
      }
      nodes.push({
        id: `t${i}`,
        keys: [tree[i]],
        childrenIds: children,
        color: 'none',
        highlight: highlight.includes(i),
        faded: !Number.isFinite(tree[i]),
      });
    }
    return { nodes, rootIds: ['t1'] };
  };

  const snap = (message: string, highlight: number[], done = false) => {
    const viz = toViz(highlight);
    frames.push({
      message,
      array: [...input],
      output: [...output],
      highlightedIndexes: [],
      lockedIndexes: [],
      nodes: viz.nodes,
      rootIds: viz.rootIds,
      done,
    });
  };

  snap('Torneo construido: cada padre guarda el menor de sus hijos. La raíz es el campeón.', [1]);

  for (let round = 0; round < n; round++) {
    const winner = tree[1];
    output.push(winner);
    let i = 1;
    while (i < leafCount) {
      i = tree[2 * i] === winner ? 2 * i : 2 * i + 1;
    }
    const leaf = i;
    tree[leaf] = Number.POSITIVE_INFINITY;
    while (i > 1) {
      i = Math.floor(i / 2);
      tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
    }
    snap(
      `Campeón ${winner} pasa a la salida. Su hoja se sustituye por ∞ y se rejuega el camino.`,
      [1, leaf],
      round === n - 1,
    );
  }
  return frames;
}

function leo(k: number, cache: number[]): number {
  while (cache.length <= k) {
    cache.push(cache[cache.length - 1] + cache[cache.length - 2] + 1);
  }
  return cache[k];
}

function addLeonardoTree(
  arr: number[],
  root: number,
  order: number,
  cache: number[],
  highlight: number[],
  lockedFrom: number,
  nodes: VizNode[],
): void {
  const right = root - 1;
  const left = order > 1 ? root - 1 - leo(order - 2, cache) : -1;
  const children: string[] = [];
  if (order > 1) {
    addLeonardoTree(arr, left, order - 1, cache, highlight, lockedFrom, nodes);
    addLeonardoTree(arr, right, order - 2, cache, highlight, lockedFrom, nodes);
    children.push(`l${left}`, `l${right}`);
  }
  nodes.push({
    id: `l${root}`,
    keys: [arr[root]],
    childrenIds: children,
    color: 'none',
    highlight: highlight.includes(root),
    faded: root >= lockedFrom,
    label: order <= 1 ? `L${order}` : undefined,
  });
}

export function simulateSmoothsort(input: number[]): SimFrame[] {
  const a = [...input];
  const frames: SimFrame[] = [];
  const cache = [1, 1];
  const orders: number[] = [];
  const n = a.length;

  const rootsOf = () => {
    const roots: Array<{ index: number; order: number }> = [];
    let end = -1;
    for (const order of orders) {
      end += leo(order, cache);
      roots.push({ index: end, order });
    }
    return roots;
  };

  const forest = (highlight: number[], lockedFrom: number) => {
    const nodes: VizNode[] = [];
    const rootIds: string[] = [];
    for (const root of rootsOf()) {
      if (root.index >= lockedFrom) {
        continue;
      }
      addLeonardoTree(a, root.index, root.order, cache, highlight, lockedFrom, nodes);
      rootIds.push(`l${root.index}`);
    }
    return { nodes, rootIds };
  };

  const snap = (message: string, highlight: number[] = [], lockedFrom = n, done = false) => {
    const viz = forest(highlight, lockedFrom);
    frames.push({
      message,
      array: [...a],
      output: a.slice(lockedFrom),
      highlightedIndexes: highlight,
      lockedIndexes: Array.from({ length: n - lockedFrom }, (_, i) => lockedFrom + i),
      nodes: viz.nodes,
      rootIds: viz.rootIds,
      done,
    });
  };

  const sift = (root: number, order: number) => {
    while (order > 1) {
      const right = root - 1;
      const left = root - 1 - leo(order - 2, cache);
      let best = root;
      let bestOrder = order;
      if (left >= 0 && a[left] > a[best]) {
        best = left;
        bestOrder = order - 1;
      }
      if (right >= 0 && a[right] > a[best]) {
        best = right;
        bestOrder = order - 2;
      }
      if (best === root) {
        break;
      }
      [a[root], a[best]] = [a[best], a[root]];
      root = best;
      order = bestOrder;
    }
  };

  const growByOne = () => {
    if (orders.length >= 2 && orders[orders.length - 1] === orders[orders.length - 2] - 1) {
      const rightOrder = orders.pop()!;
      orders.pop();
      orders.push(rightOrder + 1);
    } else if (orders.length > 0 && orders[orders.length - 1] === 1) {
      orders.push(0);
    } else {
      orders.push(1);
    }
  };

  snap('Bosque de heaps de Leonardo vacío.');
  for (let i = 0; i < n; i++) {
    growByOne();
    sift(i, orders[orders.length - 1]);
    snap(`Inserta ${a[i]} y repara el heap de Leonardo derecho.`, [i], n);
  }

  snap('Cada raíz es el máximo de su heap. Se extrae el mayor del prefijo.', [n - 1], n);
  for (let i = n - 1; i > 0; i--) {
    orders.length = 0;
    for (let k = 0; k <= i; k++) {
      growByOne();
    }
    let maxIdx = 0;
    for (let j = 1; j <= i; j++) {
      if (a[j] > a[maxIdx]) {
        maxIdx = j;
      }
    }
    if (maxIdx !== i) {
      [a[maxIdx], a[i]] = [a[i], a[maxIdx]];
    }
    orders.length = 0;
    for (let k = 0; k < i; k++) {
      growByOne();
    }
    for (const root of rootsOf()) {
      sift(root.index, root.order);
    }
    snap(`Fija ${a[i]} al final. El bosque cubre los ${i} elementos restantes.`, [i], i);
  }
  snap('Smoothsort terminó.', [], 0, true);
  return frames;
}

export function simulateCartesianTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  const nodes = input.map((value) => new BinNode(value, nextId()));
  const stack: BinNode[] = [];
  let root: BinNode | null = null;

  frames.push(frameFromBinary({ message: 'Se construye un árbol cartesiano (mínimo como raíz).', array: input, roots: [] }));

  nodes.forEach((node, index) => {
    let last: BinNode | null = null;
    while (stack.length && stack[stack.length - 1].value > node.value) {
      last = stack.pop()!;
    }
    attachLeft(node, last);
    if (stack.length) {
      attachRight(stack[stack.length - 1], node);
    } else {
      root = node;
    }
    stack.push(node);
    frames.push(
      frameFromBinary({
        message: `Coloca ${node.value}: heap por valor, BST por posición original.`,
        array: input,
        highlightedIndexes: [index],
        roots: [root],
        highlightIds: [node.id],
      }),
    );
  });

  const output: number[] = [];
  const queue: BinNode[] = root ? [root] : [];
  while (queue.length) {
    queue.sort((a, b) => a.value - b.value);
    const node = queue.shift()!;
    output.push(node.value);
    node.faded = true;
    if (node.left && !node.left.faded) {
      queue.push(node.left);
    }
    if (node.right && !node.right.faded) {
      queue.push(node.right);
    }
    frames.push(
      frameFromBinary({
        message: `Extrae el mínimo visible ${node.value}. Sus hijos entran a la cola.`,
        array: input,
        output,
        roots: [root],
        highlightIds: [node.id],
        done: queue.length === 0,
      }),
    );
  }
  return frames;
}

export function simulateAvlTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  let root: BinNode | null = null;
  let lastNote = '';

  const rotateR = (node: BinNode): BinNode => {
    const parent = node.parent;
    const left = node.left!;
    attachLeft(node, left.right);
    attachRight(left, node);
    left.parent = parent;
    if (parent) {
      if (parent.left === node) {
        parent.left = left;
      } else {
        parent.right = left;
      }
    }
    updateHeight(node);
    updateHeight(left);
    lastNote = `rotación simple a la derecha sobre ${node.value}`;
    return left;
  };
  const rotateL = (node: BinNode): BinNode => {
    const parent = node.parent;
    const right = node.right!;
    attachRight(node, right.left);
    attachLeft(right, node);
    right.parent = parent;
    if (parent) {
      if (parent.left === node) {
        parent.left = right;
      } else {
        parent.right = right;
      }
    }
    updateHeight(node);
    updateHeight(right);
    lastNote = `rotación simple a la izquierda sobre ${node.value}`;
    return right;
  };

  const rebalance = (node: BinNode): BinNode => {
    updateHeight(node);
    const bf = balanceFactor(node);
    if (bf > 1) {
      if (balanceFactor(node.left!) < 0) {
        attachLeft(node, rotateL(node.left!));
        lastNote = `rotación doble LR sobre ${node.value}`;
      }
      return rotateR(node);
    }
    if (bf < -1) {
      if (balanceFactor(node.right!) > 0) {
        attachRight(node, rotateR(node.right!));
        lastNote = `rotación doble RL sobre ${node.value}`;
      }
      return rotateL(node);
    }
    return node;
  };

  const insert = (node: BinNode | null, value: number): BinNode => {
    if (!node) {
      return new BinNode(value, nextId());
    }
    if (value < node.value) {
      attachLeft(node, insert(node.left, value));
    } else {
      attachRight(node, insert(node.right, value));
    }
    return rebalance(node);
  };

  frames.push(frameFromBinary({ message: 'AVL vacío. Cada inserción reequilibra con rotaciones.', array: input, roots: [] }));
  input.forEach((value, index) => {
    lastNote = 'sin rotación';
    root = insert(root, value);
    let hops = 0;
    while (root.parent && hops++ < 32) {
      root = root.parent;
    }
    frames.push(
      frameFromBinary({
        message: `Inserta ${value} (${lastNote}).`,
        array: input,
        highlightedIndexes: [index],
        roots: [root],
        highlightIds: root ? [findValue(root, value)] : [],
      }),
    );
  });

  const output: number[] = [];
  inorderCollect(root, root, output, frames, input);
  frames.push(
    frameFromBinary({
      message: 'AVL Tree Sort terminó.',
      array: input,
      output,
      roots: [root],
      done: true,
    }),
  );
  return frames;
}

export function simulateRedBlackTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  let root: BinNode | null = null;

  const insertFix = (node: BinNode) => {
    let hops = 0;
    while (node.parent && node.parent.color === 'red' && hops++ < 32) {
      const parent = node.parent;
      const grand = parent.parent;
      if (!grand) {
        break;
      }
      const parentIsLeft = grand.left === parent;
      const uncle = parentIsLeft ? grand.right : grand.left;
      if (uncle && uncle.color === 'red') {
        parent.color = 'black';
        uncle.color = 'black';
        grand.color = 'red';
        node = grand;
        continue;
      }
      if (parentIsLeft) {
        if (parent.right === node) {
          root = rotateLeft(root!, parent);
          node = parent;
        }
        node.parent!.color = 'black';
        node.parent!.parent!.color = 'red';
        root = rotateRight(root!, node.parent!.parent!);
      } else {
        if (parent.left === node) {
          root = rotateRight(root!, parent);
          node = parent;
        }
        node.parent!.color = 'black';
        node.parent!.parent!.color = 'red';
        root = rotateLeft(root!, node.parent!.parent!);
      }
    }
    while (root?.parent) {
      root = root.parent;
    }
    if (root) {
      root.color = 'black';
    }
  };

  frames.push(
    frameFromBinary({
      message: 'Árbol rojo-negro vacío. Las inserciones se pintan de rojo y se reparan.',
      array: input,
      roots: [],
    }),
  );

  input.forEach((value, index) => {
    const created = new BinNode(value, nextId());
    created.color = 'red';
    if (!root) {
      root = created;
      root.color = 'black';
    } else {
      let current = root;
      while (true) {
        if (value < current.value) {
          if (!current.left) {
            attachLeft(current, created);
            break;
          }
          current = current.left;
        } else {
          if (!current.right) {
            attachRight(current, created);
            break;
          }
          current = current.right;
        }
      }
      insertFix(created);
    }
    frames.push(
      frameFromBinary({
        message: `Inserta ${value} y restaura las invariantes rojo-negro.`,
        array: input,
        highlightedIndexes: [index],
        roots: [root],
        highlightIds: [created.id],
      }),
    );
  });

  const output: number[] = [];
  inorderCollect(root, root, output, frames, input);
  frames.push(frameFromBinary({ message: 'Red-Black Tree Sort terminó.', array: input, output, roots: [root], done: true }));
  return frames;
}

class BNode {
  keys: number[] = [];
  children: BNode[] = [];
  leaf = true;
  constructor(public id: string) {}
}

function flattenBTree(root: BNode | null, highlight: number[]): { nodes: VizNode[]; rootIds: string[] } {
  const nodes: VizNode[] = [];
  const walk = (node: BNode) => {
    node.children.forEach(walk);
    nodes.push({
      id: node.id,
      keys: [...node.keys],
      childrenIds: node.children.map((child) => child.id),
      color: 'none',
      highlight: node.keys.some((key) => highlight.includes(key)),
      faded: false,
    });
  };
  if (!root) {
    return { nodes, rootIds: [] };
  }
  walk(root);
  return { nodes, rootIds: [root.id] };
}

export function simulateBTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  const t = 2;
  let root = new BNode(nextId());

  const snap = (message: string, highlight: number[] = [], output: number[] = [], done = false) => {
    const viz = flattenBTree(root, highlight);
    frames.push({
      message,
      array: [...input],
      output,
      highlightedIndexes: input.map((value, index) => (highlight.includes(value) ? index : -1)).filter((i) => i >= 0),
      lockedIndexes: [],
      nodes: viz.nodes,
      rootIds: viz.rootIds,
      done,
    });
  };

  const splitChild = (parent: BNode, i: number) => {
    const full = parent.children[i];
    const right = new BNode(nextId());
    right.leaf = full.leaf;
    const mid = t - 1;
    const median = full.keys[mid];
    right.keys = full.keys.splice(mid + 1);
    full.keys.splice(mid, 1);
    if (!full.leaf) {
      right.children = full.children.splice(mid + 1);
    }
    parent.keys.splice(i, 0, median);
    parent.children.splice(i + 1, 0, right);
    parent.leaf = false;
  };

  const insertNonFull = (node: BNode, value: number) => {
    let i = node.keys.length - 1;
    if (node.leaf) {
      node.keys.push(value);
      node.keys.sort((a, b) => a - b);
      return;
    }
    while (i >= 0 && value < node.keys[i]) {
      i--;
    }
    i++;
    if (node.children[i].keys.length === 2 * t - 1) {
      splitChild(node, i);
      if (value > node.keys[i]) {
        i++;
      }
    }
    insertNonFull(node.children[i], value);
  };

  snap('Árbol-B de grado mínimo t=2 (máximo 3 claves por nodo).');
  input.forEach((value) => {
    if (root.keys.length === 2 * t - 1) {
      const next = new BNode(nextId());
      next.leaf = false;
      next.children.push(root);
      splitChild(next, 0);
      root = next;
    }
    insertNonFull(root, value);
    snap(`Inserta ${value}. Si un nodo estaba lleno, se parte y la mediana sube.`, [value]);
  });

  const output: number[] = [];
  const traverse = (node: BNode) => {
    for (let i = 0; i < node.keys.length; i++) {
      if (!node.leaf) {
        traverse(node.children[i]);
      }
      output.push(node.keys[i]);
      snap(`Recorre la clave ${node.keys[i]}.`, [node.keys[i]], [...output]);
    }
    if (!node.leaf) {
      traverse(node.children[node.keys.length]);
    }
  };
  traverse(root);
  snap('B-Tree Sort terminó.', [], output, true);
  return frames;
}

export function simulateSplayTreeSort(input: number[]): SimFrame[] {
  const nextId = createIdFactory();
  const frames: SimFrame[] = [];
  let root: BinNode | null = null;

  const splay = (node: BinNode) => {
    let hops = 0;
    while (node.parent && hops++ < 64) {
      const parent = node.parent;
      const grand = parent.parent;
      if (!grand) {
        root = parent.left === node ? rotateRight(root!, parent) : rotateLeft(root!, parent);
      } else if ((grand.left === parent) === (parent.left === node)) {
        root = parent.left === node ? rotateRight(root!, grand) : rotateLeft(root!, grand);
        root = node.parent!.left === node ? rotateRight(root, node.parent!) : rotateLeft(root, node.parent!);
      } else {
        root = parent.left === node ? rotateRight(root!, parent) : rotateLeft(root!, parent);
        root = node.parent!.left === node ? rotateRight(root, node.parent!) : rotateLeft(root, node.parent!);
      }
    }
    root = node;
  };

  frames.push(frameFromBinary({ message: 'Splay tree vacío. Cada inserción termina en la raíz.', array: input, roots: [] }));
  input.forEach((value, index) => {
    const created = new BinNode(value, nextId());
    if (!root) {
      root = created;
    } else {
      let current = root;
      while (true) {
        if (value < current.value) {
          if (!current.left) {
            attachLeft(current, created);
            break;
          }
          current = current.left;
        } else {
          if (!current.right) {
            attachRight(current, created);
            break;
          }
          current = current.right;
        }
      }
      splay(created);
    }
    frames.push(
      frameFromBinary({
        message: `Inserta ${value} y hace splay hasta la raíz.`,
        array: input,
        highlightedIndexes: [index],
        roots: [root],
        highlightIds: [created.id],
      }),
    );
  });

  const output: number[] = [];
  inorderCollect(root, root, output, frames, input);
  frames.push(frameFromBinary({ message: 'Splay Tree Sort terminó.', array: input, output, roots: [root], done: true }));
  return frames;
}

const ENGINES: Record<string, (input: number[]) => SimFrame[]> = {
  'tree-sort': simulateTreeSort,
  'heap-sort': simulateHeapSort,
  'tournament-sort': simulateTournamentSort,
  smoothsort: simulateSmoothsort,
  'cartesian-tree-sort': simulateCartesianTreeSort,
  'avl-tree-sort': simulateAvlTreeSort,
  'red-black-tree-sort': simulateRedBlackTreeSort,
  'b-tree-sort': simulateBTreeSort,
  'splay-tree-sort': simulateSplayTreeSort,
};

export function simulate(slug: string, input: number[]): SimFrame[] {
  const engine = ENGINES[slug];
  if (!engine) {
    return [
      {
        message: 'Este algoritmo aún no tiene simulador.',
        array: input,
        output: sortedCopy(input),
        highlightedIndexes: [],
        lockedIndexes: [],
        nodes: [],
        rootIds: [],
        done: true,
      },
    ];
  }
  return engine(input);
}

export function lastOutput(frames: SimFrame[]): number[] {
  const last = frames[frames.length - 1];
  if (!last) {
    return [];
  }
  if (last.output.length) {
    return last.output;
  }
  return last.array;
}
