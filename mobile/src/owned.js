// Skins que a conta já possui (entitlements).

import { callGame } from './riot';

// ItemTypeID de skin (level). O level 1 é o mesmo UUID das ofertas.
const SKIN_ITEM = 'e7c63390-eda7-46e0-bb7a-a6abdacd2433';

const cache = new WeakMap();

/**
 * Set com os UUIDs (minúsculos) dos levels de skin que a conta tem.
 * Em cache por sessão; se falhar, devolve vazio — a loja continua
 * funcionando, só sem a marcação de "já tenho".
 */
export function ownedSkins(session) {
  if (cache.has(session)) {
    return cache.get(session);
  }

  const promise = callGame(session, `/store/v1/entitlements/${session.puuid}/${SKIN_ITEM}`, {
    what: 'what.owned',
  })
    .then(({ Entitlements = [] }) =>
      new Set(Entitlements.map((entry) => (entry.ItemID || '').toLowerCase()))
    )
    .catch((problem) => {
      console.warn(problem?.message);

      cache.delete(session);

      return new Set();
    });

  cache.set(session, promise);

  return promise;
}

/** Esquece o cache (depois de puxar pra atualizar, por exemplo). */
export function forgetOwned(session) {
  cache.delete(session);
}
