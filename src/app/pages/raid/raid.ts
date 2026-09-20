import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RAIDS } from '../../core/raids';
import { RaidSimulator } from '../../raid/simulator';

@Component({
  selector: 'app-raid',
  imports: [RouterLink, RaidSimulator],
  templateUrl: './raid.html',
})
export class RaidPage {
  private readonly title = inject(Title);

  readonly slug = input.required<string>();
  readonly algorithm = computed(() => RAIDS.find((item) => item.slug === this.slug()));
  readonly related = computed(() => {
    const current = this.algorithm();
    return RAIDS.filter((item) => item.slug !== current?.slug).slice(0, 3);
  });

  constructor() {
    effect(() => {
      const algorithm = this.algorithm();
      this.title.setTitle(
        algorithm ? `${algorithm.name} · RAID de discos` : 'RAID no encontrado · RAID de discos',
      );
    });
  }
}
