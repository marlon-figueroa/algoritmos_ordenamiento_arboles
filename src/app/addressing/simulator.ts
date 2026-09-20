import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { AddressingAlgorithm } from '../core/addressing';
import { downloadSimulationPdf } from '../core/pdf-report';
import { lastNetworks, simulateAddressing } from './engines';
import { buildAddressReport } from './report';
import {
  AddressFrame,
  AddressPlanInput,
  KIND_COLORS,
  NetworkKind,
  SAMPLE_PLAN,
  emptyAddressFrame,
  formatPlan,
  kindLabel,
  parsePlanInput,
  randomPlan,
} from './models';

@Component({
  selector: 'app-addressing-simulator',
  imports: [DecimalPipe],
  templateUrl: './simulator.html',
})
export class AddressingSimulator {
  private readonly destroyRef = inject(DestroyRef);

  readonly algorithm = input.required<AddressingAlgorithm>();
  readonly gateway = signal(SAMPLE_PLAN.gateway);
  readonly lanCount = signal(String(SAMPLE_PLAN.lanCount));
  readonly manCount = signal(String(SAMPLE_PLAN.manCount));
  readonly wanCount = signal(String(SAMPLE_PLAN.wanCount));
  readonly lanHosts = signal(String(SAMPLE_PLAN.lanHosts));
  readonly manHosts = signal(String(SAMPLE_PLAN.manHosts));
  readonly wanHosts = signal(String(SAMPLE_PLAN.wanHosts));
  readonly error = signal<string | null>(null);
  readonly frames = signal<AddressFrame[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(750);

  readonly frame = computed(() => this.frames()[this.index()] ?? emptyAddressFrame);
  readonly total = computed(() => this.frames().length);
  readonly networks = computed(() => this.frame().networks);
  readonly parent = computed(() => this.frame().parent);
  readonly segments = computed(() => this.buildSegments(this.frame()));

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPlan: AddressPlanInput = SAMPLE_PLAN;

  constructor() {
    effect(() => {
      this.algorithm();
      untracked(() => this.applyPlan(SAMPLE_PLAN));
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  load(plan?: AddressPlanInput): void {
    this.stop();
    this.error.set(null);
    try {
      const parsed =
        plan ??
        parsePlanInput(
          this.gateway(),
          this.lanCount(),
          this.manCount(),
          this.wanCount(),
          this.lanHosts(),
          this.manHosts(),
          this.wanHosts(),
        );
      const normalized = formatPlan(parsed);
      this.lastPlan = normalized;
      this.syncFields(normalized);
      this.frames.set(simulateAddressing(this.algorithm().slug, normalized));
      this.index.set(0);
    } catch (err) {
      this.frames.set([]);
      this.index.set(0);
      this.error.set(err instanceof Error ? err.message : 'No se pudo planificar la red.');
    }
  }

  randomize(): void {
    this.applyPlan(randomPlan());
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

  kindColor(kind: NetworkKind): string {
    return KIND_COLORS[kind];
  }

  kindLabel = kindLabel;

  isHighlighted(name: string): boolean {
    return this.frame().highlightName === name;
  }

  async downloadPdf(): Promise<void> {
    if (!this.frames().length || this.error()) {
      return;
    }
    try {
      const networks = lastNetworks(this.frames());
      if (!networks.length) {
        this.index.set(this.total() - 1);
      }
      await downloadSimulationPdf(buildAddressReport(this.algorithm(), this.lastPlan, this.frames()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    }
  }

  private applyPlan(plan: AddressPlanInput): void {
    this.syncFields(plan);
    this.load(plan);
  }

  private syncFields(plan: AddressPlanInput): void {
    this.gateway.set(plan.gateway);
    this.lanCount.set(String(plan.lanCount));
    this.manCount.set(String(plan.manCount));
    this.wanCount.set(String(plan.wanCount));
    this.lanHosts.set(String(plan.lanHosts));
    this.manHosts.set(String(plan.manHosts));
    this.wanHosts.set(String(plan.wanHosts));
  }

  private buildSegments(frame: AddressFrame) {
    const parent = frame.parent;
    if (!parent) {
      return [];
    }
    const items = frame.networks.map((network) => ({
      name: network.name,
      kind: network.kind,
      prefix: network.prefix,
      size: 2 ** (32 - network.prefix),
      color: KIND_COLORS[network.kind],
    }));
    if (frame.unused > 0) {
      items.push({
        name: 'Libre',
        kind: 'LAN',
        prefix: parent.prefix,
        size: frame.unused,
        color: 'transparent',
      });
    }
    return items;
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
