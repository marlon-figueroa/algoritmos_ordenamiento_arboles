import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ADDRESSING } from '../../core/addressing';
import { AddressingSimulator } from '../../addressing/simulator';

@Component({
  selector: 'app-addressing',
  imports: [RouterLink, AddressingSimulator],
  templateUrl: './addressing.html',
})
export class AddressingPage {
  private readonly title = inject(Title);

  readonly slug = input.required<string>();
  readonly algorithm = computed(() => ADDRESSING.find((item) => item.slug === this.slug()));
  readonly related = computed(() => {
    const current = this.algorithm();
    return ADDRESSING.filter((item) => item.slug !== current?.slug);
  });

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      this.title.setTitle(
        algorithm
          ? `${algorithm.name} · Tabla de direccionamiento`
          : 'Método no encontrado · Tabla de direccionamiento',
      );
    });
  }
}
