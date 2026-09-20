import { SCHEDULERS } from '../core/schedulers';
import { GanttSlice, ProcessView, SchedFrame, SimProcess } from './models';

interface LiveProcess {
  id: string;
  arrival: number;
  burst: number;
  remaining: number;
  priority: number;
  queue: number;
  firstResponse: number | null;
  finishTime: number | null;
}

const MLFQ_QUANTUM = [1, 2, Number.POSITIVE_INFINITY];
const MAX_STEPS = 400;

function clone(input: SimProcess[]): LiveProcess[] {
  return input.map((process) => ({
    id: process.id,
    arrival: process.arrival,
    burst: process.burst,
    remaining: process.burst,
    priority: process.priority,
    queue: 0,
    firstResponse: null,
    finishTime: null,
  }));
}

function byId(a: LiveProcess, b: LiveProcess): number {
  return a.id.localeCompare(b.id);
}

function pickMin(
  ready: LiveProcess[],
  compare: (a: LiveProcess, b: LiveProcess) => number,
): LiveProcess | null {
  if (!ready.length) {
    return null;
  }
  return [...ready].sort((a, b) => compare(a, b) || a.arrival - b.arrival || byId(a, b))[0];
}

function mlqLevel(process: LiveProcess): number {
  if (process.priority <= 1) {
    return 0;
  }
  if (process.priority === 2) {
    return 1;
  }
  return 2;
}

function appendSlice(gantt: GanttSlice[], time: number, processId: string | null, sliceStart: { value: number }): void {
  if (time <= sliceStart.value) {
    return;
  }
  const last = gantt[gantt.length - 1];
  if (last && last.processId === processId && last.end === sliceStart.value) {
    last.end = time;
  } else {
    gantt.push({ processId, start: sliceStart.value, end: time });
  }
  sliceStart.value = time;
}

function viewOf(process: LiveProcess, time: number, running: string | null): ProcessView {
  const executed = process.burst - process.remaining;
  const elapsed = Math.max(0, time - process.arrival);
  const waiting = process.finishTime !== null ? process.finishTime - process.arrival - process.burst : Math.max(0, elapsed - executed);
  const turnaround = process.finishTime !== null ? process.finishTime - process.arrival : Math.max(0, elapsed);
  const status: ProcessView['status'] =
    process.remaining === 0 ? 'done' : running === process.id ? 'running' : process.arrival <= time ? 'ready' : 'new';
  return {
    id: process.id,
    arrival: process.arrival,
    burst: process.burst,
    remaining: process.remaining,
    priority: process.priority,
    queue: process.queue,
    startTime: process.firstResponse,
    finishTime: process.finishTime,
    waiting,
    turnaround,
    response: process.firstResponse === null ? null : process.firstResponse - process.arrival,
    status,
  };
}

function snapshot(
  frames: SchedFrame[],
  processes: LiveProcess[],
  time: number,
  running: string | null,
  ready: string[],
  gantt: GanttSlice[],
  message: string,
  done: boolean,
): void {
  frames.push({
    time,
    message,
    running,
    ready: [...ready],
    processes: processes.map((process) => viewOf(process, time, running)),
    gantt: gantt.map((slice) => ({ ...slice })),
    done,
  });
}

function nextArrival(processes: LiveProcess[], time: number): number {
  const later = processes.filter((process) => process.arrival > time && process.remaining > 0).map((process) => process.arrival);
  return later.length ? Math.min(...later) : Number.POSITIVE_INFINITY;
}

function enqueueNew(queue: string[], queued: Set<string>, processes: LiveProcess[], time: number, running: string | null): string[] {
  const arrived: string[] = [];
  for (const process of processes) {
    if (process.arrival === time && process.remaining > 0 && process.id !== running && !queued.has(process.id)) {
      queue.push(process.id);
      queued.add(process.id);
      arrived.push(process.id);
    }
  }
  return arrived;
}

export function simulateSchedule(slug: string, input: SimProcess[], quantum = 2): SchedFrame[] {
  const known = SCHEDULERS.some((item) => item.slug === slug);
  if (!known) {
    throw new Error(`No hay simulador para ${slug}.`);
  }
  const q = Math.max(1, Math.floor(quantum));
  switch (slug) {
    case 'fcfs':
      return runNonPreemptive(input, (ready) => pickMin(ready, (a, b) => a.arrival - b.arrival));
    case 'sjf':
      return runNonPreemptive(input, (ready) => pickMin(ready, (a, b) => a.burst - b.burst));
    case 'priority':
      return runNonPreemptive(input, (ready) => pickMin(ready, (a, b) => a.priority - b.priority));
    case 'srtf':
      return runPreemptive(input, (ready) => pickMin(ready, (a, b) => a.remaining - b.remaining));
    case 'priority-preemptive':
      return runPreemptive(input, (ready) => pickMin(ready, (a, b) => a.priority - b.priority));
    case 'round-robin':
      return runRoundRobin(input, q);
    case 'mlq':
      return runMlq(input);
    case 'mlfq':
      return runMlfq(input);
    default:
      return runNonPreemptive(input, (ready) => pickMin(ready, (a, b) => a.arrival - b.arrival));
  }
}

