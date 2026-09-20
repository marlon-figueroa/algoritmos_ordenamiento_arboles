import { SchedulerAlgorithm } from '../core/schedulers';
import { SimulationReport, reportFilename } from '../core/pdf-report';
import { lastGantt, lastProcesses } from './engines';
import { SchedFrame, SimProcess, averages } from './models';

export function buildScheduleConclusion(
  algorithm: SchedulerAlgorithm,
  input: SimProcess[],
  frames: SchedFrame[],
  quantum: number,
): string[] {
  const processes = lastProcesses(frames);
  const gantt = lastGantt(frames);
  const stats = averages(processes);
  const makespan = gantt.at(-1)?.end ?? 0;
  const longest = [...input].sort((a, b) => b.burst - a.burst)[0];
  const shortest = [...input].sort((a, b) => a.burst - b.burst)[0];
  const first = [...input].sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id))[0];
  const maxWait = processes.reduce((best, process) => (process.waiting > best.waiting ? process : best), processes[0]);
  const lines = [
    `${algorithm.name} planificó ${input.length} procesos. El tiempo total (makespan) fue ${makespan} y se recorrieron ${frames.length} instantes de simulación.`,
    `Espera media ${stats.waiting.toFixed(2)}, retorno medio ${stats.turnaround.toFixed(2)} y respuesta media ${stats.response.toFixed(2)}.`,
  ];

  if (algorithm.usesQuantum) {
    lines.push(`El quantum usado fue ${quantum}. Un quantum menor aumenta los cambios de contexto; uno mayor se parece a FCFS.`);
  }

  if (algorithm.slug === 'fcfs' && first && longest && first.id === longest.id && shortest && first.id !== shortest.id) {
    lines.push(
      `El primero en llegar, ${first.id}, tenía la ráfaga más larga (${first.burst}). Eso provoca efecto convoy: ${shortest.id} (ráfaga ${shortest.burst}) esperó detrás de un trabajo largo. SJF o SRTF habrían reducido esa espera.`,
    );
  } else if (algorithm.slug === 'sjf' || algorithm.slug === 'srtf') {
    lines.push(
      `Al favorecer la ráfaga corta, ${shortest?.id ?? 'el trabajo más corto'} se atiende pronto. ${longest?.id ?? 'El más largo'} espera más: hay riesgo de inanición si siguen llegando trabajos cortos.`,
    );
  } else if (algorithm.slug.startsWith('priority')) {
    const urgent = [...input].sort((a, b) => a.priority - b.priority)[0];
    lines.push(
      `La prioridad más alta fue ${urgent.id} (prioridad ${urgent.priority}). ${algorithm.preemptive ? 'Al ser expulsiva, un proceso urgente puede interrumpir al que corre.' : 'Al no ser expulsiva, el proceso que ya está en CPU termina aunque llegue otro más prioritario.'}`,
    );
  } else if (algorithm.slug === 'round-robin') {
    const slices = gantt.filter((slice) => slice.processId);
    const longSlices = slices.filter((slice) => slice.end - slice.start >= quantum);
    lines.push(
      `Hubo ${slices.length} rodajas de CPU. ${longSlices.length} usaron el quantum completo. Round Robin reparte el procesador y evita inanición, a costa de más cambios de contexto.`,
    );
  } else if (algorithm.slug === 'mlq' || algorithm.slug === 'mlfq') {
    lines.push(
      'Las colas altas se despachan antes que las bajas. Un proceso largo o de baja prioridad puede esperar mucho si la cola superior no se vacía.',
    );
  }

  if (maxWait) {
    lines.push(
      `El proceso con más espera fue ${maxWait.id} (${maxWait.waiting} unidades, retorno ${maxWait.turnaround}). Con esta entrada, ${algorithm.name} (${algorithm.complexity.kind.toLowerCase()}) ${algorithm.complexity.starvation === 'No' ? 'no introduce inanición.' : 'puede dejar esperando a algún proceso si la carga se sesga.'}`,
    );
  }
  return lines;
}

export function buildScheduleReport(
  algorithm: SchedulerAlgorithm,
  input: SimProcess[],
  frames: SchedFrame[],
  quantum: number,
): SimulationReport {
  const processes = lastProcesses(frames);
  const gantt = lastGantt(frames);
  const stats = averages(processes);
  return {
    catalog: 'APPSO · Planificación de procesos',
    algorithm: algorithm.name,
    filename: reportFilename('APPSO', algorithm.slug),
    inputLines: [
      ...input.map((process) => `${process.id}: llegada ${process.arrival}, ráfaga ${process.burst}, prioridad ${process.priority}`),
      algorithm.usesQuantum ? `Quantum: ${quantum}` : `Tipo: ${algorithm.complexity.kind}`,
    ],
    resultLines: [
      `Gantt: ${gantt.map((slice) => `${slice.processId ?? 'idle'} ${slice.start}-${slice.end}`).join(', ') || '—'}`,
      `Makespan: ${gantt.at(-1)?.end ?? 0}  ·  Espera media: ${stats.waiting.toFixed(2)}  ·  Retorno medio: ${stats.turnaround.toFixed(2)}`,
    ],
    resultTable: {
      headers: ['Proceso', 'Llegada', 'Ráfaga', 'Fin', 'Espera', 'Retorno', 'Respuesta'],
      rows: processes.map((process) => [
        process.id,
        String(process.arrival),
        String(process.burst),
        process.finishTime === null ? '—' : String(process.finishTime),
        String(process.waiting),
        String(process.turnaround),
        process.response === null ? '—' : String(process.response),
      ]),
    },
    conclusion: buildScheduleConclusion(algorithm, input, frames, quantum),
  };
}
