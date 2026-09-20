export interface SimProcess {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface GanttSlice {
  processId: string | null;
  start: number;
  end: number;
}

export type ProcessStatus = 'new' | 'ready' | 'running' | 'done';

export interface ProcessView {
  id: string;
  arrival: number;
  burst: number;
  remaining: number;
  priority: number;
  queue: number;
  startTime: number | null;
  finishTime: number | null;
  waiting: number;
  turnaround: number;
  response: number | null;
  status: ProcessStatus;
}

export interface SchedFrame {
  time: number;
  message: string;
  running: string | null;
  ready: string[];
  processes: ProcessView[];
  gantt: GanttSlice[];
  done: boolean;
}

export const emptySchedFrame: SchedFrame = {
  time: 0,
  message: 'Carga un conjunto de procesos para comenzar la simulación.',
  running: null,
  ready: [],
  processes: [],
  gantt: [],
  done: false,
};

export const SAMPLE_PROCESSES: SimProcess[] = [
  { id: 'P1', arrival: 0, burst: 5, priority: 2 },
  { id: 'P2', arrival: 1, burst: 3, priority: 1 },
  { id: 'P3', arrival: 2, burst: 8, priority: 3 },
  { id: 'P4', arrival: 3, burst: 6, priority: 2 },
];

export const PROCESS_COLORS = [
  '#1d4ed8',
  '#0284c7',
  '#4338ca',
  '#0369a1',
  '#2563eb',
  '#1e40af',
  '#0f766e',
  '#6366f1',
];

export const MAX_PROCESSES = 8;

export function processColor(id: string, ids: string[]): string {
  const index = ids.indexOf(id);
  return PROCESS_COLORS[(index >= 0 ? index : 0) % PROCESS_COLORS.length];
}

export function formatProcesses(processes: SimProcess[]): string {
  return processes.map((process) => `${process.id} ${process.arrival} ${process.burst} ${process.priority}`).join('\n');
}

export function parseProcesses(raw: string): SimProcess[] {
  const lines = raw
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('Necesitas al menos 2 procesos.');
  }
  if (lines.length > MAX_PROCESSES) {
    throw new Error(`Como máximo ${MAX_PROCESSES} procesos para que el diagrama se lea bien.`);
  }

  const seen = new Set<string>();
  const processes = lines.map((line, index) => {
    const tokens = line.split(/[\s,|]+/).filter((token) => token.length > 0);
    if (tokens.length < 3) {
      throw new Error(`La fila ${index + 1} debe ser: id llegada ráfaga [prioridad].`);
    }
    const id = tokens[0].toUpperCase();
    const arrival = Number(tokens[1]);
    const burst = Number(tokens[2]);
    const priority = tokens[3] === undefined ? 2 : Number(tokens[3]);
    if (!/^[A-Z][A-Z0-9]{0,5}$/.test(id)) {
      throw new Error(`Identificador no válido en la fila ${index + 1}. Usa P1, P2…`);
    }
    if (seen.has(id)) {
      throw new Error(`El identificador ${id} está repetido.`);
    }
    if (![arrival, burst, priority].every((value) => Number.isInteger(value))) {
      throw new Error(`Usa solo enteros en la fila ${index + 1}.`);
    }
    if (arrival < 0 || burst < 1 || priority < 1 || priority > 9) {
      throw new Error(`Llegada ≥ 0, ráfaga ≥ 1 y prioridad 1–9 en la fila ${index + 1}.`);
    }
    seen.add(id);
    return { id, arrival, burst, priority };
  });

  return processes;
}

export function randomProcesses(): SimProcess[] {
  const count = 4 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, index) => ({
    id: `P${index + 1}`,
    arrival: index === 0 ? 0 : Math.floor(Math.random() * 6),
    burst: 2 + Math.floor(Math.random() * 7),
    priority: 1 + Math.floor(Math.random() * 3),
  }));
}

export function averages(processes: ProcessView[]): { waiting: number; turnaround: number; response: number } {
  if (!processes.length) {
    return { waiting: 0, turnaround: 0, response: 0 };
  }
  const waiting = processes.reduce((sum, process) => sum + process.waiting, 0) / processes.length;
  const turnaround = processes.reduce((sum, process) => sum + process.turnaround, 0) / processes.length;
  const response =
    processes.reduce((sum, process) => sum + (process.response ?? 0), 0) / processes.length;
  return { waiting, turnaround, response };
}
