import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', children: [] },
  { path: 'dashboard', children: [] },
  { path: 'reconciliation', children: [] },
  { path: 'compensation', children: [] },
  { path: 'accounting', children: [] },
  { path: '**', redirectTo: 'home' }
];
