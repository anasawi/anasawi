import { LOGO_PAR_DEFAUT } from './logo-par-defaut'
import { absoluteUrl } from '@/lib/utils'
import { getMediaByIds, getSettings } from '@/server/queries'

/**
 * L'adresse du logo à peindre, pour les trois routes d'image.
 *
 * Onglet du navigateur, icône d'écran d'accueil et vignette de partage
 * doivent montrer LE MÊME logo que l'en-tête du site. Sans cela, changer
 * le logo depuis les Réglages n'en changerait qu'une partie — Anne
 * verrait l'en-tête bouger et son onglet garder l'ancien, sans aucun
 * moyen de comprendre pourquoi. Un réglage qui fait presque ce qu'il
 * annonce est pire que pas de réglage du tout.
 *
 * Satori va CHERCHER cette adresse au moment du rendu. Si elle est
 * injoignable — site pas encore en ligne pendant un build, média
 * supprimé, stockage indisponible — on retombe sur l'image encodée dans
 * le code plutôt que de rendre une icône vide.
 */
export async function adresseDuLogo(): Promise<string> {
  try {
    const settings = await getSettings()
    if (!settings.logoMediaId) return LOGO_PAR_DEFAUT

    const [media] = await getMediaByIds([settings.logoMediaId])
    if (!media) return LOGO_PAR_DEFAUT

    /* Adresse absolue : Satori ne résout pas les chemins relatifs. */
    return media.url.startsWith('http') ? media.url : absoluteUrl(media.url)
  } catch {
    return LOGO_PAR_DEFAUT
  }
}
