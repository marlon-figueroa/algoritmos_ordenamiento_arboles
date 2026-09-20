import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SCHEDULERS } from '../../core/schedulers';

@Component({
  selector: 'app-scheduling-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './scheduling-home.html',
})
export class SchedulingHome {
  protected readonly algorithms = SCHEDULERS;
}
