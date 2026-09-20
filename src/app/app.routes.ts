import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AlgorithmPage } from './pages/algorithm/algorithm';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Algoritmos de ordenamiento de árboles',
  },
  {
    path: 'algoritmos/:slug',
    component: AlgorithmPage,
  },
  {
    path: '**',
    component: NotFound,
    title: 'Página no encontrada',
  },
];
