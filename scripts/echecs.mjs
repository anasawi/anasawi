#!/usr/bin/env node
/*
 * Lit `test-results/resultats.json` et n'en garde que ce qui a échoué.
 *
 * Le rapport JSON de Playwright est un arbre volumineux où les échecs se
 * noient parmi les succès. Ce script en extrait la seule chose qui appelle
 * une décision : quel test, à quelle ligne, avec quel message.
 *
 *   node scripts/echecs.mjs            → les échecs de la dernière série
 *   node scripts/echecs.mjs --tout     → tous les tests, statut par statut
 */
import { readFileSync } from 'node:fs'

const FICHIER = 'test-results/resultats.json'
const tout = process.argv.includes('--tout')

let rapport
try {
  rapport = JSON.parse(readFileSync(FICHIER, 'utf8'))
} catch {
  console.error(
    `Aucun rapport lisible dans ${FICHIER} — lancez d'abord « npm test ».`,
  )
  process.exit(1)
}

/** Aplatit l'arbre suites → suites → specs en une liste de cas. */
function parcourir(suites, chemin = []) {
  const cas = []
  for (const suite of suites ?? []) {
    const ici = suite.title ? [...chemin, suite.title] : chemin
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const dernier = test.results?.[test.results.length - 1]
        cas.push({
          titre: [...ici, spec.title].join(' › '),
          fichier: spec.file,
          ligne: spec.line,
          projet: test.projectName,
          statut: test.status, // expected | unexpected | flaky | skipped
          erreur: dernier?.error?.message ?? null,
          pile: dernier?.error?.stack ?? null,
        })
      }
    }
    cas.push(...parcourir(suite.suites, ici))
  }
  return cas
}

const cas = parcourir(rapport.suites)
const echoues = cas.filter((c) => c.statut === 'unexpected')
const instables = cas.filter((c) => c.statut === 'flaky')

if (tout) {
  for (const c of cas) {
    const marque =
      c.statut === 'expected' ? '✓' : c.statut === 'skipped' ? '–' : '✗'
    console.log(`${marque} [${c.projet}] ${c.titre}`)
  }
  console.log()
}

console.log(
  `${cas.length} cas · ${cas.filter((c) => c.statut === 'expected').length} réussis · ` +
    `${echoues.length} échoués · ${instables.length} instables · ` +
    `${cas.filter((c) => c.statut === 'skipped').length} ignorés`,
)

for (const c of [...echoues, ...instables]) {
  console.log('\n' + '─'.repeat(72))
  console.log(`✗ [${c.projet}] ${c.titre}`)
  console.log(`  ${c.fichier}:${c.ligne}`)
  if (c.erreur) {
    console.log(
      '\n' +
        c.erreur
          .split('\n')
          .slice(0, 24)
          .map((l) => '  ' + l)
          .join('\n'),
    )
  }
}

process.exit(echoues.length > 0 ? 1 : 0)
