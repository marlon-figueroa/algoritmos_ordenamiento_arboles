import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ALGORITHMS } from '../../core/algorithms';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.html',
})
export class Home {
  protected readonly algorithms = ALGORITHMS;
}
