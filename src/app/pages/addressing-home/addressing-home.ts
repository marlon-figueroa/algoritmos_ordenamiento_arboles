import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADDRESSING } from '../../core/addressing';

@Component({
  selector: 'app-addressing-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './addressing-home.html',
})
export class AddressingHome {
  protected readonly algorithms = ADDRESSING;
}
