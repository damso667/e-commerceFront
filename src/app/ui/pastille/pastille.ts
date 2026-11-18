import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

/**
 * Le visuel d'un article.
 *
 * Pourquoi ce composant existe : **il n'y a aucune photo produit**, et il
 * n'y en aura pas avant un moment. Le placeholder n'est donc pas un repli
 * honteux, c'est le visuel principal du catalogue — et il est traité comme
 * tel : monogramme poché sur un voile d'encre, dans le monde du panneau
 * peint. Un rectangle gris aurait suffi à ne rien casser ; il n'aurait pas
 * suffi à rendre la boutique présentable.
 *
 * Quand une image existe, elle se charge **par-dessus** la pastille :
 *  - l'espace est réservé par `aspect-ratio`, donc rien ne saute à l'arrivée
 *    de l'image ;
 *  - la pastille tient lieu de placeholder pendant le chargement, sans un
 *    octet supplémentaire ;
 *  - si l'image échoue, on revient à la pastille au lieu de l'icône de lien
 *    brisé du navigateur.
 */
@Component({
  selector: 'app-pastille',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pastille.html',
  styleUrl: './pastille.css',
  host: { style: 'display:block;container-type:inline-size' },
})
export class Pastille {
  /** Libellé de l'article : sert à dériver le monogramme. */
  readonly libelle = input<string>('');
  readonly src = input<string | null>(null);
  readonly ratio = input<string>('1');
  /** Vrai sur un aplat d'encre : inverse le contraste de la pastille. */
  readonly posee = input<boolean>(false);
  /** Vrai pour les premières vignettes visibles : chargement immédiat. */
  readonly prioritaire = input<boolean>(false);

  protected readonly chargee = signal(false);
  protected readonly echec = signal(false);

  constructor() {
    // Changer d'article dans une liste virtualisée réutilise le composant :
    // sans remise à zéro, l'ancienne image resterait considérée comme
    // chargée et la nouvelle apparaîtrait sans transition.
    effect(() => {
      this.src();
      this.chargee.set(false);
      this.echec.set(false);
    });
  }

  /**
   * Deux lettres quand le libellé a deux mots porteurs, sinon une seule.
   * Les mots courts (« de », « a », « sur ») sont écartés : sans ce filtre,
   * « Sac a dos toile » donnerait « SA » au lieu de « SD ».
   */
  protected readonly monogramme = computed(() => {
    const brut = (this.libelle() ?? '').trim();
    if (!brut) {
      return '?';
    }
    const mots = brut.split(/\s+/).filter((mot) => mot.length > 2);
    if (mots.length === 0) {
      return brut.slice(0, 1).toUpperCase();
    }
    if (mots.length === 1) {
      return mots[0].slice(0, 1).toUpperCase();
    }
    return (mots[0][0] + mots[1][0]).toUpperCase();
  });

  protected readonly alt = computed(() => this.libelle() || 'Article');
}
