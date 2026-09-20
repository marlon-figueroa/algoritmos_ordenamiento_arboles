import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AlgorithmPage } from './pages/algorithm/algorithm';
import { SchedulingHome } from './pages/scheduling-home/scheduling-home';
import { SchedulingPage } from './pages/scheduling/scheduling';
import { RaidHome } from './pages/raid-home/raid-home';
import { RaidPage } from './pages/raid/raid';
import { AddressingHome } from './pages/addressing-home/addressing-home';
import { AddressingPage } from './pages/addressing/addressing';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'AOA · Algoritmos de ordenamiento de árboles',
  },
  {
    path: 'algoritmos/:slug',
    component: AlgorithmPage,
  },
  {
    path: 'planificacion',
    component: SchedulingHome,
    title: 'APPSO · Planificación de procesos',
  },
  {
    path: 'planificacion/:slug',
    component: SchedulingPage,
  },
  {
    path: 'raids',
    component: RaidHome,
    title: 'ARD · RAIDs de discos',
  },
  {
    path: 'raids/:slug',
    component: RaidPage,
  },
  {
    path: 'direccionamiento',
    component: AddressingHome,
    title: 'TDR · Tabla de direccionamiento de redes',
  },
  {
    path: 'direccionamiento/:slug',
    component: AddressingPage,
  },
  {
    path: '**',
    component: NotFound,
    title: 'Página no encontrada',
  },
];