function runNonPreemptive(
  input: SimProcess[],
  choose: (ready: LiveProcess[]) => LiveProcess | null,
): SchedFrame[] {
  const processes = clone(input);
  const frames: SchedFrame[] = [];
  const gantt: GanttSlice[] = [];
  const sliceStart = { value: 0 };
  let time = 0;
  let running: LiveProcess | null = null;
  let steps = 0;

  snapshot(frames, processes, time, null, readyIds(processes, time, null), gantt, 'Cola vacía. Esperando la primera llegada.', false);

  while (processes.some((process) => process.remaining > 0) && steps < MAX_STEPS) {
    steps += 1;
    const ready = processes.filter((process) => process.arrival <= time && process.remaining > 0);
    if (!running) {
      running = choose(ready);
      if (!running) {
        const jump = nextArrival(processes, time);
        if (!Number.isFinite(jump)) {
          break;
        }
        appendSlice(gantt, jump, null, sliceStart);
        time = jump;
        snapshot(frames, processes, time, null, readyIds(processes, time, null), gantt, `CPU ociosa hasta t=${time}.`, false);
        continue;
      }
    }
    if (running.firstResponse === null) {
      running.firstResponse = time;
    }
    running.remaining -= 1;
    time += 1;
    appendSlice(gantt, time, running.id, sliceStart);
    if (running.remaining === 0) {
      running.finishTime = time;
      snapshot(
        frames,
        processes,
        time,
        null,
        readyIds(processes, time, null),
        gantt,
        `${running.id} termina en t=${time}.`,
        false,
      );
      running = null;
    } else {
      snapshot(
        frames,
        processes,
        time,
        running.id,
        readyIds(processes, time, running.id),
        gantt,
        `${running.id} ejecuta; restante ${running.remaining}.`,
        false,
      );
    }
  }

  snapshot(frames, processes, time, null, [], gantt, 'Planificación completa.', true);
  return frames;
}

function runPreemptive(
  input: SimProcess[],
  choose: (ready: LiveProcess[]) => LiveProcess | null,
): SchedFrame[] {
  const processes = clone(input);
  const frames: SchedFrame[] = [];
  const gantt: GanttSlice[] = [];
  const sliceStart = { value: 0 };
  let time = 0;
  let running: LiveProcess | null = null;
  let steps = 0;

  snapshot(frames, processes, time, null, readyIds(processes, time, null), gantt, 'Listos para planificar en cada instante.', false);

  while (processes.some((process) => process.remaining > 0) && steps < MAX_STEPS) {
    steps += 1;
    const ready = processes.filter((process) => process.arrival <= time && process.remaining > 0);
    const next = choose(ready);
    if (!next) {
      const jump = nextArrival(processes, time);
      if (!Number.isFinite(jump)) {
        break;
      }
      appendSlice(gantt, jump, null, sliceStart);
      time = jump;
      snapshot(frames, processes, time, null, readyIds(processes, time, null), gantt, `CPU ociosa hasta t=${time}.`, false);
      continue;
    }
    if (running && running.id !== next.id) {
      appendSlice(gantt, time, running.id, sliceStart);
    }
    running = next;
    if (running.firstResponse === null) {
      running.firstResponse = time;
    }
    running.remaining -= 1;
    time += 1;
    appendSlice(gantt, time, running.id, sliceStart);
    if (running.remaining === 0) {
      running.finishTime = time;
      snapshot(
        frames,
        processes,
        time,
        null,
        readyIds(processes, time, null),
        gantt,
        `${running.id} termina en t=${time}.`,
        false,
      );
      running = null;
    } else {
      snapshot(
        frames,
        processes,
        time,
        running.id,
        readyIds(processes, time, running.id),
        gantt,
        `${running.id} ejecuta; restante ${running.remaining}.`,
        false,
      );
    }
  }

  snapshot(frames, processes, time, null, [], gantt, 'Planificación completa.', true);
  return frames;
}

