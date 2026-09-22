import { useCallback } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { competitiveTiers, maps } from '../content';
import { callGame } from '../riot';
import { theme } from '../theme';
import { Loading, Message, Screen } from '../ui/kit';
import { useRemote } from '../useRemote';
import { useSession } from '../auth';

/**
 * Histórico competitivo.
 *
 * Usamos competitiveupdates porque ele já traz mapa, patente e
 * variação de PDL em UMA chamada — o match-history puro exigiria
 * buscar os detalhes de cada partida.
 */
async function loadMatches(session) {
  const data = await callGame(
    session,
    `/mmr/v1/players/${session.puuid}/competitiveupdates` +
      '?queue=competitive&startIndex=0&endIndex=20',
    { what: 'O histórico de partidas' }
  );

  const [mapIndex, tierIndex] = await Promise.all([maps(), competitiveTiers()]);

  return (data.Matches || []).map((match) => {
    const map = mapIndex.get((match.MapID || '').toLowerCase());

    const tier = tierIndex.get(match.TierAfterUpdate);

    return {
      id: match.MatchID,
      map: map?.name || 'Mapa desconhecido',
      mapImage: map?.image || null,
      tier: tier?.name || null,
      tierIcon: tier?.icon || null,
      rating: match.RankedRatingAfterUpdate,
      delta: match.RankedRatingEarned ?? 0,
      playedAt: match.MatchStartTime ? new Date(match.MatchStartTime) : null,
    };
  });
}

function formatDate(date) {
  if (!date) {
    return '';
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function MatchRow({ match }) {
  const won = match.delta > 0;

  return (
    <View style={styles.row}>
      {match.mapImage ? (
        <Image source={{ uri: match.mapImage }} style={styles.map} />
      ) : (
        <View style={[styles.map, styles.mapEmpty]} />
      )}

      <View style={styles.info}>
        <Text style={styles.mapName} numberOfLines={1}>
          {match.map}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {[match.tier, formatDate(match.playedAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={styles.score}>
        <Text style={[styles.delta, won ? styles.up : styles.down]}>
          {match.delta > 0 ? `+${match.delta}` : match.delta}
        </Text>

        <Text style={styles.meta}>{match.rating} PDL</Text>
      </View>
    </View>
  );
}

export function MatchesScreen() {
  const session = useSession();

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadMatches(session), [session])
  );

  if (loading) {
    return <Loading label="Buscando suas partidas..." />;
  }

  if (error) {
    return <Message title="Não deu certo" body={error.message} />;
  }

  if (!data.length) {
    return (
      <Message
        title="Nada por aqui"
        body="Nenhuma partida competitiva no histórico recente."
      />
    );
  }

  return (
    <Screen title="Partidas" subtitle={`${data.length} partidas competitivas`}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MatchRow match={item} />}
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
    height: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  map: {
    width: 62,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.surfaceAlt,
  },
  mapEmpty: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  mapName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: theme.textDim,
    fontSize: 12,
  },
  score: {
    alignItems: 'flex-end',
    gap: 4,
  },
  delta: {
    fontSize: 15,
    fontWeight: '700',
  },
  up: {
    color: '#4ADE80',
  },
  down: {
    color: theme.accent,
  },
});
