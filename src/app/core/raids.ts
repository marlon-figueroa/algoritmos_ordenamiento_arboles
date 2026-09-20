export interface RaidTraits {
  usable: string;
  faultTolerance: string;
  kind: string;
  access: string;
}

export interface RaidAlgorithm {
  slug: string;
  name: string;
  family: string;
  summary: string;
  description: string;
  howItWorks: string[];
  traits: RaidTraits;
  minDisks: number;
  maxDisks: number;
  defaultDisks: number;
  evenDisks: boolean;
  pseudocode: string;
  example: string;
}

export const RAIDS: RaidAlgorithm[] = [
  {
    slug: 'raid-0',
    name: 'RAID 0',
    family: 'Striping',
    summary: 'Parte los datos en franjas y las reparte entre todos los discos, sin redundancia.',
    description:
      'RAID 0 (striping) reparte bloques consecutivos entre N discos para ganar rendimiento de lectura y escritura. No guarda copias ni paridad: si falla un disco se pierde todo el volumen. Es el esquema más simple y sirve de base para los RAID anidados.',
    howItWorks: [
      'Se elige un tamaño de franja (aquí, un bloque lógico).',
      'El bloque i se escribe en el disco i módulo N, en la fila ⌊i / N⌋.',
      'Lecturas y escrituras pueden ir en paralelo a varios discos.',
      'La capacidad usable es la suma de todos los discos.',
      'Cualquier fallo de disco hace irrecuperable el arreglo.',
    ],
    traits: {
      usable: '100%',
      faultTolerance: '0 discos',
      kind: 'Sin redundancia',
      access: 'Paralelo',
    },
    minDisks: 2,
    maxDisks: 8,
    defaultDisks: 4,
    evenDisks: false,
    pseudocode: `function raid0Write(blocks, n):
  for i, block in blocks:
    disk ← i mod n
    row  ← ⌊i / n⌋
    disks[disk][row] ← block`,
    example: 'Bloques A–H, 4 discos.\nFila 0: A B C D\nFila 1: E F G H\nSi cae D1 se pierden B y F.',
  },
  {
    slug: 'raid-1',
    name: 'RAID 1',
    family: 'Espejo',
    summary: 'Escribe cada bloque en todos los discos del arreglo; es un espejo completo.',
    description:
      'RAID 1 (mirroring) duplica cada escritura. Con dos discos, uno es copia exacta del otro; con más, todos reciben el mismo bloque. Aguanta el fallo de todos menos uno. La capacidad usable es la de un solo disco y las lecturas pueden servirse desde cualquier copia.',
    howItWorks: [
      'Cada bloque se escribe en la misma fila de todos los discos.',
      'Una lectura puede tomarse de cualquier disco sano.',
      'Si un disco falla, los restantes siguen sirviendo los mismos datos.',
      'La reconstrucción copia el contenido de un disco sano al reemplazo.',
      'No hay paridad: la redundancia es una copia bit a bit.',
    ],
    traits: {
      usable: '1/N',
      faultTolerance: 'N − 1 discos',
      kind: 'Copia completa',
      access: 'Lectura paralela',
    },
    minDisks: 2,
    maxDisks: 4,
    defaultDisks: 2,
    evenDisks: false,
    pseudocode: `function raid1Write(blocks, n):
  for i, block in blocks:
    for d from 0 to n - 1:
      disks[d][i] ← block`,
    example: 'Bloques A B C, 2 discos.\nD0: A B C\nD1: A B C (espejo)\nCae D0 y D1 sigue sirviendo A B C.',
  },
  {
    slug: 'raid-2',
    name: 'RAID 2',
    family: 'Hamming',
    summary: 'Reparte bits entre discos de datos y calcula bits de Hamming para corregir errores.',
    description:
      'RAID 2, hoy poco usado, aplica el código de Hamming en el nivel de bit. Con el esquema (7,4) hay 4 discos de datos y 3 de paridad en las posiciones potencia de dos. Detecta y corrige un bit erróneo. Los discos deben girar sincronizados; por eso lo sustituyeron RAID 3–6.',
    howItWorks: [
      'Se usan 7 discos: paridad en las posiciones 1, 2 y 4 (1-indexadas).',
      'Cada bloque ocupa una fila: los bits de datos van a las posiciones 3, 5, 6 y 7.',
      'H1 cubre posiciones 1,3,5,7; H2 cubre 2,3,6,7; H4 cubre 4,5,6,7.',
      'Al leer, el síndrome de Hamming indica el disco (bit) a corregir.',
      'Tolera el fallo de un disco de datos o de paridad.',
    ],
    traits: {
      usable: '4/7',
      faultTolerance: '1 disco',
      kind: 'ECC Hamming',
      access: 'Síncrono',
    },
    minDisks: 7,
    maxDisks: 7,
    defaultDisks: 7,
    evenDisks: false,
    pseudocode: `function raid2Write(block):
  bits ← 4 data bits of block
  place bits at positions 3,5,6,7
  H1, H2, H4 ← Hamming parity
  place Hi at positions 1,2,4`,
    example: 'Fila de A: H1 H2 A H4 a a a\nSi falla el disco 5, el síndrome apunta a esa posición y se reconstruye el bit.',
  },
  {
    slug: 'raid-3',
    name: 'RAID 3',
    family: 'Paridad dedicada',
    summary: 'Franjas a nivel de byte con un disco exclusivo de paridad XOR.',
    description:
      'RAID 3 reparte cada registro en bytes entre N−1 discos de datos y guarda XOR en un disco dedicado. Todas las E/S involucran todos los discos (acceso en paralelo), por lo que destaca en transferencias largas, no en muchas operaciones pequeñas. Un disco puede fallar y reconstruirse con la paridad.',
    howItWorks: [
      'N−1 discos guardan bytes de datos; el último guarda P = XOR de la franja.',
      'Cada escritura actualiza todos los discos de datos y el de paridad.',
      'Una lectura larga se sirve en paralelo desde los discos de datos.',
      'Si cae un disco de datos, P ⊕ resto recupera el byte que falta.',
      'Si cae el disco de paridad, se recalcula XOR al reemplazarlo.',
    ],
    traits: {
      usable: '(N−1)/N',
      faultTolerance: '1 disco',
      kind: 'Paridad dedicada',
      access: 'Paralelo por byte',
    },
    minDisks: 3,
    maxDisks: 6,
    defaultDisks: 4,
    evenDisks: false,
    pseudocode: `function raid3Write(stripe, n):
  for d from 0 to n - 2:
    disks[d][row] ← stripe[d]
  disks[n - 1][row] ← XOR(stripe)`,
    example: '4 discos, franja A B C.\nD0=A D1=B D2=C D3=P(A⊕B⊕C)\nCae D1: B = A ⊕ C ⊕ P.',
  },
  {
    slug: 'raid-4',
    name: 'RAID 4',
    family: 'Paridad dedicada',
    summary: 'Igual que RAID 3, pero las franjas son bloques enteros; el disco de paridad se satura.',
    description:
      'RAID 4 usa franjas de bloque y un disco de paridad fijo. Las lecturas pequeñas pueden ir a un solo disco de datos, a diferencia de RAID 3. El cuello de botella es el disco P: toda escritura lo actualiza. Por eso en la práctica se prefiere RAID 5, que reparte esa paridad.',
    howItWorks: [
      'Los bloques de una franja se escriben en los discos 0…N−2.',
      'El disco N−1 guarda P = XOR de esos bloques.',
      'Una lectura de un bloque toca un solo disco de datos.',
      'Una escritura pequeña hace read-modify-write en datos y en P.',
      'El disco de paridad participa en todas las escrituras.',
    ],
    traits: {
      usable: '(N−1)/N',
      faultTolerance: '1 disco',
      kind: 'Paridad dedicada',
      access: 'Independiente',
    },
    minDisks: 3,
    maxDisks: 6,
    defaultDisks: 4,
    evenDisks: false,
    pseudocode: `function raid4Write(stripe, n):
  for d from 0 to n - 2:
    disks[d][row] ← stripe[d]
  disks[n - 1][row] ← XOR(stripe)
  // P is always the last disk`,
    example: 'Franjas ABC y DEF, 4 discos.\nFila 0: A B C P0\nFila 1: D E F P1\nP siempre en D3.',
  },
  {
    slug: 'raid-5',
    name: 'RAID 5',
    family: 'Paridad distribuida',
    summary: 'Reparte la paridad XOR entre todos los discos para no saturar uno solo.',
    description:
      'RAID 5 es el esquema de paridad simple más usado. En cada franja, N−1 bloques son datos y uno es P; la columna de P rota. Aguanta un disco fallido. Las escrituras pequeñas siguen costando (hay que actualizar P), pero el trabajo se reparte. No sobrevive a dos fallos simultáneos.',
    howItWorks: [
      'Cada franja tiene N−1 datos y una paridad.',
      'El disco de P en la fila r es N−1−(r mód N).',
      'Los datos se colocan en los discos restantes, en orden.',
      'Si un disco falla, cada franja se reconstruye con XOR del resto.',
      'Dos fallos en la misma franja hacen irrecuperable ese stripe.',
    ],
    traits: {
      usable: '(N−1)/N',
      faultTolerance: '1 disco',
      kind: 'Paridad rotada',
      access: 'Independiente',
    },
    minDisks: 3,
    maxDisks: 8,
    defaultDisks: 4,
    evenDisks: false,
    pseudocode: `function raid5Write(stripe, n, row):
  pDisk ← (n - 1 - row mod n) mod n
  place data on all disks except pDisk
  disks[pDisk][row] ← XOR(data)`,
    example: '4 discos, ABC DEF GHI.\nFila 0: A B C P\nFila 1: D E P F\nFila 2: G P H I\nP rota a la izquierda.',
  },
  {
    slug: 'raid-6',
    name: 'RAID 6',
    family: 'Paridad distribuida',
    summary: 'Dos paridades independientes (P y Q) por franja; sobrevive a dos discos caídos.',
    description:
      'RAID 6 añade una segunda paridad Q (típicamente Reed–Solomon) además del XOR P. En cada franja hay N−2 datos, P y Q, y ambas columnas rotan. Aguanta dos fallos. El costo es menos capacidad usable y escrituras más pesadas. Es el estándar cuando el rebuild de discos grandes tarda demasiado para confiar en un solo P.',
    howItWorks: [
      'Cada franja reserva dos discos para P y Q.',
      'P y Q rotan: pDisk = N−1−(r mód N), qDisk = (pDisk−1) mód N.',
      'Los N−2 bloques de datos ocupan el resto.',
      'Un fallo se recupera con P o Q; dos fallos usan ambas.',
      'Tres fallos en la misma franja ya no se reconstruyen.',
    ],
    traits: {
      usable: '(N−2)/N',
      faultTolerance: '2 discos',
      kind: 'Doble paridad',
      access: 'Independiente',
    },
    minDisks: 4,
    maxDisks: 8,
    defaultDisks: 5,
    evenDisks: false,
    pseudocode: `function raid6Write(stripe, n, row):
  pDisk ← (n - 1 - row mod n) mod n
  qDisk ← (pDisk - 1 + n) mod n
  place data on remaining disks
  P ← XOR(data); Q ← RS(data)`,
    example: '5 discos, ABC DEF.\nFila 0: A B C P Q\nFila 1: D E P Q F\nPueden caer dos discos y aún se recupera la franja.',
  },
  {
    slug: 'raid-10',
    name: 'RAID 10',
    family: 'Anidado',
    summary: 'Primero espeja los discos por parejas y luego hace striping sobre esos espejos (1+0).',
    description:
      'RAID 10 (1+0) combina lo mejor de RAID 1 y RAID 0: cada bloque se escribe en una pareja espejo y las parejas se entrelazan. Aguanta el fallo de un disco por pareja. Es más rápido de reconstruir que RAID 5/6 y muy usado en bases de datos, a costa de usar solo la mitad de la capacidad.',
    howItWorks: [
      'Los discos se agrupan en parejas (D0–D1, D2–D3, …).',
      'El bloque i va a la pareja i mód (N/2), en ambos discos.',
      'La fila es ⌊i / (N/2)⌋.',
      'Si falla un disco, su pareja sigue sirviendo el bloque.',
      'Si fallan los dos de la misma pareja, esos bloques se pierden.',
    ],
    traits: {
      usable: '50%',
      faultTolerance: '1 por pareja',
      kind: 'Stripe de espejos',
      access: 'Paralelo + copia',
    },
    minDisks: 4,
    maxDisks: 8,
    defaultDisks: 4,
    evenDisks: true,
    pseudocode: `function raid10Write(blocks, n):
  pairs ← n / 2
  for i, block in blocks:
    pair ← i mod pairs
    row  ← ⌊i / pairs⌋
    disks[2*pair][row] ← block
    disks[2*pair+1][row] ← block`,
    example: 'A B C D, 4 discos.\nD0/D1: A C (espejo)\nD2/D3: B D (espejo)\nCae D0 y A,C siguen en D1.',
  },
  {
    slug: 'raid-01',
    name: 'RAID 01',
    family: 'Anidado',
    summary: 'Primero hace striping en cada mitad y luego espeja un stripe contra el otro (0+1).',
    description:
      'RAID 01 (0+1) construye dos RAID 0 y los espeja. Cada bloque vive en un disco de cada mitad. Un fallo en un lado hace que todo ese stripe se considere degradado: el siguiente fallo en el otro lado puede tumbar el volumen aunque queden discos sanos. Por eso se prefiere RAID 10 cuando hay elección.',
    howItWorks: [
      'Se parte el arreglo en dos mitades de N/2 discos.',
      'El bloque i se escribe en el disco (i mód N/2) de ambas mitades.',
      'Cada mitad es un RAID 0; entre mitades hay un RAID 1.',
      'Si falla un disco, toda su mitad queda fuera de servicio.',
      'Un segundo fallo en la otra mitad puede destruir datos.',
    ],
    traits: {
      usable: '50%',
      faultTolerance: '1 mitad',
      kind: 'Espejo de stripes',
      access: 'Paralelo + copia',
    },
    minDisks: 4,
    maxDisks: 8,
    defaultDisks: 4,
    evenDisks: true,
    pseudocode: `function raid01Write(blocks, n):
  half ← n / 2
  for i, block in blocks:
    d ← i mod half
    row ← ⌊i / half⌋
    disks[d][row] ← block
    disks[d + half][row] ← block`,
    example: 'A B C D, 4 discos.\nMitad 0 (D0 D1): A B / C D\nMitad 1 (D2 D3): A B / C D\nCae D0 y se degrada toda la primera mitad.',
  },
];
