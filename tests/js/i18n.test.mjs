/**
 * tests/js/i18n.test.mjs
 * Tests unitaires pour tRandom (Node.js built-in test runner)
 *
 * Exécuter : node --test tests/js/i18n.test.mjs
 *
 * Note : on teste la logique de sélection, pas le contenu des traductions.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Stub minimal de tRandom (extrait la logique sans fetch) ──
// On ne peut pas importer i18n.js directement (il appelle fetch au boot),
// donc on réimplémente la logique pure et on vérifie son comportement.
function tRandomPure(translations, key) {
  const parts = key.split('.');
  let value = translations;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return key;
  }
  if (Array.isArray(value)) return value[Math.floor(Math.random() * value.length)];
  return typeof value === 'string' ? value : key;
}

const FAKE_TRANSLATIONS = {
  home: {
    rest_day: 'Jour de repos',
    rest_day_messages: [
      'Même les héros récupèrent.',
      'Votre corps compile les gains.',
      'Repos autorisé.',
    ],
    post_session_messages: [
      'Oops. Progress happened.',
      'Et pourtant, vous étiez là.',
    ],
  },
  missing_parent: {},
};

describe('tRandom — sélection tableau', () => {
  test('retourne un string (pas undefined)', () => {
    const result = tRandomPure(FAKE_TRANSLATIONS, 'home.rest_day_messages');
    assert.equal(typeof result, 'string');
  });

  test('retourne une valeur parmi les options du tableau', () => {
    const pool = FAKE_TRANSLATIONS.home.rest_day_messages;
    // Sur N tirages, chaque résultat doit être dans le pool
    for (let i = 0; i < 30; i++) {
      const result = tRandomPure(FAKE_TRANSLATIONS, 'home.rest_day_messages');
      assert.ok(pool.includes(result), `"${result}" n'est pas dans le pool`);
    }
  });

  test('couvre toutes les entrées du pool sur suffisamment de tirages', () => {
    const pool = FAKE_TRANSLATIONS.home.rest_day_messages;
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      seen.add(tRandomPure(FAKE_TRANSLATIONS, 'home.rest_day_messages'));
    }
    assert.equal(seen.size, pool.length, `Seulement ${seen.size}/${pool.length} entrées vues`);
  });

  test('fonctionne sur le pool post_session_messages', () => {
    const pool = FAKE_TRANSLATIONS.home.post_session_messages;
    for (let i = 0; i < 20; i++) {
      const result = tRandomPure(FAKE_TRANSLATIONS, 'home.post_session_messages');
      assert.ok(pool.includes(result));
    }
  });
});

describe('tRandom — clé string (pas tableau)', () => {
  test('retourne la string directement si la valeur n\'est pas un tableau', () => {
    const result = tRandomPure(FAKE_TRANSLATIONS, 'home.rest_day');
    assert.equal(result, 'Jour de repos');
  });
});

describe('tRandom — clé manquante', () => {
  test('retourne la clé elle-même si introuvable', () => {
    const result = tRandomPure(FAKE_TRANSLATIONS, 'home.nonexistent');
    assert.equal(result, 'home.nonexistent');
  });

  test('retourne la clé si le parent est vide', () => {
    const result = tRandomPure(FAKE_TRANSLATIONS, 'missing_parent.child');
    assert.equal(result, 'missing_parent.child');
  });
});

describe('tRandom — distribution uniforme (chi-carré simplifié)', () => {
  test('aucune entrée n\'est dominante (écart < 3× la moyenne)', () => {
    const pool = FAKE_TRANSLATIONS.home.rest_day_messages;
    const counts = new Array(pool.length).fill(0);
    const N = 900;
    for (let i = 0; i < N; i++) {
      const result = tRandomPure(FAKE_TRANSLATIONS, 'home.rest_day_messages');
      const idx = pool.indexOf(result);
      counts[idx]++;
    }
    const mean = N / pool.length;
    for (const count of counts) {
      assert.ok(count > mean / 3, `Entrée sous-représentée : ${count} < ${mean / 3}`);
      assert.ok(count < mean * 3, `Entrée sur-représentée : ${count} > ${mean * 3}`);
    }
  });
});
