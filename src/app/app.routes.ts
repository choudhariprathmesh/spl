import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: '', redirectTo: 'trading-journal', pathMatch: 'full'},
    {
    path: 'trading-journal',
    loadComponent: () =>
      import('./trading-journal/trading-journal')
        .then(m => m.TradingJournal)
  }
];
