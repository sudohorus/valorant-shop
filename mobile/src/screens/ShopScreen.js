import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { skinLevels } from '../content';
import { callGame } from '../riot';
import { theme } from '../theme';
import { Loading, Message, Screen } from '../ui/kit';
import { SkinCard } from '../ui/SkinCard';
import { useRemote } from '../useRemote';
import { useSession } from '../auth';

async function loadShop(session) {
  // A Riot trocou o storefront de GET v2 para POST v3.
  // Tentamos v3 primeiro e caímos no v2 se der 404.
  let store;

  try {
    store = await callGame(session, `/store/v3/storefront/${session.puuid}`, {
      method: 'POST',
      body: {},
      what: 'A loja',
    });
  } catch (problem) {
    if (problem.status !== 404) {
      throw problem;
    }

    store = await callGame(session, `/store/v2/storefront/${session.puuid}`, {
      what: 'A loja',
    });
  }

  const panel = store.SkinsPanelLayout;

  if (!panel) {
    throw new Error('A resposta da loja não trouxe SkinsPanelLayout.');
  }

  const skins = await skinLevels();

  const offers = (panel.SingleItemStoreOffers || []).map((offer) => {
    const skin =
      skins.get((offer.OfferID || '').toLowerCase()) ||
      (offer.Rewards || [])
        .map((reward) => skins.get((reward.ItemID || '').toLowerCase()))
        .find(Boolean);

    const costs = Object.values(offer.Cost || {});

    return {
      id: offer.OfferID,
      name: skin?.name || 'Skin desconhecida',
      image: skin?.image || null,
      price: costs.length ? costs[0] : null,
    };
  });

  return {
    offers,
    resetsInSeconds: panel.SingleItemOffersRemainingDurationInSeconds ?? null,
  };
}

function countdown(seconds) {
  if (seconds === null || seconds === undefined) {
    return 'sem previsão';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `renova em ${hours}h ${String(minutes).padStart(2, '0')}min`;
}

export function ShopScreen() {
  const session = useSession();

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadShop(session), [session])
  );

  if (loading) {
    return <Loading label="Carregando sua loja..." />;
  }

  if (error) {
    return <Message title="Não deu certo" body={error.message} />;
  }

  return (
    <Screen title="Loja diária" subtitle={countdown(data.resetsInSeconds)}>
      <FlatList
        data={data.offers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SkinCard skin={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.textDim}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: theme.gap,
    paddingBottom: 24,
  },
  separator: {
    height: theme.gap,
  },
});
