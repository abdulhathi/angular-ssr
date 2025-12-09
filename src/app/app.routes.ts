import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ErrorPageComponent } from './error-page.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    pathMatch: 'full',
    component: DashboardComponent,
  },
  {
    path: 'error',
    component: ErrorPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
