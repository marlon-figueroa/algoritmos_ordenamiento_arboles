import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Algorithm } from '../core/algorithms';
import { SAMPLE_INPUTS, SimFrame, emptyFrame, formatValue, parseInput } from './models';
import { simulate } from './engines';
import { layoutForest } from './layout';

@Component({
  selector: 'app-simulator',
  templateUrl: './simulator.html',
})
export class Simulator {
  private readonly destroyRef = inject(DestroyRef);

  readonly algorithm = input.required<Algorithm>();
  readonly rawInput = signal('');
  readonly error = signal<string | null>(null);
  readonly frames = signal<SimFrame[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(650);
  readonly viewBoxWidth = 920;
  readonly viewBoxHeight = 280;

  readonly frame = computed(() => this.frames()[this.index()] ?? emptyFrame);
  readonly total = computed(() => this.frames().length);
  readonly positions = computed(() =>
    layoutForest(this.frame().nodes, this.frame().rootIds, this.viewBoxWidth, this.viewBoxHeight),
  );
  readonly edges = computed(() => {
    const frame = this.frame();
    const pos = this.positions();
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];
    for (const node of frame.nodes) {
      const from = pos.get(node.id);
      if (!from) {
        continue;
      }
      for (const childId of node.childrenIds) {
        const to = pos.get(childId);
        if (!to) {
          continue;
        }
        lines.push({
          id: `${node.id}-${childId}`,
          x1: from.x,
          y1: from.y + from.height / 2,
          x2: to.x,
          y2: to.y - to.height / 2,
        });
      }
    }
    return lines;
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const sample = SAMPLE_INPUTS[this.algorithm().slug] ?? [7, 3, 9, 1, 5];
      untracked(() => {
        this.rawInput.set(sample.join(', '));
        this.load(sample);
      });
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  load(values?: number[]): void {
    this.stop();
    this.error.set(null);
    try {
      const input = values ?? parseInput(this.rawInput());
      this.rawInput.set(input.join(', '));
      this.frames.set(simulate(this.algorithm().slug, input));
      this.index.set(0);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar el arreglo.');
    }
  }

  randomize(): void {
    const count = 6 + Math.floor(Math.random() * 4);
    const pool = Array.from({ length: 23 }, (_, i) => i + 1);
    const picked: number[] = [];
    for (let i = 0; i < count; i++) {
      const at = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(at, 1)[0]);
    }
    this.rawInput.set(picked.join(', '));
    this.load(picked);
  }

  play(): void {
    if (this.playing() || this.index() >= this.total() - 1) {
      if (this.index() >= this.total() - 1) {
        this.index.set(0);
      }
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

  chipClass(index: number): string {
    const frame = this.frame();
    if (frame.lockedIndexes.includes(index)) {
      return 'text-bg-success';
    }
    if (frame.highlightedIndexes.includes(index)) {
      return 'text-bg-primary';
    }
    return 'text-bg-secondary';
  }

  formatValue = formatValue;

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
