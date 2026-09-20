import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { Theme } from '../core/theme';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class Header {
  protected readonly theme = inject(Theme);
  private readonly router = inject(Router);

  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly aoaActive = computed(() => {
    const url = this.path().split('?')[0];
    return url === '/' || url.startsWith('/algoritmos');
  });

  protected readonly appsoActive = computed(() => this.path().split('?')[0].startsWith('/planificacion'));
}
