import { Routes } from '@angular/router';
import { gardeAdmin, gardeConnecte } from './core/gardes';

/**
 * Toutes les routes de contenu sont chargées à la demande
 * (`loadComponent`). Conséquence concrète : le visiteur qui ouvre le
 * catalogue ne télécharge pas le reste de l'application. Sur une 3G
 * irrégulière, c'est la différence entre un premier écran en deux secondes
 * et un en huit.
 *
 * Les coques sont montées par le routeur, chacune sur son arbre : la
 * boutique et le back-office n'ont ni le même en-tête ni la même densité.
 */
export const routes: Routes = [
  {
    // Le back-office est déclaré avant la boutique : son arbre a sa propre
    // coque, et le joker de la boutique avalerait « admin » s'il passait
    // en premier.
    path: 'admin',
    loadComponent: () => import('./admin/coque/coque').then((m) => m.CoqueAdmin),
    canActivate: [gardeAdmin],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        loadComponent: () =>
          import('./admin/tableau-de-bord/tableau-de-bord').then((m) => m.AdminTableauDeBord),
        title: 'Tableau de bord',
      },
      {
        path: 'commandes',
        loadComponent: () => import('./admin/commandes/commandes').then((m) => m.AdminCommandes),
        title: 'Commandes',
      },
      {
        path: 'paiements',
        loadComponent: () => import('./admin/paiements/paiements').then((m) => m.AdminPaiements),
        title: 'Paiements',
      },
      {
        path: 'paiements/:reference',
        loadComponent: () =>
          import('./admin/paiement-detail/paiement-detail').then((m) => m.AdminPaiementDetail),
        title: 'Détail du paiement',
      },
      {
        path: 'articles',
        loadComponent: () => import('./admin/articles/articles').then((m) => m.AdminArticles),
        title: 'Catalogue',
      },
      {
        path: 'clients',
        loadComponent: () => import('./admin/clients/clients').then((m) => m.AdminClients),
        title: 'Clients',
      },
      {
        path: 'avis',
        loadComponent: () => import('./admin/avis/avis').then((m) => m.AdminAvis),
        title: 'Avis',
      },
      {
        path: 'journal',
        loadComponent: () => import('./admin/journal/journal').then((m) => m.AdminJournal),
        title: "Journal d'audit",
      },
      {
        path: 'identite',
        loadComponent: () => import('./admin/identite/identite').then((m) => m.AdminIdentite),
        title: 'Identité de la boutique',
      },
      {
        // Une URL inconnue sous /admin n'est pas une page de boutique
        // manquante : le message doit le dire.
        path: '**',
        loadComponent: () => import('./introuvable/introuvable').then((m) => m.Introuvable),
        data: { cas: 'admin' },
        title: 'Page introuvable',
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./boutique/coque/coque').then((m) => m.CoqueBoutique),
    children: [
      {
        path: '',
        loadComponent: () => import('./boutique/accueil/accueil').then((m) => m.Accueil),
        title: 'Boutique',
      },
      {
        path: 'catalogue',
        loadComponent: () => import('./boutique/catalogue/catalogue').then((m) => m.Catalogue),
        title: 'Catalogue',
      },
      {
        path: 'article/:id',
        loadComponent: () => import('./boutique/article/article').then((m) => m.ArticlePage),
        title: 'Article',
      },
      {
        path: 'panier',
        loadComponent: () => import('./boutique/panier/panier').then((m) => m.PanierPage),
        canActivate: [gardeConnecte],
        title: 'Mon panier',
      },
      {
        path: 'commande',
        loadComponent: () => import('./boutique/commande/commande').then((m) => m.CommandePage),
        canActivate: [gardeConnecte],
        title: 'Paiement',
      },
      {
        path: 'paiement/:reference',
        loadComponent: () => import('./boutique/suivi/suivi').then((m) => m.Suivi),
        canActivate: [gardeConnecte],
        title: 'Suivi du paiement',
      },
      {
        path: 'mes-commandes',
        loadComponent: () =>
          import('./boutique/mes-commandes/mes-commandes').then((m) => m.MesCommandes),
        canActivate: [gardeConnecte],
        title: 'Mes commandes',
      },
      {
        path: 'connexion',
        loadComponent: () => import('./boutique/connexion/connexion').then((m) => m.Connexion),
        title: 'Connexion',
      },
      {
        path: 'inscription',
        loadComponent: () =>
          import('./boutique/inscription/inscription').then((m) => m.Inscription),
        title: 'Créer un compte',
      },
      {
        // Connecté mais sans le rôle requis : ce n'est ni une page manquante
        // ni un problème de connexion, et le message doit le dire.
        path: 'acces-refuse',
        loadComponent: () => import('./introuvable/introuvable').then((m) => m.Introuvable),
        data: { cas: 'refus' },
        title: 'Accès refusé',
      },
      {
        // Doit rester en dernier : le joker avale tout ce qui précède. La
        // page garde la coque de la boutique, pour que le visiteur égaré
        // ait toujours la navigation sous la main.
        path: '**',
        loadComponent: () => import('./introuvable/introuvable').then((m) => m.Introuvable),
        title: 'Page introuvable',
      },
    ],
  },
];
