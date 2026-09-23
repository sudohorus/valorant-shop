import { useCallback, useEffect } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { currencies, skinLevels } from '../content';
import { scheduleShopReset } from '../notifications';
import { forgetOwned, ownedSkins } from '../owned';
import { learnPrices } from '../prices';
import { callGame, VP } from '../riot';
import { theme } from '../theme';
import { Message, Screen } from '../ui/kit';
import { SkeletonScreen } from '../ui/Skeleton';
import { SkinCard } from '../ui/SkinCard';
import { formatDuration, NightMarketCard, SectionHeader, WalletBar } from '../ui/ShopSections';
import { useRemote } from '../useRemote';
import { useSession } from '../auth';
import { t as translate, useI18n } from '../i18n';
import { useWishlist } from '../wishlist';

function skinFor(skins, itemId) {
  return skins.get((itemId || '').toLowerCase()) || null;
}

function parseDaily(panel, skins) {
  return (panel.SingleItemStoreOffers || []).map((offer) => {
    const skin =
      skinFor(skins, offer.OfferID) ||
      (offer.Rewards || []).map((reward) => skinFor(skins, reward.ItemID)).find(Boolean);

    const costs = Object.values(offer.Cost || {});

    return {
      id: offer.OfferID,
      name: skin?.name || null,
      image: skin?.image || null,
      price: offer.Cost?.[VP] ?? (costs.length ? costs[0] : null),
    };
  });
}

/** Mercado noturno: só existe no storefront enquanto está ativo. */
function parseNightMarket(bonus, skins) {
  if (!bonus?.BonusStoreOffers?.length) {
    return null;
  }

  return {
    remaining: bonus.BonusStoreRemainingDurationInSeconds ?? null,
    items: bonus.BonusStoreOffers.map((entry) => {
      const itemId = entry.Offer?.Rewards?.[0]?.ItemID || entry.Offer?.OfferID;
      const skin = skinFor(skins, itemId);

      return {
        id: (itemId || entry.BonusOfferID).toLowerCase(),
        name: skin?.name || null,
        image: skin?.image || null,
        price: entry.Offer?.Cost?.[VP] ?? null,
        discounted: entry.DiscountCosts?.[VP] ?? null,
        percent: entry.DiscountPercent ?? null,
      };
    }),
  };
}

// Moedas mostradas na carteira, na ordem.
const WALLET = [
  VP,
  'e59aa87c-4cbf-517a-5983-6e81511be9b7', // Radianita
  '85ca954a-41f2-ce94-9b45-8ca3dd39a00d', // Kingdom Credits
];

/** Saldo da conta. Opcional: sem ele a loja funciona igual. */
async function loadWallet(session) {
  try {
    const [wallet, currencyIndex] = await Promise.all([
      callGame(session, `/store/v1/wallet/${session.puuid}`, { what: 'what.wallet' }),
      currencies(),
    ]);

    return WALLET.filter((id) => wallet.Balances?.[id] != null).map((id) => ({
      id,
      amount: wallet.Balances[id],
      name: currencyIndex.get(id)?.name || null,
      icon: currencyIndex.get(id)?.icon || null,
    }));
  } catch (problem) {
    console.warn(problem?.message);

    return [];
  }
}

