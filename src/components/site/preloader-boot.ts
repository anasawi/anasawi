/**
 * Constantes du préchargeur — module NEUTRE, sans `use client`.
 *
 * Le layout du site (composant serveur) injecte le script d'amorçage ;
 * le rideau et le Header (composants clients) lisent l'événement et
 * l'attribut. Un export d'un module `use client` importé côté serveur
 * n'est pas sa valeur mais une référence client : ces constantes vivent
 * donc ici, importables des deux côtés.
 */

/** Événement écouté par le Header pour déclencher son entrée. */
export const PRELOADER_DONE_EVENT = 'anasawi:ready'

/** Clé de session : le rideau ne joue qu'une fois par visite. */
export const PRELOADER_SESSION_KEY = 'anasawi:rideau'

/**
 * Attribut posé sur `<html>` par le script d'amorçage quand le rideau
 * DOIT jouer. Sans lui, le rideau rendu par le serveur est masqué par la
 * feuille de style (`html:not([data-rideau]) [data-anasawi-preloader]`,
 * globals.css) : la page est lisible dès le premier octet, avant même que
 * React soit chargé.
 */
export const PRELOADER_HTML_ATTRIBUTE = 'data-rideau'

/**
 * Script d'amorçage — quelques octets, inline, exécutés AVANT que le
 * rideau rendu par le serveur soit peint.
 *
 * Avant lui, le rideau rendu par le serveur recouvrait la page tant que
 * le JavaScript n'était pas hydraté : sur une connexion lente, un
 * visiteur regardait un rideau figé plusieurs secondes — et quelqu'un
 * sans JavaScript ne voyait jamais le site. Désormais c'est l'inverse :
 * la page est visible par défaut, et ce script demande le rideau
 * seulement s'il doit jouer. Il décide avec les mêmes règles que le
 * composant décidait avant : une fois par visite, jamais sous
 * prefers-reduced-motion, jamais en venant de l'administration (Anne fait
 * l'aller-retour éditeur ↔ aperçu des dizaines de fois par séance).
 *
 * Texte constant : aucune donnée n'y est interpolée. Le garde-fou de
 * quatre secondes retire l'attribut si l'hydratation n'arrive jamais
 * (script bloqué, erreur) : la page ne reste pas cachée derrière un
 * rideau que personne ne lèvera.
 */
export const PRELOADER_BOOT_SCRIPT =
  '(function(){try{var d=document,h=d.documentElement,a=/^\\/(admin|login)(\\/|$|\\?)/,s=null;' +
  `try{s=sessionStorage.getItem('${PRELOADER_SESSION_KEY}')}catch(e){}` +
  /* La visite est marquée ICI, avant toute hydratation : un test ou un
     rechargement immédiat ne doit pas dépendre du moment où React s'attache. */
  `try{sessionStorage.setItem('${PRELOADER_SESSION_KEY}','1')}catch(e){}` +
  "if(s==='1')return;" +
  "if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
  'if(a.test(location.pathname))return;' +
  'if(d.referrer){var u=new URL(d.referrer);if(u.origin===location.origin&&a.test(u.pathname))return}' +
  `h.setAttribute('${PRELOADER_HTML_ATTRIBUTE}','1');` +
  `setTimeout(function(){h.removeAttribute('${PRELOADER_HTML_ATTRIBUTE}')},4000)` +
  '}catch(e){}})()'
