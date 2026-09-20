import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { SchedulerAlgorithm } from '../core/schedulers';
import { downloadSimulationPdf } from '../core/pdf-report';
import { simulateSchedule } from './engines';
import { buildScheduleReport } from './report';
import {
  SAMPLE_PROCESSES,
  SchedFrame,
  SimProcess,
  averages,
  emptySchedFrame,
  formatProcesses,
  parseProcesses,
  processColor,
  randomProcesses,
} from './models';

@Component({
  selector: 'app-scheduler-simulator',
  imports: [DecimalPipe],
  templateUrl: './simulator.html',
})
export class SchedulerSimulator {
  private readonly destroyRef = inject(DestroyRef);

  readonly algorithm = input.required<SchedulerAlgorithm>();
  readonly rawInput = signal(formatProcesses(SAMPLE_PROCESSES));
  readonly quantum = signal(2);
  readonly error = signal<string | null>(null);
  readonly frames = signal<SchedFrame[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(650);

  readonly frame = computed(() => this.frames()[this.index()] ?? emptySchedFrame);
  readonly total = computed(() => this.frames().length);
  readonly ids = computed(() => this.frame().processes.map((process) => process.id));
  readonly stats = computed(() => averages(this.frame().processes));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      untracked(() => {
        this.quantum.set(algorithm.defaultQuantum);
        this.rawInput.set(formatProcesses(SAMPLE_PROCESSES));
        this.load(SAMPLE_PROCESSES);
      });
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  load(values?: SimProcess[]): void {
    this.stop();
    this.error.set(null);
    try {
      const input = values ?? parseProcesses(this.rawInput());
      this.rawInput.set(formatProcesses(input));
      this.frames.set(simulateSchedule(this.algorithm().slug, input, this.quantum()));
      this.index.set(0);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar la carga de trabajo.');
    }
  }

  randomize(): void {
    const generated = randomProcesses();
    this.rawInput.set(formatProcesses(generated));
    this.load(generated);
  }

  play(): void {
    if (this.index() >= this.total() - 1) {
      this.index.set(0);
    }
    this.playing.set(true);
    this.queueTick();
  }

  pause(): void {
    this.stop();
  }

  step(): void {
    if (this.index() < this.total() - 1) {
      this.index.update((value) => value + 1);
    } else {
      this.stop();
    }
  }

  back(): void {
    this.stop();
    this.index.update((value) => Math.max(0, value - 1));
  }

  reset(): void {
    this.stop();
    this.index.set(0);
  }

  onSpeed(value: string): void {
    this.speed.set(Number(value));
    if (this.playing()) {
      this.queueTick();
    }
  }

  onQuantum(value: string): void {
    this.quantum.set(Math.max(1, Number(value) || 1));
  }

  color(id: string | null): string {
    if (!id) {
      return 'var(--bs-secondary-bg, #94a3b8)';
    }
    return processColor(id, this.ids());
  }

  statusClass(status: string): string {
    if (status === 'running') {
      return 'text-bg-primary';
    }
    if (status === 'done') {
      return 'text-bg-success';
    }
    if (status === 'ready') {
      return 'text-bg-info';
    }
    return 'text-bg-secondary';
  }

  async downloadPdf(): Promise<void> {
    if (!this.frames().length || this.error()) {
      return;
    }
    try {
      const input = parseProcesses(this.rawInput());
      await downloadSimulationPdf(buildScheduleReport(this.algorithm(), input, this.frames(), this.quantum()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'running':
        return 'Ejecutando';
      case 'ready':
        return 'Listo';
      case 'done':
        return 'Terminado';
      default:
        return 'Nuevo';
    }
  }

  private queueTick(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.step(), this.speed());
  }

  private stop(): void {
    this.playing.set(false);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
