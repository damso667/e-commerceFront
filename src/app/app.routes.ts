import { Routes } from '@angular/router';

/** Routes réduites, le temps de valider le socle. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./boutique/coque/coque').then((m) => m.CoqueBoutique),
    children: [
      {
        path: '',
        loadComponent: () => import('./boutique/accueil/accueil').then((m) => m.Accueil),
      },
      {
        path: 'acces-refuse',
        loadComponent: () => import('./introuvable/introuvable').then((m) => m.Introuvable),
        data: { cas: 'refus' },
      },
      {
        path: '**',
        loadComponent: () => import('./introuvable/introuvable').then((m) => m.Introuvable),
      },
    ],
  },
];