async function loadShop(session) {
  // A Riot trocou o storefront de GET v2 para POST v3.
  // Tentamos v3 primeiro e caímos no v2 se der 404.
  let store;

  try {
    store = await callGame(session, `/store/v3/storefront/${session.puuid}`, {
      method: 'POST',
      body: {},
      what: 'what.shop',
    });
  } catch (problem) {
    if (problem.status !== 404) {
      throw problem;
    }

    store = await callGame(session, `/store/v2/storefront/${session.puuid}`, {
      what: 'what.shop',
    });
  }

  const panel = store.SkinsPanelLayout;

  if (!panel) {
    throw new Error(translate('shop.noPanel'));
  }

  // Guarda os preços exatos que vieram (loja, mercado noturno e os
  // preços avulsos dos bundles, que a resposta traz mesmo sem exibirmos)
  // para a lista de desejos. Falhar aqui não pode derrubar a loja.
  learnPrices(store).catch((problem) => console.warn(problem?.message));

  // Sempre busca de novo aqui: se você comprou algo, puxar pra
  // atualizar já marca como "já tenho".
  forgetOwned(session);

  const [skins, owned, wallet] = await Promise.all([
    skinLevels(),
    ownedSkins(session),
    loadWallet(session),
  ]);

  const markOwned = (item) => ({ ...item, owned: owned.has((item.id || '').toLowerCase()) });

  const nightMarket = parseNightMarket(store.BonusStore, skins);

  return {
    wallet,
    offers: parseDaily(panel, skins).map(markOwned),
    resetsInSeconds: panel.SingleItemOffersRemainingDurationInSeconds ?? null,
    nightMarket: nightMarket && { ...nightMarket, items: nightMarket.items.map(markOwned) },
  };
}

function countdown(seconds, t) {
  if (seconds === null || seconds === undefined) {
    return t('shop.noForecast');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return t('shop.resets', { h: hours, m: String(minutes).padStart(2, '0') });
}

const alerted = new Set();

/** Divide em linhas de 2 para a grade do mercado noturno. */
function pairs(items) {
  const rows = [];

  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return rows;
}

export function ShopScreen() {
  const session = useSession();
  const { t, lang } = useI18n();
  const { has, loaded } = useWishlist();

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadShop(session), [session, lang])
  );

  // Reagenda o aviso de "loja renovou" com o horário certo do reset.
  useEffect(() => {
    if (data) {
      scheduleShopReset(data.resetsInSeconds).catch((problem) =>
        console.warn('Não consegui agendar a notificação:', problem?.message)
      );
    }
  }, [data]);

  useEffect(() => {
    if (data && loaded) {
      // Loja diária e mercado noturno contam para o aviso da lista.
      const candidates = [...data.offers, ...(data.nightMarket?.items || [])];
      const foundSkins = candidates.filter((offer) => has(offer.id) && !offer.owned);

      // Mesma combinação de skins só avisa uma vez (trocar de aba ou
      // de idioma recarrega a loja).
      const key = foundSkins.map((skin) => skin.id).join(',');

      if (foundSkins.length > 0 && !alerted.has(key)) {
        alerted.add(key);

        const names = foundSkins.map((s) => s.name || t('shop.unknownSkin')).join(', ');
        Alert.alert(t('shop.alertTitle'), t('shop.alertBody', { names }));
      }
    }
  }, [data, loaded, has, t]);

  if (loading) {
    return <SkeletonScreen variant="cards" />;
  }

  if (error) {
    return <Message title={t('common.errorTitle')} body={error.message} actionLabel={t('common.retry')} onAction={refresh} />;
  }

  const night = data.nightMarket;

  return (
    <Screen title={t('shop.title')} subtitle={countdown(data.resetsInSeconds, t)}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textDim} />
        }
      >
        {data.wallet.length ? <WalletBar balances={data.wallet} /> : null}

        {night ? (
          <View style={styles.section}>
            <SectionHeader
              icon="moon"
              title={t('shop.nightMarket')}
              subtitle={night.remaining != null ? t('shop.endsIn', { time: formatDuration(night.remaining) }) : null}
              color="#A78BFA"
            />

            <View style={styles.grid}>
              {pairs(night.items).map((row) => (
                <View key={row[0].id} style={styles.gridRow}>
                  {row.map((item) => (
                    <NightMarketCard key={item.id} item={item} wishlisted={has(item.id)} />
                  ))}
                  {row.length === 1 ? <View style={styles.gridFiller} /> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader icon="today-outline" title={t('shop.daily')} />

          <View style={styles.stack}>
            {data.offers.map((item) => (
              <SkinCard key={item.id} skin={item} wishlisted={has(item.id)} />
            ))}
          </View>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: theme.gap,
    paddingBottom: 24,
  },
  section: {
    marginBottom: theme.gap * 1.75,
  },
  stack: {
    gap: theme.gap,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridFiller: {
    flex: 1,
  },
});
