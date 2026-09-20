import { SAMPLE_PROCESSES } from './models';
import { lastGantt, lastProcesses, simulateSchedule } from './engines';

const SLUGS = [
  'fcfs',
  'sjf',
  'srtf',
  'round-robin',
  'priority',
  'priority-preemptive',
  'mlq',
  'mlfq',
] as const;

describe('planificadores', () => {
  it.each(SLUGS)('%s termina todos los procesos de la carga de ejemplo', (slug) => {
    const frames = simulateSchedule(slug, SAMPLE_PROCESSES, 2);
    const last = lastProcesses(frames);
    expect(frames.length).toBeGreaterThan(2);
    expect(frames.at(-1)?.done).toBe(true);
    expect(last.map((process) => process.id).sort()).toEqual(['P1', 'P2', 'P3', 'P4']);
    for (const process of last) {
      expect(process.remaining).toBe(0);
      expect(process.finishTime).toBeGreaterThan(process.arrival);
      expect(process.turnaround).toBe((process.finishTime ?? 0) - process.arrival);
      expect(process.waiting).toBe(process.turnaround - process.burst);
    }
  });

  it('FCFS respeta el orden de llegada', () => {
    const gantt = lastGantt(simulateSchedule('fcfs', SAMPLE_PROCESSES));
    expect(gantt).toEqual([
      { processId: 'P1', start: 0, end: 5 },
      { processId: 'P2', start: 5, end: 8 },
      { processId: 'P3', start: 8, end: 16 },
      { processId: 'P4', start: 16, end: 22 },
    ]);
  });

  it('SJF elige la ráfaga más corta cuando hay varios listos', () => {
    const gantt = lastGantt(simulateSchedule('sjf', SAMPLE_PROCESSES));
    expect(gantt).toEqual([
      { processId: 'P1', start: 0, end: 5 },
      { processId: 'P2', start: 5, end: 8 },
      { processId: 'P4', start: 8, end: 14 },
      { processId: 'P3', start: 14, end: 22 },
    ]);
  });

  it('SRTF expulsa a P1 cuando llega P2', () => {
    const gantt = lastGantt(simulateSchedule('srtf', SAMPLE_PROCESSES));
    expect(gantt[0]).toEqual({ processId: 'P1', start: 0, end: 1 });
    expect(gantt[1]).toEqual({ processId: 'P2', start: 1, end: 4 });
  });

  it('Round Robin no deja rodajas más largas que el quantum salvo el último resto', () => {
    const gantt = lastGantt(simulateSchedule('round-robin', SAMPLE_PROCESSES, 2));
    for (const slice of gantt) {
      if (slice.processId) {
        expect(slice.end - slice.start).toBeLessThanOrEqual(2);
      }
    }
    expect(gantt[0]).toEqual({ processId: 'P1', start: 0, end: 2 });
  });

  it('Prioridad no expulsiva deja terminar a P1 aunque P2 sea más prioritario', () => {
    const gantt = lastGantt(simulateSchedule('priority', SAMPLE_PROCESSES));
    expect(gantt[0]).toEqual({ processId: 'P1', start: 0, end: 5 });
    expect(gantt[1]).toEqual({ processId: 'P2', start: 5, end: 8 });
  });
});
