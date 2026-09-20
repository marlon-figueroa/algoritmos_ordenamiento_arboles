import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AlgorithmPage } from './pages/algorithm/algorithm';
import { SchedulingHome } from './pages/scheduling-home/scheduling-home';
import { SchedulingPage } from './pages/scheduling/scheduling';
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
    path: '**',
    component: NotFound,
    title: 'Página no encontrada',
  },
];
