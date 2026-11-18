import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ParametresService } from '../services/parametres.service';

/** Les trois situations que cet écran couvre. */
type Cas = 'introuvable' | 'refus' | 'admin';

/**
 * Écran d'égarement.
 *
 * Trois situations très différentes aboutissent ici, et les confondre est
 * exactement ce qui rend une page d'erreur inutile :
 *
 *  - **introuvable** — l'adresse n'existe pas. Le visiteur s'est trompé, ou
 *    un lien est mort. Il faut lui rendre la main sur le catalogue.
 *  - **refus** — la page existe, il est connecté, mais son compte n'a pas le
 *    rôle requis. Lui proposer de se reconnecter serait absurde : ce n'est
 *    pas un problème d'identification.
 *  - **admin** — adresse inconnue *dans* le back-office. Le renvoyer sur la
 *    boutique lui ferait perdre son contexte de travail.
 *
 * Le chemin tenté est affiché : sans lui, impossible de repérer la faute de
 * frappe ni de signaler le lien mort.
 */
@Component({
  selector: 'app-introuvable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './introuvable.html',
  styleUrl: './introuvable.css',
})
export class Introuvable {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly parametres = inject(ParametresService);

  protected readonly nom = this.parametres.nom;
  protected readonly connecte = this.auth.connecte;

  private readonly donneesRoute = toSignal(
    this.route.data.pipe(map((donnees) => donnees['cas'] as Cas | undefined)),
    { initialValue: undefined },
  );

  protected readonly cas = computed<Cas>(() => this.donneesRoute() ?? 'introuvable');

  /** Le chemin que le visiteur a réellement demandé. */
  protected readonly chemin = this.router.url;

  protected readonly titre = computed(() => {
    switch (this.cas()) {
      case 'refus':
        return "Cette page ne vous est pas ouverte";
      case 'admin':
        return 'Page inconnue du back-office';
      default:
        return "Cette page n'existe pas";
    }
  });

  protected readonly explication = computed(() => {
    switch (this.cas()) {
      case 'refus':
        return (
          "Votre compte est bien connecté, mais il n'a pas les droits " +
          "d'administration. Si vous pensez que c'est une erreur, demandez à un " +
          'administrateur de la boutique de vous accorder le rôle.'
        );
      case 'admin':
        return (
          "L'adresse demandée ne correspond à aucun écran du back-office. " +
          'Un lien enregistré dans vos favoris a peut-être changé.'
        );
      default:
        return this.connecte()
          ? "L'adresse demandée ne correspond à aucune page. Elle a peut-être été " +
              "retirée, ou l'adresse comporte une faute de frappe."
          : "L'adresse demandée ne correspond à aucune page. Si vous cherchiez " +
              "votre panier ou vos commandes, il faut d'abord vous connecter.";
    }
  });
}
