export interface AlgorithmComplexity {
  best: string;
  average: string;
  worst: string;
  space: string;
}

export interface Algorithm {
  slug: string;
  name: string;
  treeType: string;
  summary: string;
  description: string;
  howItWorks: string[];
  complexity: AlgorithmComplexity;
  stable: boolean;
  inPlace: boolean;
  pseudocode: string;
  example: string;
}

export const ALGORITHMS: Algorithm[] = [
  {
    slug: 'tree-sort',
    name: 'Tree Sort',
    treeType: 'Árbol binario de búsqueda',
    summary: 'Inserta cada elemento en un BST y recorre el árbol en inorden para obtener la secuencia ordenada.',
    description:
      'Tree Sort construye un árbol binario de búsqueda (BST) con los elementos de la entrada. Como el recorrido inorden de un BST visita las claves de menor a mayor, ese recorrido produce el arreglo ordenado. Es uno de los algoritmos de ordenamiento más directos basados en árboles y sirve de base para variantes equilibradas como AVL o rojo-negro.',
    howItWorks: [
      'Crea un árbol binario de búsqueda vacío.',
      'Inserta cada valor de la entrada como un nodo, respetando la regla izquierda < raíz < derecha.',
      'Si hay duplicados, se colocan de forma consistente a un lado (por ejemplo, a la derecha) para no perder elementos.',
      'Al terminar las inserciones, recorre el árbol en inorden (izquierda, raíz, derecha).',
      'Cada visita escribe el siguiente valor en el resultado ordenado.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n²)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function treeSort(arr):
  root ← null
  for x in arr:
    root ← insert(root, x)
  result ← []
  inorder(root, result)
  return result

function insert(node, x):
  if node is null: return Node(x)
  if x < node.value: node.left ← insert(node.left, x)
  else: node.right ← insert(node.right, x)
  return node

function inorder(node, out):
  if node is null: return
  inorder(node.left, out)
  out.append(node.value)
  inorder(node.right, out)`,
    example: 'Entrada: [7, 3, 9, 1, 5]\nBST: 7 como raíz, 3 a la izquierda (1 y 5 como hijos) y 9 a la derecha.\nInorden: 1, 3, 5, 7, 9.',
  },
  {
    slug: 'heap-sort',
    name: 'Heap Sort',
    treeType: 'Montículo binario',
    summary: 'Usa un heap máximo para extraer repetidamente el mayor elemento y colocarlo al final del arreglo.',
    description:
      'Heap Sort aprovecha la estructura de un montículo binario, un árbol completo implícito en un arreglo. Tras construir un max-heap, el mayor elemento está en la raíz. Se intercambia con la última posición y se reduce el heap, restaurando la propiedad con heapify. El proceso se repite hasta ordenar todo el arreglo.',
    howItWorks: [
      'Interpreta el arreglo como un árbol binario completo (hijo izquierdo 2i+1, derecho 2i+2).',
      'Construye un max-heap desde el último padre hacia la raíz (heapify).',
      'Intercambia la raíz (máximo) con el último elemento del heap.',
      'Reduce el tamaño del heap en uno y restaura la propiedad de montículo.',
      'Repite hasta que el heap tenga un solo elemento; el arreglo queda ordenado.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(1)',
    },
    stable: false,
    inPlace: true,
    pseudocode: `function heapSort(arr):
  n ← length(arr)
  for i from n/2 - 1 down to 0:
    heapify(arr, n, i)
  for end from n - 1 down to 1:
    swap(arr[0], arr[end])
    heapify(arr, end, 0)

function heapify(arr, size, i):
  largest ← i
  left ← 2i + 1
  right ← 2i + 2
  if left < size and arr[left] > arr[largest]: largest ← left
  if right < size and arr[right] > arr[largest]: largest ← right
  if largest ≠ i:
    swap(arr[i], arr[largest])
    heapify(arr, size, largest)`,
    example: 'Entrada: [4, 10, 3, 5, 1]\nMax-heap: [10, 5, 3, 4, 1]\nExtrae 10 → [5, 4, 3, 1, 10]\nExtrae 5 → [4, 1, 3, 5, 10]\nResultado: [1, 3, 4, 5, 10].',
  },
  {
    slug: 'tournament-sort',
    name: 'Tournament Sort',
    treeType: 'Árbol de torneo',
    summary: 'Organiza comparaciones como un torneo: el ganador sube y, al extraerlo, se rellena el hueco con el siguiente candidato.',
    description:
      'Tournament Sort modela las comparaciones como un árbol de copa. Las hojas son los elementos y cada nodo interno guarda el menor (o mayor) de sus hijos. El campeón de la raíz es el siguiente valor ordenado. Tras extraerlo, se reemplaza por un centinela y se actualiza solo el camino hacia la raíz, lo que reutiliza comparaciones previas.',
    howItWorks: [
      'Coloca los n elementos como hojas de un árbol binario completo.',
      'Cada padre guarda el ganador de sus dos hijos (por ejemplo, el menor).',
      'El valor de la raíz es el siguiente elemento de la salida ordenada.',
      'Sustituye esa hoja por un valor centinela (∞) y recalcula solo los ancestros.',
      'Repite n veces hasta vaciar el torneo.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function tournamentSort(arr):
  tree ← buildTournament(arr)  // hojas = arr
  result ← []
  for i from 1 to n:
    winner ← tree[root]
    result.append(winner)
    replaceLeaf(tree, winner, ∞)
    replayPathToRoot(tree)
  return result`,
    example: 'Entrada: [6, 1, 4, 3]\nPrimera final: 1 gana el torneo.\nSe sustituye 1 por ∞ y se rejuega su rama.\nSiguiente campeón: 3, luego 4 y 6.\nSalida: [1, 3, 4, 6].',
  },
  {
    slug: 'smoothsort',
    name: 'Smoothsort',
    treeType: 'Montículos de Leonardo',
    summary: 'Variante de heap sort adaptativa que usa heaps de Leonardo y se acerca a O(n) cuando la entrada ya está casi ordenada.',
    description:
      'Smoothsort, diseñado por Dijkstra, ordena in-place con una secuencia de montículos cuyas tallas son números de Leonardo. A diferencia de Heap Sort clásico, aprovecha el orden existente: si los datos ya están ordenados, el trabajo extra es lineal. Es más complejo de implementar, pero ilustra cómo la forma del árbol cambia el comportamiento práctico.',
    howItWorks: [
      'Crece una sucesión de heaps de Leonardo de izquierda a derecha sobre el arreglo.',
      'Cada heap cumple la propiedad de montículo con raíces encadenadas por tamaño.',
      'Al incorporar un elemento, se fusionan heaps consecutivos si sus tamaños son Leonardo consecutivos.',
      'En la fase de extracción se toma la raíz derecha (máximo actual) y se reequilibra.',
      'Si la entrada ya está ordenada, las fusiones y reparaciones son mínimas (casi O(n)).',
    ],
    complexity: {
      best: 'O(n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(1)',
    },
    stable: false,
    inPlace: true,
    pseudocode: `function smoothsort(arr):
  forest ← empty Leonardo forest
  for x in arr:
    insertLeonardo(forest, x)   // puede fusionar heaps L(k) y L(k-1)
  while forest is not empty:
    max ← root of rightmost heap
    append max to sorted suffix
    extractAndRestore(forest)`,
    example: 'Entrada casi ordenada: [1, 2, 4, 3, 5]\nLos heaps de Leonardo se forman con poco desorden.\nSolo 4 y 3 provocan una reparación local.\nResultado: [1, 2, 3, 4, 5] con trabajo cercano a lineal.',
  },
  {
    slug: 'cartesian-tree-sort',
    name: 'Cartesian Tree Sort',
    treeType: 'Árbol cartesiano',
    summary: 'Construye un árbol cartesiano (heap por valor, BST por posición) y extrae los elementos con una cola de prioridad.',
    description:
      'Un árbol cartesiano combina orden de montículo en los valores y orden de árbol binario de búsqueda en las posiciones originales. Cartesian Tree Sort construye esa estructura en tiempo lineal y luego extrae siempre el mínimo pendiente de entre las raíces disponibles, lo que produce una secuencia ordenada respetando la geometría del arreglo.',
    howItWorks: [
      'Construye el árbol cartesiano: el mínimo (o máximo) global es la raíz.',
      'El subarreglo a la izquierda forma el hijo izquierdo; el de la derecha, el derecho.',
      'Inserta la raíz en una cola de prioridad.',
      'Extrae el mínimo, y encola sus hijos (siguientes candidatos visibles).',
      'Repite hasta vaciar la cola; el orden de extracción es el arreglo ordenado.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function cartesianTreeSort(arr):
  root ← buildCartesianTree(arr)  // O(n)
  pq ← min-priority queue of nodes
  pq.push(root)
  result ← []
  while pq is not empty:
    node ← pq.pop()
    result.append(node.value)
    if node.left: pq.push(node.left)
    if node.right: pq.push(node.right)
  return result`,
    example: 'Entrada: [9, 3, 7, 1, 8, 12, 10]\nMínimo 1 es la raíz.\nIzquierda: árbol de [9, 3, 7]; derecha: árbol de [8, 12, 10].\nExtracciones: 1, 3, 7, 8, 9, 10, 12.',
  },
  {
    slug: 'avl-tree-sort',
    name: 'AVL Tree Sort',
    treeType: 'Árbol AVL',
    summary: 'Igual que Tree Sort, pero el BST se autoequilibra con rotaciones AVL para garantizar O(n log n) en el peor caso.',
    description:
      'AVL Tree Sort evita la degradación a O(n²) de un BST sesgado. Tras cada inserción se actualiza el factor de equilibrio y, si un subárbol se desvía en más de una unidad, se aplican rotaciones simples o dobles. El recorrido inorden final sigue siendo el que entrega los valores ordenados.',
    howItWorks: [
      'Inserta cada elemento en un árbol AVL, no en un BST ordinario.',
      'Calcula alturas y factores de equilibrio de los ancestros.',
      'Si un nodo queda con factor +2 o -2, aplica rotación LL, RR, LR o RL.',
      'El árbol permanece con altura O(log n) durante toda la construcción.',
      'El recorrido inorden produce la secuencia ordenada.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function avlTreeSort(arr):
  root ← null
  for x in arr:
    root ← avlInsert(root, x)  // inserta y rebalancea
  result ← []
  inorder(root, result)
  return result

function avlInsert(node, x):
  node ← bstInsert(node, x)
  return rebalance(node)`,
    example: 'Entrada ordenada: [1, 2, 3, 4]\nEn un BST degeneraría a una lista.\nCon AVL, 2 termina como raíz y el árbol queda equilibrado.\nInorden: 1, 2, 3, 4 en O(n log n).',
  },
  {
    slug: 'red-black-tree-sort',
    name: 'Red-Black Tree Sort',
    treeType: 'Árbol rojo-negro',
    summary: 'Inserta en un árbol rojo-negro y recorre en inorden; las reglas de color evitan árboles degenerados.',
    description:
      'Los árboles rojo-negro son BST autoequilibrados usados en muchas bibliotecas estándar. Cada nodo es rojo o negro y las inserciones restauran las invariantes con recoloreo y rotaciones. Como la altura es O(log n), ordenar n elementos insertándolos y recorriendo inorden cuesta O(n log n) incluso en el peor caso.',
    howItWorks: [
      'Inserta cada valor como en un BST y píntalo de rojo.',
      'Restaura las invariantes: la raíz es negra, no hay dos rojos consecutivos y los caminos tienen el mismo número de negros.',
      'Usa recoloreo y rotaciones en el tío/padre/abuelo según el caso.',
      'Al finalizar, el árbol tiene altura acotada por ~2 log n.',
      'El inorden entrega la secuencia ordenada.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function redBlackTreeSort(arr):
  root ← null
  for x in arr:
    root ← rbInsert(root, x)
  result ← []
  inorder(root, result)
  return result`,
    example: 'Entrada: [10, 20, 30]\nSin equilibrio sería una cadena 10-20-30.\nEl árbol rojo-negro rota y 20 queda como raíz negra, con 10 y 30 de hijos.\nInorden: 10, 20, 30.',
  },
  {
    slug: 'b-tree-sort',
    name: 'B-Tree Sort',
    treeType: 'Árbol-B',
    summary: 'Inserta claves en un árbol-B (nodos con múltiples claves) y recorre los nodos de izquierda a derecha.',
    description:
      'Un árbol-B mantiene varias claves por nodo y muchos hijos, lo que reduce la altura y es ideal cuando los datos no caben en memoria. B-Tree Sort inserta todas las claves y luego recorre el árbol: en cada nodo se visitan hijo, clave, hijo, clave… Esa visita produce las claves ordenadas y se usa en índices de bases de datos y archivos externos.',
    howItWorks: [
      'Elige un orden t (mínimo número de hijos de un nodo interno).',
      'Inserta cada clave; si un nodo se llena, se parte y la mediana sube al padre.',
      'La raíz se parte cuando es necesario, aumentando la altura en uno.',
      'Todas las hojas quedan al mismo nivel.',
      'Un recorrido en orden de los nodos lista las claves de menor a mayor.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function bTreeSort(arr, t):
  tree ← empty B-Tree of minimum degree t
  for x in arr:
    bTreeInsert(tree, x)
  result ← []
  traverseInOrder(tree.root, result)
  return result

function traverseInOrder(node, out):
  for i from 0 to node.n - 1:
    if not node.leaf: traverseInOrder(node.child[i], out)
    out.append(node.key[i])
  if not node.leaf: traverseInOrder(node.child[node.n], out)`,
    example: 'Orden t = 2, entrada: [10, 20, 5, 6, 12, 30, 7, 17]\nLos nodos se parten al llegar a 3 claves.\nRecorrido: 5, 6, 7, 10, 12, 17, 20, 30.',
  },
  {
    slug: 'splay-tree-sort',
    name: 'Splay Tree Sort',
    treeType: 'Árbol splay',
    summary: 'Inserta en un splay tree, que rota el nodo reciente hasta la raíz, y obtiene el orden con un recorrido inorden.',
    description:
      'Los árboles splay no garantizan equilibrio estricto en cada operación, pero su costo amortizado es O(log n). Tras insertar, el elemento se “splays” hasta la raíz con zig, zig-zig o zig-zag. Para ordenar, se insertan todos los valores y se recorre inorden. Es útil cuando hay localidad: acceder a claves recientes sale barato.',
    howItWorks: [
      'Inserta el valor como en un BST.',
      'Aplica splay: rotaciones hasta llevar el nodo insertado a la raíz.',
      'Patrones: zig (un paso), zig-zig (mismo lado) y zig-zag (lados opuestos).',
      'Repite para cada elemento; el costo amortizado de n inserciones es O(n log n).',
      'El recorrido inorden genera el arreglo ordenado.',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'O(n log n) amortizado',
      worst: 'O(n²) puntual / O(n log n) amortizado',
      space: 'O(n)',
    },
    stable: false,
    inPlace: false,
    pseudocode: `function splayTreeSort(arr):
  root ← null
  for x in arr:
    root ← splayInsert(root, x)  // inserta y hace splay a la raíz
  result ← []
  inorder(root, result)
  return result`,
    example: 'Entrada: [4, 2, 6]\nTras insertar 4, la raíz es 4.\nInsertar 2 y splay deja 2 en la raíz.\nInsertar 6 y splay deja 6 en la raíz, con 2 y 4 a la izquierda.\nInorden: 2, 4, 6.',
  },
];
