// Catálogos públicos do valorant-api.com (nomes, artes, patentes).
// Não precisam de autenticação e mudam pouco, então ficam
// em cache na memória enquanto o app estiver aberto.
// Os nomes vêm no idioma escolhido no app (?language=).
//
// Além da memória, o resultado JÁ PROCESSADO vai para o disco por 24h:
// abrir o app não baixa de novo os ~3,5 MB do catálogo de armas, e sem
// rede usamos a última cópia (mesmo vencida).

import { Directory, File, Paths } from 'expo-file-system';

import { getLanguage } from './i18n';

const BASE = 'https://valorant-api.com/v1';
const DISK_TTL = 24 * 60 * 60 * 1000;

const cache = new Map();

function diskFile(url) {
  const dir = new Directory(Paths.cache, 'catalogs');

  if (!dir.exists) {
    dir.create();
  }

  return new File(dir, `${url.replace(/[^a-z0-9]+/gi, '_')}.json`);
}

// Map não vira JSON sozinho: guardamos as entradas.
function serialize(value) {
  return JSON.stringify(
    value instanceof Map ? { savedAt: Date.now(), map: [...value.entries()] } : { savedAt: Date.now(), value }
  );
}

function deserialize(raw) {
  const parsed = JSON.parse(raw);

  return { savedAt: parsed.savedAt, value: parsed.map ? new Map(parsed.map) : parsed.value };
}

async function readDisk(url) {
  try {
    const file = diskFile(url);

    return file.exists ? deserialize(await file.text()) : null;
  } catch {
    return null;
  }
}

function writeDisk(url, value) {
  // Fora do caminho da tela: gravar alguns MB é síncrono.
  setTimeout(() => {
    try {
      const file = diskFile(url);

      if (!file.exists) {
        file.create();
      }

      file.write(serialize(value));
    } catch (problem) {
      console.warn('Não consegui salvar o catálogo:', problem?.message);
    }
  }, 0);
}

async function download(url, path, build) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Catálogo ${path} indisponível.`);
  }

  const { data } = await response.json();

  return build(data);
}

async function catalog(path, build) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE}/${path}${separator}language=${getLanguage()}`;

  if (cache.has(url)) {
    return cache.get(url);
  }

  const promise = (async () => {
    const saved = await readDisk(url);

    if (saved && Date.now() - saved.savedAt < DISK_TTL) {
      return saved.value;
    }

    try {
      const value = await download(url, path, build);

      writeDisk(url, value);

      return value;
    } catch (error) {
      // Sem rede: cópia vencida é melhor que nada.
      if (saved) {
        return saved.value;
      }

      // Sem catálogo o app ainda funciona, só com menos nome bonito.
      console.warn(error.message);

      cache.delete(url);

      return new Map();
    }
  })();

  cache.set(url, promise);

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
          splash: map.splash,
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
        name: tier.tierName,
        icon: tier.smallIcon,
        color: tier.backgroundColor ? `#${tier.backgroundColor.slice(0, 6)}` : null,
      });
    }

    return index;
  });
}

export function playerCards() {
  return catalog('playercards', (data) =>
    byUuid(data, (card) => ({
      small: card.smallArt || card.displayIcon,
      wide: card.wideArt,
      large: card.largeArt,
    }))
  );
}

export function currencies() {
  return catalog('currencies', (data) =>
    byUuid(data, (currency) => ({
      name: currency.displayName,
      icon: currency.displayIcon,
    }))
  );
}

/** Temporadas (episódios e atos), para achar o que está ativo agora. */
export function seasons() {
  return catalog('seasons', (data) =>
    data.map((season) => ({
      id: season.uuid.toLowerCase(),
      start: season.startTime,
      end: season.endTime,
    }))
  );
}

/**
 * Passes de batalha (contratos ligados a uma temporada), com os
 * níveis já em sequência. `xp` de cada nível = XP para chegar nele
 * a partir do anterior.
 */
export function battlePasses() {
  return catalog('contracts', (data) =>
    data
      .filter((contract) => contract.content?.relationType === 'Season')
      .map((contract) => ({
        id: contract.uuid.toLowerCase(),
        name: contract.displayName,
        seasonId: (contract.content.relationUuid || '').toLowerCase(),
        levels: (contract.content.chapters || []).flatMap((chapter) =>
          (chapter.levels || []).map((level) => ({
            xp: level.xp || 0,
            epilogue: Boolean(chapter.isEpilogue),
            reward: level.reward,
          }))
        ),
      }))
  );
}

export function buddyLevels() {
  return catalog('buddies/levels', (data) =>
    byUuid(data, (buddy) => ({ name: buddy.displayName, icon: buddy.displayIcon }))
  );
}

export function sprays() {
  return catalog('sprays', (data) =>
    byUuid(data, (spray) => ({
      name: spray.displayName,
      icon: spray.fullTransparentIcon || spray.displayIcon,
    }))
  );
}

