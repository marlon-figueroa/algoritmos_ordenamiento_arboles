import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SCHEDULERS } from '../../core/schedulers';
import { SchedulerSimulator } from '../../scheduler/simulator';

@Component({
  selector: 'app-scheduling',
  imports: [RouterLink, SchedulerSimulator],
  templateUrl: './scheduling.html',
})
export class SchedulingPage {
  private readonly title = inject(Title);

  readonly slug = input.required<string>();
  readonly algorithm = computed(() => SCHEDULERS.find((item) => item.slug === this.slug()));
  readonly related = computed(() => {
    const current = this.algorithm();
    return SCHEDULERS.filter((item) => item.slug !== current?.slug).slice(0, 3);
  });

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      this.title.setTitle(
        algorithm
          ? `${algorithm.name} · Planificación de procesos`
          : 'Algoritmo no encontrado · Planificación de procesos',
      );
    });
  }
}
