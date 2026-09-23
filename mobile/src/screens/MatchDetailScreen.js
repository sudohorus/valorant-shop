import { useCallback, useEffect } from 'react';
import {
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Image } from '../ui/Img';
import { useSession } from '../auth';
import { useI18n } from '../i18n';
import { loadMatchDetails } from '../match';
import { theme } from '../theme';
import { Loading, Message } from '../ui/kit';
import { useRemote } from '../useRemote';
import { useTabActive } from '../ui/Tabs';

const WIN = '#4ADE80';

function formatDate(date, lang) {
  if (!date) {
    return null;
  }

  return date.toLocaleDateString(lang, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BackButton({ onPress }) {
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={20} color={theme.text} />
      <Text style={styles.backLabel}>{t('match.back')}</Text>
    </Pressable>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PlayerRow({ player }) {
  const { t } = useI18n();

  return (
    <View style={[styles.player, player.isMe && styles.playerMe]}>
      {player.agentIcon ? (
        <Image source={{ uri: player.agentIcon }} style={styles.agent} />
      ) : (
        <View style={styles.agent} />
      )}

      <View style={styles.playerInfo}>
        <Text style={styles.playerName} numberOfLines={1}>
          {player.gameName || t('match.player')}
        </Text>

        <Text style={styles.dim} numberOfLines={1}>
          {player.name
            ? [player.agent, `#${player.tagLine}`].filter(Boolean).join(' · ')
            : t('match.anonymous')}
        </Text>
      </View>

      {player.tierIcon ? (
        <Image source={{ uri: player.tierIcon }} style={styles.rank} />
      ) : null}

      <Text style={styles.kda}>
        {player.kills}/{player.deaths}/{player.assists}
      </Text>

      <Text style={styles.acs}>{player.acs}</Text>
    </View>
  );
}

function Team({ team, label }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamHeader}>
        <Text style={[styles.teamName, { color: team.won ? WIN : theme.accent }]}>
          {label} · {team.roundsWon}
        </Text>

        <View style={styles.teamCols}>
          <Text style={[styles.colLabel, styles.kdaCol]}>K/D/A</Text>
          <Text style={[styles.colLabel, styles.acsCol]}>ACS</Text>
        </View>
      </View>

      {team.players.map((player) => (
        <PlayerRow key={player.puuid} player={player} />
      ))}
    </View>
  );
}

export function MatchDetailScreen({ matchId, onBack }) {
  const session = useSession();
  const { t, lang } = useI18n();
  const tabActive = useTabActive();

  // Botão voltar do Android fecha o detalhe em vez de sair do app
  // (só com a aba Partidas na frente).
  useEffect(() => {
    if (!tabActive) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();

      return true;
    });

    return () => subscription.remove();
  }, [onBack, tabActive]);

  const { data, error, loading, refreshing, refresh } = useRemote(
    // `lang` recarrega os nomes de mapa/agente no idioma novo.
    useCallback(() => loadMatchDetails(session, matchId), [session, matchId, lang])
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <BackButton onPress={onBack} />
        <Loading label={t('match.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <BackButton onPress={onBack} />
        <Message
          title={t('common.errorTitle')}
          body={error.message}
          actionLabel={t('common.retry')}
          onAction={refresh}
        />
      </View>
    );
  }

  const [mine, theirs] = data.teams;
  const me = data.me;
  const won = data.result === 'win';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textDim} />
        }
      >
        <View style={styles.hero}>
          {data.mapImage ? (
            <Image
              source={{ uri: data.mapImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}

          <LinearGradient
            colors={['rgba(11,11,13,0.35)', 'rgba(11,11,13,0.75)', theme.bg]}
            style={StyleSheet.absoluteFillObject}
          />

          <BackButton onPress={onBack} />

          <View style={styles.heroContent}>
            {data.result ? (
              <Text style={[styles.result, { color: won ? WIN : data.result === 'draw' ? theme.text : theme.accent }]}>
                {t(`match.${data.result}`).toUpperCase()}
              </Text>
            ) : null}

            {mine && theirs ? (
              <Text style={styles.score}>
                <Text style={{ color: WIN }}>{mine.roundsWon}</Text>
                <Text style={styles.scoreDash}> : </Text>
                <Text style={{ color: theme.accent }}>{theirs.roundsWon}</Text>
              </Text>
            ) : null}

            <Text style={styles.heroMeta}>
              {[
                data.map || t('matches.unknownMap'),
                formatDate(data.playedAt, lang),
                data.durationMin && t('common.minutes', { n: data.durationMin }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        {me ? (
          <View style={styles.section}>
            <View style={styles.meHeader}>
              {me.agentIcon ? <Image source={{ uri: me.agentIcon }} style={styles.meAgent} /> : null}

              <View>
                <Text style={styles.sectionTitle}>{t('match.yourPerformance')}</Text>
                <Text style={styles.dim}>{me.agent}</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <Stat label="K/D/A" value={`${me.kills}/${me.deaths}/${me.assists}`} />
              <Stat label="ACS" value={me.acs} />
              <Stat label="ADR" value={me.adr} />
              <Stat label="HS%" value={me.hs == null ? '—' : `${me.hs}%`} />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('match.scoreboard')}</Text>

          {mine ? <Team team={mine} label={t('match.yourTeam')} /> : null}
          {theirs ? <Team team={theirs} label={t('match.enemies')} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    paddingBottom: theme.gap * 2,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.gap,
    paddingVertical: 12,
  },
  backLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  hero: {
    minHeight: 220,
    justifyContent: 'space-between',
    marginBottom: theme.gap,
  },
  heroContent: {
    padding: theme.gap,
    gap: 4,
  },
  result: {
    fontSize: 17,
    fontFamily: theme.fonts.display,
  },
  score: {
    fontSize: 48,
    fontFamily: theme.fonts.display,
  },
  scoreDash: {
    color: theme.textDim,
  },
  heroMeta: {
    color: theme.textDim,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 19,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  meAgent: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.surfaceAlt,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: theme.text,
    fontSize: 22,
    fontFamily: theme.fonts.display,
  },
  statLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  team: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  teamName: {
    fontSize: 16,
    fontFamily: theme.fonts.display,
  },
  teamCols: {
    flexDirection: 'row',
  },
  colLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  kdaCol: {
    width: 72,
  },
  acsCol: {
    width: 40,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerMe: {
    backgroundColor: theme.surfaceAlt,
  },
  agent: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.surfaceAlt,
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rank: {
    width: 22,
    height: 22,
  },
  kda: {
    width: 72,
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  acs: {
    width: 40,
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  dim: {
    color: theme.textDim,
    fontSize: 12,
  },
});
