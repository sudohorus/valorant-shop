import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Image } from '../ui/Img';
import { competitiveTiers, maps } from '../content';
import { rawMatch } from '../match';
import { callGame } from '../riot';
import { theme } from '../theme';
import { Message, Screen } from '../ui/kit';
import { SkeletonScreen } from '../ui/Skeleton';
import { useRemote } from '../useRemote';
import { useSession } from '../auth';
import { useI18n } from '../i18n';
import { tap } from '../haptics';
import { Chips } from '../ui/Chips';
import { MatchDetailScreen } from './MatchDetailScreen';
import { StatsView } from './StatsView';

const QUEUES = ['competitive', 'unrated', 'swiftplay'];

// Poucas chamadas de detalhe por vez para não tomar rate limit.
const BATCH = 4;

/**
 * Sem classificação / Frenético: o match-history só traz os IDs,
 * então buscamos os detalhes de cada partida (em cache) para ter
 * mapa, placar e K/D/A.
 */
async function loadCasualMatches(session, queue) {
  const history = await callGame(
    session,
    `/match-history/v1/history/${session.puuid}?startIndex=0&endIndex=20&queue=${queue}`,
    { what: 'what.matches' }
  );

  const entries = history.History || [];
  const mapIndex = await maps();
  const rows = [];

  for (let i = 0; i < entries.length; i += BATCH) {
    const details = await Promise.all(
      entries.slice(i, i + BATCH).map((entry) => rawMatch(session, entry.MatchID).catch(() => null))
    );

    details.forEach((match, offset) => {
      const entry = entries[i + offset];
      const me = match?.players?.find((player) => player.subject === session.puuid);
      const mine = match?.teams?.find((team) => team.teamId === me?.teamId);
      const theirs = match?.teams?.find((team) => team.teamId !== me?.teamId);
      const map = mapIndex.get((match?.matchInfo?.mapId || '').toLowerCase());

      rows.push({
        id: entry.MatchID,
        map: map?.name || null,
        mapImage: map?.image || null,
        playedAt: entry.GameStartTime ? new Date(entry.GameStartTime) : null,
        won: mine ? Boolean(mine.won) : null,
        score: mine && theirs ? `${mine.roundsWon}–${theirs.roundsWon}` : null,
        kda: me?.stats ? `${me.stats.kills}/${me.stats.deaths}/${me.stats.assists}` : null,
      });
    });
  }

  return rows;
}

/**
 * Competitivo: competitiveupdates já traz mapa, patente e variação
 * de PDL em UMA chamada, sem precisar do detalhe de cada partida.
 */
async function loadMatches(session, queue) {
  if (queue !== 'competitive') {
    return loadCasualMatches(session, queue);
  }

  const data = await callGame(
    session,
    `/mmr/v1/players/${session.puuid}/competitiveupdates` +
      '?queue=competitive&startIndex=0&endIndex=20',
    { what: 'what.matches' }
  );

  const [mapIndex, tierIndex] = await Promise.all([maps(), competitiveTiers()]);

  return (data.Matches || []).map((match) => {
    const map = mapIndex.get((match.MapID || '').toLowerCase());

    const tier = tierIndex.get(match.TierAfterUpdate);

    return {
      id: match.MatchID,
      ranked: true,
      map: map?.name || null,
      mapImage: map?.image || null,
      tier: tier?.name || null,
      tierIcon: tier?.icon || null,
      rating: match.RankedRatingAfterUpdate,
      delta: match.RankedRatingEarned ?? 0,
      playedAt: match.MatchStartTime ? new Date(match.MatchStartTime) : null,
    };
  });
}

function formatDate(date, lang) {
  if (!date) {
    return '';
  }

  return date.toLocaleDateString(lang, {
    day: '2-digit',
    month: '2-digit',
  });
}

function MatchRow({ match, onPress }) {
  const { t, lang } = useI18n();
  const ranked = Boolean(match.ranked);
  const won = ranked ? match.delta > 0 : match.won;

  return (
    <Pressable
      onPress={() => onPress(match.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {match.mapImage ? (
        <Image source={{ uri: match.mapImage }} style={styles.map} />
      ) : (
        <View style={[styles.map, styles.mapEmpty]} />
      )}

      <View style={styles.info}>
        <Text style={styles.mapName} numberOfLines={1}>
          {match.map || t('matches.unknownMap')}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {[match.tier, formatDate(match.playedAt, lang)].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={styles.score}>
        {ranked ? (
          <>
            <Text style={[styles.delta, won ? styles.up : styles.down]}>
              {match.delta > 0 ? `+${match.delta}` : match.delta}
            </Text>

            <Text style={styles.meta}>{match.rating} {t('common.rr')}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.delta, won ? styles.up : styles.down]}>{match.score || '—'}</Text>

            {match.kda ? <Text style={styles.meta}>{match.kda}</Text> : null}
          </>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.textDim} style={styles.chevron} />
    </Pressable>
  );
}

/** Alternador Histórico / Estatísticas. */
function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => {
              if (!selected) {
                tap();
                onChange(option.key);
              }
            }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MatchesScreen() {
  const session = useSession();
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('history');
  const [queue, setQueue] = useState('competitive');
  const closeDetail = useCallback(() => setSelected(null), []);

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadMatches(session, queue), [session, queue, lang])
  );

  // Estável: a aba de stats recarrega quando a lista de IDs muda.
  const matchIds = useMemo(() => (data || []).map((match) => match.id).join(','), [data]);
  const idList = useMemo(() => (matchIds ? matchIds.split(',') : []), [matchIds]);

  if (selected) {
    return <MatchDetailScreen matchId={selected} onBack={closeDetail} />;
  }

  // Filtros ficam sempre visíveis: se um modo vier vazio ou falhar,
  // dá pra trocar de modo sem sair da tela.
  let content;

  if (loading) {
    content = <SkeletonScreen variant="list" />;
  } else if (error) {
    content = <Message title={t('common.errorTitle')} body={error.message} actionLabel={t('common.retry')} onAction={refresh} />;
  } else if (!data.length) {
    content = <Message title={t('matches.emptyTitle')} body={t('matches.emptyBody')} />;
  } else if (view === 'stats') {
    content = <StatsView matchIds={idList} />;
  } else {
    content = (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MatchRow match={item} onPress={setSelected} />}
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
    );
  }

  return (
    <Screen
      title={t('matches.title')}
      subtitle={data?.length ? t('matches.subtitle', { n: data.length }) : null}
    >
      <Chips
        value={queue}
        onChange={setQueue}
        options={QUEUES.map((key) => ({ key, label: t(`queue.${key}`) }))}
      />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { key: 'history', label: t('matches.tabHistory') },
          { key: 'stats', label: t('matches.tabStats') },
        ]}
      />

      {content}
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
  segmented: {
    flexDirection: 'row',
    marginHorizontal: theme.gap,
    marginBottom: theme.gap,
    padding: 4,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  segmentSelected: {
    backgroundColor: theme.surfaceAlt,
  },
  segmentLabel: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentLabelSelected: {
    color: theme.text,
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
  pressed: {
    opacity: 0.7,
  },
  chevron: {
    marginLeft: -4,
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
    fontSize: 20,
    fontFamily: theme.fonts.display,
  },
  up: {
    color: '#4ADE80',
  },
  down: {
    color: theme.accent,
  },
});
