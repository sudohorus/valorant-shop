// Preços exatos em VP, aprendidos a partir da loja.
//
// A Riot removeu a tabela de preços (/store/v1/offers/) em 2024.
// Hoje o preço só vem junto dos itens que estão no storefront do
// jogador (loja diária, bundles em destaque, mercado noturno).
// Então cada vez que a loja carrega, guardamos o que apareceu —
// a lista de preços conhecidos só cresce.

import { File, Paths } from 'expo-file-system';

import { VP } from './riot';

let memory = null;

function pricesFile() {
  return new File(Paths.document, 'prices.json');
}

/** Preços já vistos, indexados pelo UUID do level 1 da skin. */
export async function knownPrices() {
  if (memory) {
    return memory;
  }

  try {
    const file = pricesFile();

    memory = new Map(file.exists ? Object.entries(JSON.parse(await file.text())) : []);
  } catch (problem) {
    console.warn('Não consegui ler os preços salvos:', problem?.message);

    memory = new Map();
  }

  return memory;
}

/** Tira todos os preços de skin que vieram na resposta do storefront. */
function pricesFromStore(store) {
  const found = [];

  const add = (itemId, price) => {
    if (itemId && typeof price === 'number') {
      found.push([itemId.toLowerCase(), price]);
    }
  };

  for (const offer of store.SkinsPanelLayout?.SingleItemStoreOffers || []) {
    add(offer.OfferID, offer.Cost?.[VP]);
  }

  // Bundles trazem o preço avulso (BasePrice) de cada item.
  for (const bundle of store.FeaturedBundle?.Bundles || []) {
    for (const item of bundle.Items || []) {
      if (item.CurrencyID === VP) {
        add(item.Item?.ItemID, item.BasePrice);
      }
    }
  }

  // No mercado noturno, Cost é o preço cheio (sem o desconto).
  for (const bonus of store.BonusStore?.BonusStoreOffers || []) {
    add(bonus.Offer?.Rewards?.[0]?.ItemID, bonus.Offer?.Cost?.[VP]);
  }

  return found;
}

export async function learnPrices(store) {
  const prices = await knownPrices();

  let changed = false;

  for (const [id, price] of pricesFromStore(store)) {
    if (prices.get(id) !== price) {
      prices.set(id, price);
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  try {
    const file = pricesFile();

    if (!file.exists) {
      file.create();
    }

    file.write(JSON.stringify(Object.fromEntries(prices)));
  } catch (problem) {
    console.warn('Não consegui salvar os preços:', problem?.message);
  }
}
