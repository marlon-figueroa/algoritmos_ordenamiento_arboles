import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ALGORITHMS } from '../../core/algorithms';

@Component({
  selector: 'app-algorithm',
  imports: [RouterLink],
  templateUrl: './algorithm.html',
})
export class AlgorithmPage {
  private readonly title = inject(Title);

  readonly slug = input.required<string>();
  readonly algorithm = computed(() => ALGORITHMS.find((item) => item.slug === this.slug()));
  readonly related = computed(() => {
    const current = this.algorithm();
    return ALGORITHMS.filter((item) => item.slug !== current?.slug).slice(0, 3);
  });

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      this.title.setTitle(
        algorithm
          ? `${algorithm.name} · Ordenamiento de árboles`
          : 'Algoritmo no encontrado · Ordenamiento de árboles',
      );
    });
  }
}
