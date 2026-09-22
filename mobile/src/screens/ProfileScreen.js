import { useCallback } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { competitiveTiers } from '../content';
import { callGame } from '../riot';
import { theme } from '../theme';
import { Button, Loading, Message, Row, Screen } from '../ui/kit';
import { useRemote } from '../useRemote';
import { useAuth, useSession } from '../auth';

async function loadProfile(session) {
  const [names, mmr, tierIndex] = await Promise.all([
    callGame(session, '/name-service/v2/players', {
      method: 'PUT',
      body: [session.puuid],
      what: 'O nome da conta',
    }),

    callGame(session, `/mmr/v1/players/${session.puuid}`, {
      what: 'Seu MMR',
    }),

    competitiveTiers(),
  ]);

  const me = names[0] || {};

  const latest = mmr.LatestCompetitiveUpdate || {};

  const tier = tierIndex.get(latest.TierAfterUpdate);

  return {
    name: me.GameName ? `${me.GameName}#${me.TagLine}` : 'Conta sem nome',
    tier: tier?.name || 'Sem patente',
    tierIcon: tier?.icon || null,
    rating: latest.RankedRatingAfterUpdate ?? null,
    shard: session.shard.toUpperCase(),
    puuid: session.puuid,
  };
}

export function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuth();

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadProfile(session), [session])
  );

  if (loading) {
    return <Loading label="Carregando seu perfil..." />;
  }

  if (error) {
    return (
      <Message
        title="Não deu certo"
        body={error.message}
        actionLabel="Sair"
        onAction={signOut}
      />
    );
  }

  return (
    <Screen title="Perfil">
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.textDim}
          />
        }
      >
        <View style={styles.hero}>
          {data.tierIcon ? (
            <Image source={{ uri: data.tierIcon }} style={styles.tierIcon} />
          ) : null}

          <Text style={styles.name}>{data.name}</Text>

          <Text style={styles.tier}>
            {data.tier}
            {data.rating === null ? '' : ` · ${data.rating} PDL`}
          </Text>
        </View>

        <View style={styles.card}>
          <Row label="Servidor" value={data.shard} />
          <Row label="PUUID" value={`${data.puuid.slice(0, 8)}...`} />
        </View>

        <View style={styles.actions}>
          <Button label="Sair da conta" tone="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: theme.gap,
    paddingBottom: 32,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  tierIcon: {
    width: 84,
    height: 84,
  },
  name: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
  },
  tier: {
    color: theme.textDim,
    fontSize: 14,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  actions: {
    alignItems: 'center',
  },
});
