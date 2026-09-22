// Catálogos públicos do valorant-api.com (nomes, artes, patentes).
// Não precisam de autenticação e mudam pouco, então ficam
// em cache na memória enquanto o app estiver aberto.

const BASE = 'https://valorant-api.com/v1';

const cache = new Map();

async function catalog(path, build) {
  if (cache.has(path)) {
    return cache.get(path);
  }

  const promise = fetch(`${BASE}/${path}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Catálogo ${path} indisponível.`);
      }

      return response.json();
    })
    .then(({ data }) => build(data))
    .catch((error) => {
      // Sem catálogo o app ainda funciona, só com menos nome bonito.
      console.warn(error.message);

      cache.delete(path);

      return new Map();
    });

  cache.set(path, promise);

  return promise;
}

function byUuid(data, pick = (item) => item) {
  const index = new Map();

  for (const item of data) {
    if (item.uuid) {
      index.set(item.uuid.toLowerCase(), pick(item));
    }
  }

  return index;
}

export function skinLevels() {
  return catalog('weapons/skinlevels', (data) =>
    byUuid(data, (skin) => ({
      name: skin.displayName,
      image: skin.displayIcon,
    }))
  );
}

/** Mapas são resolvidos pelo mapUrl, não pelo uuid. */
export function maps() {
  return catalog('maps', (data) => {
    const index = new Map();

    for (const map of data) {
      if (map.mapUrl) {
        index.set(map.mapUrl.toLowerCase(), {
          name: map.displayName,
          image: map.listViewIcon,
        });
      }
    }

    return index;
  });
}

/** Patentes do ato mais recente, indexadas pelo tier numérico. */
export function competitiveTiers() {
  return catalog('competitivetiers', (data) => {
    const latest = data[data.length - 1];

    const index = new Map();

    for (const tier of latest?.tiers || []) {
      index.set(tier.tier, {
        name: tier.divisionName
          ? tier.tierName
          : tier.tierName,
        icon: tier.smallIcon,
        color: tier.backgroundColor ? `#${tier.backgroundColor.slice(0, 6)}` : null,
      });
    }

    return index;
  });
}