function runRoundRobin(input: SimProcess[], quantum: number): SchedFrame[] {
  const processes = clone(input);
  const map = new Map(processes.map((process) => [process.id, process]));
  const frames: SchedFrame[] = [];
  const gantt: GanttSlice[] = [];
  const sliceStart = { value: 0 };
  const queue: string[] = [];
  const queued = new Set<string>();
  let time = 0;
  let running: LiveProcess | null = null;
  let used = 0;
  let steps = 0;

  enqueueNew(queue, queued, processes, time, null);
  snapshot(frames, processes, time, null, [...queue], gantt, `Round Robin con quantum ${quantum}.`, false);

  while (processes.some((process) => process.remaining > 0) && steps < MAX_STEPS) {
    steps += 1;
    enqueueNew(queue, queued, processes, time, running?.id ?? null);
    if (!running) {
      const id = queue.shift();
      if (id) {
        queued.delete(id);
        running = map.get(id) ?? null;
        used = 0;
      }
    }
    if (!running) {
      const jump = nextArrival(processes, time);
      if (!Number.isFinite(jump)) {
        break;
      }
      appendSlice(gantt, jump, null, sliceStart);
      time = jump;
      snapshot(frames, processes, time, null, [...queue], gantt, `CPU ociosa hasta t=${time}.`, false);
      continue;
    }
    if (running.firstResponse === null) {
      running.firstResponse = time;
    }
    running.remaining -= 1;
    used += 1;
    time += 1;
    appendSlice(gantt, time, running.id, sliceStart);
    enqueueNew(queue, queued, processes, time, running.id);
    if (running.remaining === 0) {
      running.finishTime = time;
      snapshot(frames, processes, time, null, [...queue], gantt, `${running.id} termina en t=${time}.`, false);
      running = null;
      used = 0;
    } else if (used >= quantum) {
      queue.push(running.id);
      queued.add(running.id);
      snapshot(frames, processes, time, null, [...queue], gantt, `Quantum agotado: ${running.id} vuelve a la cola.`, false);
      running = null;
      used = 0;
    } else {
      snapshot(frames, processes, time, running.id, [...queue], gantt, `${running.id} ejecuta; restante ${running.remaining}.`, false);
    }
  }

  snapshot(frames, processes, time, null, [], gantt, 'Planificación completa.', true);
  return frames;
}

function runMlq(input: SimProcess[]): SchedFrame[] {
  const processes = clone(input);
  processes.forEach((process) => {
    process.queue = mlqLevel(process);
  });
  const frames: SchedFrame[] = [];
  const gantt: GanttSlice[] = [];
  const sliceStart = { value: 0 };
  const queues: string[][] = [[], [], []];
  const queued = new Set<string>();
  const map = new Map(processes.map((process) => [process.id, process]));
  let time = 0;
  let running: LiveProcess | null = null;
  let used = 0;
  let steps = 0;

  const admit = (except: string | null) => {
    for (const process of processes) {
      if (process.arrival === time && process.remaining > 0 && process.id !== except && !queued.has(process.id)) {
        queues[process.queue].push(process.id);
        queued.add(process.id);
      }
    }
  };

  const highestReady = (): number => queues.findIndex((queue) => queue.length > 0);

  admit(null);
  snapshot(frames, processes, time, null, flatReady(queues), gantt, 'Colas fijas: sistema (FCFS), interactiva (RR 2) y lote (FCFS).', false);

  while (processes.some((process) => process.remaining > 0) && steps < MAX_STEPS) {
    steps += 1;
    admit(running?.id ?? null);
    const top = highestReady();
    if (running && top >= 0 && top < running.queue) {
      appendSlice(gantt, time, running.id, sliceStart);
      queues[running.queue].push(running.id);
      queued.add(running.id);
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `${running.id} es expulsado por la cola ${top}.`, false);
      running = null;
      used = 0;
    }
    if (!running) {
      const level = highestReady();
      if (level >= 0) {
        const id = queues[level].shift()!;
        queued.delete(id);
        running = map.get(id) ?? null;
        used = 0;
      }
    }
    if (!running) {
      const jump = nextArrival(processes, time);
      if (!Number.isFinite(jump)) {
        break;
      }
      appendSlice(gantt, jump, null, sliceStart);
      time = jump;
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `CPU ociosa hasta t=${time}.`, false);
      continue;
    }
    if (running.firstResponse === null) {
      running.firstResponse = time;
    }
    running.remaining -= 1;
    used += 1;
    time += 1;
    appendSlice(gantt, time, running.id, sliceStart);
    admit(running.id);
    const rr = running.queue === 1;
    if (running.remaining === 0) {
      running.finishTime = time;
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `${running.id} termina en t=${time}.`, false);
      running = null;
      used = 0;
    } else if (rr && used >= 2) {
      queues[1].push(running.id);
      queued.add(running.id);
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `Quantum de Q1 agotado: ${running.id} rota.`, false);
      running = null;
      used = 0;
    } else {
      snapshot(
        frames,
        processes,
        time,
        running.id,
        flatReady(queues),
        gantt,
        `${running.id} en Q${running.queue}; restante ${running.remaining}.`,
        false,
      );
    }
  }

  snapshot(frames, processes, time, null, [], gantt, 'Planificación completa.', true);
  return frames;
}

