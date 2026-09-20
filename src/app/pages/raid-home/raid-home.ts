import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RAIDS } from '../../core/raids';

@Component({
  selector: 'app-raid-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './raid-home.html',
})
export class RaidHome {
  protected readonly algorithms = RAIDS;
}
