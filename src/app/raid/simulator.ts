import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RaidAlgorithm } from '../core/raids';
import { downloadSimulationPdf } from '../core/pdf-report';
import { simulateRaid } from './engines';
import { buildRaidReport } from './report';
import {
  CELL_COLORS,
  CellKind,
  RaidFrame,
  SAMPLE_BLOCKS,
  clampDisks,
  emptyRaidFrame,
  formatBlocks,
  kindLabel,
  parseBlocks,
  randomBlocks,
} from './models';

@Component({
  selector: 'app-raid-simulator',
  templateUrl: './simulator.html',
})
export class RaidSimulator {
  private readonly destroyRef = inject(DestroyRef);

  readonly algorithm = input.required<RaidAlgorithm>();
  readonly rawInput = signal(formatBlocks(SAMPLE_BLOCKS));
  readonly disks = signal(4);
  readonly error = signal<string | null>(null);
  readonly frames = signal<RaidFrame[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(650);

  readonly frame = computed(() => this.frames()[this.index()] ?? emptyRaidFrame);
  readonly total = computed(() => this.frames().length);
  readonly rows = computed(() => Array.from({ length: Math.max(this.frame().rows, 1) }, (_, index) => index));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      untracked(() => {
        this.disks.set(algorithm.defaultDisks);
        this.rawInput.set(formatBlocks(SAMPLE_BLOCKS));
        this.load(SAMPLE_BLOCKS);
      });
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  load(values?: string[]): void {
    this.stop();
    this.error.set(null);
    try {
      const blocks = values ?? parseBlocks(this.rawInput());
      const count = clampDisks(this.algorithm().slug, this.disks());
      this.disks.set(count);
      this.rawInput.set(formatBlocks(blocks));
      this.frames.set(simulateRaid(this.algorithm().slug, blocks, count));
      this.index.set(0);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar el arreglo.');
    }
  }

  randomize(): void {
    const generated = randomBlocks();
    this.rawInput.set(formatBlocks(generated));
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

  onDisks(value: string): void {
    this.disks.set(clampDisks(this.algorithm().slug, Number(value)));
  }

  cellAt(disk: number, row: number) {
    return this.frame().cells.find((cell) => cell.disk === disk && cell.row === row);
  }

  cellColor(kind: CellKind): string {
    return CELL_COLORS[kind];
  }

  kindLabel = kindLabel;

  async downloadPdf(): Promise<void> {
    if (!this.frames().length || this.error()) {
      return;
    }
    try {
      const blocks = parseBlocks(this.rawInput());
      await downloadSimulationPdf(buildRaidReport(this.algorithm(), blocks, this.disks(), this.frames()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
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
