export interface SchedulerComplexity {
  criterion: string;
  kind: string;
  starvation: string;
  selection: string;
}

export interface SchedulerAlgorithm {
  slug: string;
  name: string;
  family: string;
  summary: string;
  description: string;
  howItWorks: string[];
  complexity: SchedulerComplexity;
  preemptive: boolean;
  usesPriority: boolean;
  usesQuantum: boolean;
  defaultQuantum: number;
  pseudocode: string;
  example: string;
}

export const SCHEDULERS: SchedulerAlgorithm[] = [
  {
    slug: 'fcfs',
    name: 'FCFS',
    family: 'Por llegada',
    summary: 'Atiende los procesos en el orden en que llegan a la cola de listos, sin expulsión.',
    description:
      'First Come First Served (FCFS) es la política más simple: el primero que llega a la CPU es el primero en ejecutarse hasta terminar. No usa prioridades ni quantum. Es fácil de implementar con una cola FIFO, pero puede provocar el efecto convoy si un trabajo largo llega antes que otros cortos.',
    howItWorks: [
      'Los procesos se encolan según su tiempo de llegada.',
      'Cuando la CPU queda libre, se toma el primero de la cola.',
      'Ese proceso corre hasta agotar su ráfaga; no se le expulsa.',
      'Si la CPU está libre y nadie ha llegado, queda ociosa hasta la siguiente llegada.',
      'Al terminar, se calculan espera (inicio − llegada − huecos propios) y retorno (fin − llegada).',
    ],
    complexity: {
      criterion: 'Orden de llegada',
      kind: 'No expulsivo',
      starvation: 'No',
      selection: 'O(1)',
    },
    preemptive: false,
    usesPriority: false,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function fcfs(processes):
  ready ← FIFO queue
  t ← 0
  while processes remain:
    enqueue arrivals at t
    if CPU idle and ready not empty:
      run dequeue(ready) until burst ends
    else if CPU idle:
      t ← next arrival
    else:
      t ← t + 1`,
    example:
      'P1(0,5), P2(1,3), P3(2,8), P4(3,6)\nGantt: P1 0–5, P2 5–8, P3 8–16, P4 16–22\nEspera: 0, 4, 6, 13. Promedio 5.75.',
  },
  {
    slug: 'sjf',
    name: 'SJF',
    family: 'Por ráfaga',
    summary: 'Cuando la CPU se libera, elige el proceso listo con la ráfaga más corta y lo ejecuta entero.',
    description:
      'Shortest Job First (SJF) no expulsivo minimiza el tiempo de espera promedio al favorecer trabajos cortos. En cada decisión —CPU libre y hay listos— se elige el menor burst. Hace falta conocer o estimar la ráfaga. Un proceso largo puede esperar mucho si siguen llegando trabajos cortos (inanición).',
    howItWorks: [
      'Al quedar la CPU libre, mira el conjunto de procesos ya llegados y no terminados.',
      'Elige el de menor ráfaga; empates por llegada y por identificador.',
      'Ese proceso corre hasta terminar; no se expulsa si llega otro más corto.',
      'Si no hay listos, avanza el reloj hasta la próxima llegada.',
      'Repite hasta vaciar el conjunto de procesos.',
    ],
    complexity: {
      criterion: 'Ráfaga más corta',
      kind: 'No expulsivo',
      starvation: 'Posible',
      selection: 'O(n)',
    },
    preemptive: false,
    usesPriority: false,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function sjf(processes):
  t ← 0
  while processes remain:
    ready ← arrived and not finished
    if ready is empty: t ← next arrival; continue
    p ← min burst in ready
    run p to completion
    t ← t + p.burst`,
    example:
      'Misma carga: P1 corre 0–5 (único listo).\nEn t=5 hay P2(3), P4(6), P3(8): gana P2, luego P4, luego P3.\nGantt: P1 0–5, P2 5–8, P4 8–14, P3 14–22.',
  },
  {
    slug: 'srtf',
    name: 'SRTF',
    family: 'Por ráfaga',
    summary: 'Versión expulsiva de SJF: en cada instante corre el proceso listo con menor tiempo restante.',
    description:
      'Shortest Remaining Time First (SRTF) reevalúa la CPU cuando llega un proceso o cuando termina el actual. Si el recién llegado tiene menos restante que el que corre, lo expulsa. Suele dar la menor espera promedio, a costa de más cambios de contexto y de necesitar ráfagas conocidas.',
    howItWorks: [
      'En cada unidad de tiempo, considera los procesos llegados con restante > 0.',
      'Elige el de menor tiempo restante.',
      'Si el elegido no es el que corre, hay expulsión.',
      'Ejecuta una unidad y descuenta el restante.',
      'Cuando el restante llega a 0, el proceso termina y se miden sus tiempos.',
    ],
    complexity: {
      criterion: 'Menor restante',
      kind: 'Expulsivo',
      starvation: 'Posible',
      selection: 'O(n)',
    },
    preemptive: true,
    usesPriority: false,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function srtf(processes):
  t ← 0
  while processes remain:
    ready ← arrived and remaining > 0
    p ← min remaining in ready
    run p for 1 time unit
    if p.remaining = 0: finish p
    t ← t + 1`,
    example:
      'P1 empieza en 0. En t=1 llega P2 con 3 < restante de P1 (4): expulsión.\nP2 termina en 4, P1 retoma, luego P4 y P3.\nGantt: P1 0–1, P2 1–4, P1 4–8, P4 8–14, P3 14–22.',
  },
  {
    slug: 'round-robin',
    name: 'Round Robin',
    family: 'Por turno',
    summary: 'Comparte la CPU en rodajas de quantum; el proceso que agota su turno vuelve al final de la cola.',
    description:
      'Round Robin es la política típica de sistemas de tiempo compartido. Cada proceso recibe un quantum; si no termina, se expulsa y se coloca al final de la cola FIFO. Un quantum pequeño da más interactividad y más cambios de contexto; uno grande se parece a FCFS.',
    howItWorks: [
      'Las llegadas se encolan al final de la cola de listos.',
      'La CPU toma el frente de la cola y corre hasta quantum o fin de ráfaga.',
      'Si termina, sale del sistema.',
      'Si agota el quantum, vuelve a la cola (detrás de las llegadas de ese instante).',
      'Si la cola está vacía, la CPU espera la próxima llegada.',
    ],
    complexity: {
      criterion: 'Turno + quantum',
      kind: 'Expulsivo',
      starvation: 'No',
      selection: 'O(1)',
    },
    preemptive: true,
    usesPriority: false,
    usesQuantum: true,
    defaultQuantum: 2,
    pseudocode: `function roundRobin(processes, q):
  queue ← FIFO
  t ← 0
  while processes remain:
    enqueue arrivals at t
    if CPU idle: run dequeue(queue)
    run 1 unit
    if finished: release CPU
    else if used = q:
      enqueue running; release CPU`,
    example:
      'Quantum 2, misma carga.\nP1 corre 0–2 y vuelve a la cola (P2 y P3 ya llegaron).\nEl procesador rota P2, P3, P4, P1… hasta vaciar las ráfagas.',
  },
  {
    slug: 'priority',
    name: 'Prioridad',
    family: 'Por prioridad',
    summary: 'Elige el proceso listo de mayor prioridad (número más bajo) y lo ejecuta hasta terminar.',
    description:
      'La planificación por prioridad no expulsiva asigna a cada proceso un entero de prioridad. En cada decisión se elige el de menor número. Un proceso de baja prioridad puede sufrir inanición si siguen llegando otros más urgentes; en la práctica se usa envejecimiento para subir su prioridad con el tiempo.',
    howItWorks: [
      'Cada proceso trae una prioridad (1 es la más alta).',
      'Al liberarse la CPU, se elige el listo de menor número.',
      'Ese proceso corre entero; una llegada más prioritaria espera.',
      'Empates se rompen por tiempo de llegada.',
      'Al final se reportan espera y retorno de cada proceso.',
    ],
    complexity: {
      criterion: 'Prioridad estática',
      kind: 'No expulsivo',
      starvation: 'Posible',
      selection: 'O(n)',
    },
    preemptive: false,
    usesPriority: true,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function priorityNP(processes):
  t ← 0
  while processes remain:
    ready ← arrived and not finished
    p ← min priority in ready
    run p to completion`,
    example:
      'Prioridades: P1=2, P2=1, P3=3, P4=2.\nP1 arranca en 0 (único). En t=5 gana P2 (prioridad 1), luego P4 y P3.\nGantt: P1 0–5, P2 5–8, P4 8–14, P3 14–22.',
  },
  {
    slug: 'priority-preemptive',
    name: 'Prioridad expulsiva',
    family: 'Por prioridad',
    summary: 'Si llega un proceso más prioritario que el que corre, lo expulsa de inmediato.',
    description:
      'La variante expulsiva de prioridad reevalúa la CPU en cada llegada. Un proceso urgente no espera a que termine el actual. Mejora la respuesta de trabajos críticos, pero aumenta los cambios de contexto y sigue habiendo riesgo de inanición para las prioridades bajas.',
    howItWorks: [
      'En cada instante se mira el listo de mayor prioridad.',
      'Si no es el que está en CPU, hay expulsión.',
      'El expulsado vuelve a listos con su restante.',
      'El nuevo corre hasta que termine o llegue alguien aún más prioritario.',
      'Se registran respuesta (primera vez en CPU) y retorno.',
    ],
    complexity: {
      criterion: 'Prioridad estática',
      kind: 'Expulsivo',
      starvation: 'Posible',
      selection: 'O(n)',
    },
    preemptive: true,
    usesPriority: true,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function priorityP(processes):
  t ← 0
  while processes remain:
    ready ← arrived and remaining > 0
    p ← min priority in ready
    run p for 1 time unit`,
    example:
      'P1 (pri 2) corre en 0. En t=1 llega P2 (pri 1) y lo expulsa.\nP2 termina en 4; P1 retoma frente a P4 (ambos pri 2).\nLuego P4 y por último P3.',
  },
  {
    slug: 'mlq',
    name: 'Colas multinivel',
    family: 'Varias colas',
    summary: 'Separa los procesos en colas fijas (sistema, interactiva, lote) con distinta política cada una.',
    description:
      'Multilevel Queue (MLQ) clasifica los procesos de antemano. En este simulador la prioridad 1 va a la cola de sistema (FCFS), la 2 a la interactiva (Round Robin con quantum 2) y el resto al lote (FCFS). Una cola de más prioridad puede expulsar a una inferior; un proceso no cambia de cola.',
    howItWorks: [
      'Asigna cada proceso a una cola según su prioridad: 1 → sistema, 2 → interactiva, ≥3 → lote.',
      'La cola de sistema (FCFS) tiene preferencia absoluta.',
      'Si está vacía, corre la interactiva con quantum 2.',
      'Si ambas están vacías, corre el lote (FCFS).',
      'Una llegada a una cola más alta expulsa al proceso de una cola más baja.',
    ],
    complexity: {
      criterion: 'Cola fija + política',
      kind: 'Híbrido',
      starvation: 'Posible en colas bajas',
      selection: 'O(1)–O(n)',
    },
    preemptive: true,
    usesPriority: true,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function mlq(processes):
  Q0 ← FCFS   // prioridad 1
  Q1 ← RR(2)  // prioridad 2
  Q2 ← FCFS   // prioridad ≥ 3
  always run the highest nonempty queue
  higher queue preempts lower queue`,
    example:
      'P2 (pri 1) entra en t=1 a la cola de sistema y expulsa a P1 (pri 2).\nCuando Q0 queda vacía, Q1 rota P1 y P4; P3 espera en el lote.',
  },
  {
    slug: 'mlfq',
    name: 'Colas con realimentación',
    family: 'Varias colas',
    summary: 'Los procesos empiezan en la cola más alta y bajan si agotan el quantum; así los cortos se van rápido.',
    description:
      'Multilevel Feedback Queue (MLFQ) no fija la cola: todo proceso nuevo entra en Q0 (quantum 1). Si consume el quantum entero, baja a Q1 (quantum 2) y, si vuelve a agotarlo, a Q2 (FCFS). Los trabajos cortos e interactivos suelen terminar en las colas altas; los largos descienden. Una cola alta siempre expulsa a una baja.',
    howItWorks: [
      'Todo proceso nuevo entra en Q0.',
      'Q0 usa Round Robin con quantum 1; Q1 con quantum 2; Q2 es FCFS.',
      'Si un proceso agota su quantum sin terminar, se degrada a la cola siguiente.',
      'Si termina dentro del quantum, sale del sistema.',
      'Siempre se despacha la cola no vacía de mayor nivel.',
    ],
    complexity: {
      criterion: 'Historial de CPU',
      kind: 'Expulsivo adaptativo',
      starvation: 'Posible en Q2',
      selection: 'O(1)–O(n)',
    },
    preemptive: true,
    usesPriority: false,
    usesQuantum: false,
    defaultQuantum: 2,
    pseudocode: `function mlfq(processes):
  all new processes → Q0
  Q0: RR quantum 1
  Q1: RR quantum 2
  Q2: FCFS
  if process uses full quantum: demote
  always run highest nonempty queue`,
    example:
      'P1 corre 1 unidad en Q0 y, al no terminar, baja a Q1.\nLas llegadas nuevas siempre entran en Q0 y pueden expulsar a quien corre en Q1 o Q2.',
  },
];