function runMlfq(input: SimProcess[]): SchedFrame[] {
  const processes = clone(input);
  const frames: SchedFrame[] = [];
  const gantt: GanttSlice[] = [];
  const sliceStart = { value: 0 };
  const queues: string[][] = [[], [], []];
  const queued = new Set<string>();
  const map = new Map(processes.map((process) => [process.id, process]));
  let time = 0;
  let running: LiveProcess | null = null;
  let used = 0;
  let steps = 0;

  const admit = (except: string | null) => {
    for (const process of processes) {
      if (process.arrival === time && process.remaining > 0 && process.id !== except && !queued.has(process.id)) {
        process.queue = 0;
        queues[0].push(process.id);
        queued.add(process.id);
      }
    }
  };

  const highestReady = (): number => queues.findIndex((queue) => queue.length > 0);

  admit(null);
  snapshot(frames, processes, time, null, flatReady(queues), gantt, 'MLFQ: Q0 (q=1), Q1 (q=2) y Q2 (FCFS).', false);

  while (processes.some((process) => process.remaining > 0) && steps < MAX_STEPS) {
    steps += 1;
    admit(running?.id ?? null);
    const top = highestReady();
    if (running && top >= 0 && top < running.queue) {
      appendSlice(gantt, time, running.id, sliceStart);
      queues[running.queue].push(running.id);
      queued.add(running.id);
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `${running.id} es expulsado por Q${top}.`, false);
      running = null;
      used = 0;
    }
    if (!running) {
      const level = highestReady();
      if (level >= 0) {
        const id = queues[level].shift()!;
        queued.delete(id);
        running = map.get(id) ?? null;
        used = 0;
      }
    }
    if (!running) {
      const jump = nextArrival(processes, time);
      if (!Number.isFinite(jump)) {
        break;
      }
      appendSlice(gantt, jump, null, sliceStart);
      time = jump;
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `CPU ociosa hasta t=${time}.`, false);
      continue;
    }
    if (running.firstResponse === null) {
      running.firstResponse = time;
    }
    running.remaining -= 1;
    used += 1;
    time += 1;
    appendSlice(gantt, time, running.id, sliceStart);
    admit(running.id);
    const quantum = MLFQ_QUANTUM[running.queue];
    if (running.remaining === 0) {
      running.finishTime = time;
      snapshot(frames, processes, time, null, flatReady(queues), gantt, `${running.id} termina en t=${time}.`, false);
      running = null;
      used = 0;
    } else if (used >= quantum) {
      if (running.queue < 2) {
        running.queue += 1;
      }
      queues[running.queue].push(running.id);
      queued.add(running.id);
      snapshot(
        frames,
        processes,
        time,
        null,
        flatReady(queues),
        gantt,
        `${running.id} agota el quantum y pasa a Q${running.queue}.`,
        false,
      );
      running = null;
      used = 0;
    } else {
      snapshot(
        frames,
        processes,
        time,
        running.id,
        flatReady(queues),
        gantt,
        `${running.id} en Q${running.queue}; restante ${running.remaining}.`,
        false,
      );
    }
  }

  snapshot(frames, processes, time, null, [], gantt, 'Planificación completa.', true);
  return frames;
}

function readyIds(processes: LiveProcess[], time: number, running: string | null): string[] {
  return processes
    .filter((process) => process.arrival <= time && process.remaining > 0 && process.id !== running)
    .map((process) => process.id);
}

function flatReady(queues: string[][]): string[] {
  return queues.flat();
}

export function lastGantt(frames: SchedFrame[]): GanttSlice[] {
  return frames.at(-1)?.gantt ?? [];
}

export function lastProcesses(frames: SchedFrame[]): ProcessView[] {
  return frames.at(-1)?.processes ?? [];
}
