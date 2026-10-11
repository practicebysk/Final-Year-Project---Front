import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  // 'projects/new' must come before 'projects/:id'
  {
    path: 'projects/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/create-project/create-project').then((m) => m.CreateProject),
  },
  {
    path: 'projects/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/builder/builder').then((m) => m.Builder),
  },
  { path: 'health', loadComponent: () => import('./features/health-check/health-check').then((m) => m.HealthCheck) },
  {
    path: 'projects/:id',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./features/builder/builder').then((m) => m.Builder),
  },
  { path: '**', redirectTo: 'login' },
];