export function playerTitles() {
  return catalog('playertitles', (data) =>
    byUuid(data, (title) => title.titleText || null)
  );
}

export function agents() {
  return catalog('agents?isPlayableCharacter=true', (data) =>
    byUuid(data, (agent) => ({
      name: agent.displayName,
      icon: agent.displayIcon,
      portrait: agent.fullPortrait,
      background: agent.background,
      // Vem como RRGGBBAA sem '#'; o RN aceita #RRGGBBAA.
      colors: (agent.backgroundGradientColors || []).map((hex) => `#${hex}`),
    }))
  );
}

// Preço de loja por raridade (contentTierUuid). Para armas é fixo;
// facas variam bastante, então o valor de faca é só estimativa.
// O preço exato aprendido da loja (prices.js) tem prioridade.
const TIER_PRICES = {
  '12683d76-48d7-84a3-4e09-6985794f0445': { gun: 875, melee: 1750 }, // Select
  '0cebb8be-46d7-c12a-d306-e9907bfc5a25': { gun: 1275, melee: 2550 }, // Deluxe
  '60bca009-4182-7998-dee7-b8a2558dc369': { gun: 1775, melee: 3550 }, // Premium
  'e046854e-406c-37f4-6607-19a9ba8426fc': { gun: 2175, melee: 4350 }, // Exclusive
  '411e4a55-4e59-7757-41f0-86a53f101bb5': { gun: 2475, melee: 4950 }, // Ultra
};

function isMelee(skin) {
  return (skin.assetPath || '').includes('/Melee/');
}

function tierPrice(skin) {
  const prices = TIER_PRICES[(skin.contentTierUuid || '').toLowerCase()];

  if (!prices) {
    // Sem raridade = skin de passe, padrão, evento: não vende na loja.
    return null;
  }

  return isMelee(skin) ? prices.melee : prices.gun;
}

/** "Prime Vandal Level 4

(Variant 1 Orange)" → "Variant 1 Orange". */
function chromaName(displayName) {
  const match = /\(([^)]+)\)\s*$/.exec(displayName || '');

  return match ? match[1] : null;
}

/** Raridades (Select, Deluxe, Premium, Exclusive, Ultra). */
export function contentTiers() {
  return catalog('contenttiers', (data) =>
    byUuid(data, (tier) => ({
      name: tier.displayName,
      icon: tier.displayIcon,
      // highlightColor vem com alfa baixo (RRGGBB33); usamos a cor cheia.
      color: tier.highlightColor ? `#${tier.highlightColor.slice(0, 6)}` : null,
    }))
  );
}

// Ordem das categorias na coleção (como no arsenal do jogo).
const CATEGORY_ORDER = ['Sidearm', 'SMG', 'Shotgun', 'Rifle', 'Sniper', 'Heavy', 'Melee'];

/**
 * Skins base (sem evoluções), indexadas pelo UUID do level 1.
 *
 * O level 1 é o que a loja usa no OfferID, então bate
 * direto com as ofertas da shop.
 * Pula skins sem imagem (melee padrão, etc).
 *
 * Vem do endpoint de armas (não do weapons/skins) para cada skin
 * saber de que arma é — mesmo tamanho de download.
 */
export function skins() {
  return catalog('weapons', (weapons) => {
    const index = new Map();

    for (const weapon of weapons) {
      const category = (weapon.category || '').split('::').pop();
      const order = CATEGORY_ORDER.indexOf(category);

      const weaponInfo = {
        id: weapon.uuid,
        name: weapon.displayName,
        category,
        order: order === -1 ? CATEGORY_ORDER.length : order,
      };

      for (const skin of weapon.skins || []) {
        addSkin(index, skin, weaponInfo);
      }
    }

    return index;
  });
}

function addSkin(index, skin, weapon) {
  // O UUID do primeiro nível é o que a loja usa no OfferID.
  const level1 = skin.levels?.[0];

  // Várias skins só têm arte no level, não na skin em si.
  const image = skin.displayIcon || level1?.displayIcon;

  if (!image || !level1?.uuid) {
    return;
  }

  index.set(level1.uuid.toLowerCase(), {
    name: skin.displayName,
    weapon,
    image,
    tierPrice: tierPrice(skin),
    melee: weapon.category === 'Melee' || isMelee(skin),
    tierId: (skin.contentTierUuid || '').toLowerCase() || null,
    // Para o preview: cada nível tem um vídeo do que ele adiciona.
    levels: (skin.levels || []).map((level) => ({
      id: level.uuid,
      // "EEquippableSkinLevelItem::VFX" → "VFX" (a tela traduz).
      item: level.levelItem ? level.levelItem.split('::').pop() : null,
      video: level.streamedVideo || null,
    })),
    chromas: (skin.chromas || []).map((chroma) => ({
      id: chroma.uuid,
      name: chromaName(chroma.displayName),
      swatch: chroma.swatch || null,
      render: chroma.fullRender || chroma.displayIcon || null,
      video: chroma.streamedVideo || null,
    })),
  });
}
