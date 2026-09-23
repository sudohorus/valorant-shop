import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Image } from '../ui/Img';
import { agents, competitiveTiers, playerCards, playerTitles } from '../content';
import { rawMatch } from '../match';
import { callGame } from '../riot';
import { theme } from '../theme';
import { Button, Message, Row, Screen } from '../ui/kit';
import { SkeletonScreen } from '../ui/Skeleton';
import { BattlePassCard } from '../ui/BattlePassCard';
import { useRemote } from '../useRemote';
import { useAuth, useSession } from '../auth';
import { useI18n } from '../i18n';
import { notificationsAvailable, setShopAlerts, shopAlertsEnabled } from '../notifications';
import { confirm } from '../haptics';
import { LanguagePicker } from '../ui/LanguagePicker';

function StatBox({ label, value, wide }) {
  return (
    <View style={[styles.statBoxContainer, wide && styles.statBoxWide]}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

/**
 * Topo do perfil: o agente mais jogado, com as cores dele.
 * Sem partidas recentes, cai pro banner do card.
 */
function Banner({ agent, cardArt }) {
  const { t } = useI18n();

  if (!agent) {
    return (
      <View style={styles.banner}>
        {cardArt ? (
          <Image source={{ uri: cardArt }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[theme.accent, theme.surfaceAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient colors={['rgba(11,11,13,0)', theme.bg]} style={StyleSheet.absoluteFillObject} />
      </View>
    );
  }

  const colors = agent.colors.length >= 2 ? agent.colors : [theme.accent, theme.surfaceAlt];

  return (
    <View style={[styles.banner, styles.agentBanner]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

      {agent.background ? (
        <Image source={{ uri: agent.background }} style={styles.agentBackground} resizeMode="cover" />
      ) : null}

      {agent.portrait ? (
        <Image source={{ uri: agent.portrait }} style={styles.agentPortrait} resizeMode="cover" />
      ) : null}

      <LinearGradient
        colors={['rgba(11,11,13,0)', 'rgba(11,11,13,0.55)', theme.bg]}
        locations={[0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.agentLabel}>
        <Text style={styles.agentKicker}>{t('profile.mostPlayed')}</Text>
        <Text style={styles.agentName}>{agent.name.toUpperCase()}</Text>
        <Text style={styles.agentGames}>
          {t('profile.gamesOf', { games: agent.games, sample: agent.sample })}
        </Text>
      </View>
    </View>
  );
}

/** Liga/desliga o aviso diário de loja renovada. */
function ShopAlertsToggle() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(shopAlertsEnabled);
  const [denied, setDenied] = useState(false);

  async function toggle(next) {
    confirm();
    setEnabled(next);
    setDenied(false);

    const granted = await setShopAlerts(next);

    if (!granted) {
      // Sem permissão não adianta mostrar ligado.
      setEnabled(false);
      setDenied(true);
    }
  }

  return (
    <View style={styles.toggleCard}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{t('profile.shopAlerts')}</Text>
        <Text style={styles.toggleHint}>
          {!notificationsAvailable
            ? t('profile.needsDevBuild')
            : denied
              ? t('profile.permissionDenied')
              : t('profile.shopAlertsHint')}
        </Text>
      </View>

      <Switch
        value={enabled}
        disabled={!notificationsAvailable}
        onValueChange={toggle}
        trackColor={{ false: theme.surfaceAlt, true: theme.accent }}
        thumbColor={theme.text}
      />
    </View>
  );
}

/** Nunca derruba o perfil: sem esse dado a tela só fica mais simples. */
function optional(promise, what) {
  return promise.catch((problem) => {
    // 404 aqui é esperado (endpoint que não existe no seu shard, como o
    // loadout): tem alternativa, então só registra no terminal, sem aviso na tela.
    if (problem?.status === 404) {
      console.log(`[perfil] ${what} indisponível (404), usando alternativa.`);
    } else {
      console.warn(`${what}:`, problem?.message);
    }

    return null;
  });
}

/**
 * Card e título do jogador. O playerloadout é a fonte oficial, mas
 * falha em alguns shards — nesse caso pegamos o card que aparece
 * no match-details da última partida.
 */
async function loadIdentity(session, lastMatchId) {
  const loadout = await optional(
    callGame(session, `/personalization/v2/players/${session.puuid}/playerloadout`, {
      what: 'what.loadout',
    }),
    'Loadout'
  );

  if (loadout?.Identity?.PlayerCardID) {
    return {
      cardId: loadout.Identity.PlayerCardID,
      titleId: loadout.Identity.PlayerTitleID,
      level: loadout.Identity.HideAccountLevel ? null : loadout.Identity.AccountLevel,
    };
  }

  if (!lastMatchId) {
    return {};
  }

  const match = await optional(rawMatch(session, lastMatchId), 'Última partida');
  const me = match?.players?.find((player) => player.subject === session.puuid);

  return {
    cardId: me?.playerCard,
    titleId: me?.playerTitle,
    level: me?.accountLevel,
  };
}

// Quantas partidas recentes olhar para achar o agente mais jogado.
const MAIN_AGENT_SAMPLE = 8;

/** Agente mais usado nas últimas partidas (o match-details fica em cache). */
async function loadMainAgent(session, matchIds, agentIndex) {
  const details = await Promise.all(
    matchIds
      .slice(0, MAIN_AGENT_SAMPLE)
      .map((id) => optional(rawMatch(session, id), 'Partida recente'))
  );

  const counts = new Map();
  let sample = 0;

  for (const match of details) {
    const me = match?.players?.find((player) => player.subject === session.puuid);
    const id = me?.characterId?.toLowerCase();

    if (id) {
      sample++;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const agent = top ? agentIndex.get(top[0]) : null;

  return agent ? { ...agent, games: top[1], sample } : null;
}

async function loadProfile(session) {
  const [names, mmr, xp, updates, tierIndex, cardsIndex, titlesIndex, agentIndex] = await Promise.all([
    callGame(session, '/name-service/v2/players', {
      method: 'PUT',
      body: [session.puuid],
      what: 'what.accountName',
    }),
    optional(callGame(session, `/mmr/v1/players/${session.puuid}`, { what: 'what.mmr' }), 'MMR'),
    optional(callGame(session, `/account-xp/v1/players/${session.puuid}`, { what: 'what.level' }), 'Nível'),
    optional(
      callGame(
        session,
        `/mmr/v1/players/${session.puuid}/competitiveupdates?queue=competitive&startIndex=0&endIndex=20`,
        { what: 'what.matches' }
      ),
      'Histórico'
    ),
    competitiveTiers(),
    playerCards(),
    playerTitles(),
    agents(),
  ]);

  const matches = updates?.Matches || [];

  const [identity, mainAgent] = await Promise.all([
    loadIdentity(session, matches[0]?.MatchID),
    loadMainAgent(session, matches.map((match) => match.MatchID), agentIndex),
  ]);

  const me = names[0] || {};
  const latest = mmr?.LatestCompetitiveUpdate || matches[0] || {};
  const tier = tierIndex.get(latest.TierAfterUpdate);

  const card = identity.cardId ? cardsIndex.get(identity.cardId.toLowerCase()) : null;
  const title = identity.titleId ? titlesIndex.get(identity.titleId.toLowerCase()) : null;

  const totalMatches = matches.length;
  let wins = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let pdlSum = 0;
  let peakTier = 0;

  const reversedMatches = [...matches].reverse();
  for (const match of reversedMatches) {
    const delta = match.RankedRatingEarned || 0;
    const tierId = match.TierAfterUpdate || 0;

    if (tierId > peakTier) {
      peakTier = tierId;
    }

    if (delta > 0) {
      wins++;
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else if (delta < 0) {
      currentStreak = 0;
    }

    pdlSum += delta;
  }

  const peakTierName = tierIndex.get(peakTier)?.name || null;
  const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const avgPdl = totalMatches > 0 ? (pdlSum / totalMatches).toFixed(1) : 0;
  const avgPdlFormatted = avgPdl > 0 ? `+${avgPdl}` : `${avgPdl}`;

  return {
    gameName: me.GameName || null,
    tagLine: me.TagLine ? `#${me.TagLine}` : '',
    title,
    level: xp?.Progress?.Level ?? identity.level ?? null,
    tier: tier?.name || null,
    tierIcon: tier?.icon || null,
    tierColor: tier?.color || theme.accent,
    rating: latest.RankedRatingAfterUpdate ?? null,
    shard: session.shard.toUpperCase(),
    puuid: session.puuid,
    cardWideArt: card?.wide || card?.large || null,
    cardSmallArt: card?.small || null,
    mainAgent,
    stats: {
      totalMatches,
      wins,
      winrate,
      maxStreak,
      avgPdl: avgPdlFormatted,
      peakTierName,
    },
  };
}

export function ProfileScreen() {
  const session = useSession();
  const { signOut } = useAuth();
  const { t, lang } = useI18n();

  const { data, error, loading, refreshing, refresh } = useRemote(
    // `lang` recarrega patente/título/agente no idioma novo.
    useCallback(() => loadProfile(session), [session, lang])
  );

  if (loading) return <SkeletonScreen variant="profile" />;
  if (error) return <Message title={t('common.errorTitle')} body={error.message} actionLabel={t('profile.signOutShort')} onAction={signOut} />;

  const gameName = data.gameName || t('profile.noName');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textDim} />}>
        <Banner agent={data.mainAgent} cardArt={data.cardWideArt} />

        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            {data.cardSmallArt ? (
              <Image source={{ uri: data.cardSmallArt }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text style={styles.avatarLetter}>{gameName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}

            {data.level != null ? (
              <View style={styles.level}>
                <Text style={styles.levelText}>{data.level}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {gameName}
              <Text style={styles.tag}> {data.tagLine}</Text>
            </Text>

            {data.title ? <Text style={styles.title} numberOfLines={1}>{data.title}</Text> : null}
          </View>
        </View>

        <View style={[styles.rankCard, { borderColor: data.tierColor }]}>
          {data.tierIcon ? <Image source={{ uri: data.tierIcon }} style={styles.tierIcon} /> : null}

          <View style={styles.rankInfo}>
            <Text style={styles.rankLabel}>{t('profile.currentRank')}</Text>
            <Text style={styles.rankName}>{data.tier || t('profile.unranked')}</Text>

            {data.rating !== null ? (
              <View style={styles.progress}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(data.rating, 100)}%`, backgroundColor: data.tierColor },
                  ]}
                />
              </View>
            ) : null}
          </View>

          {data.rating !== null ? (
            <Text style={styles.rr}>
              {data.rating}
              <Text style={styles.rrUnit}> {t('common.rr')}</Text>
            </Text>
          ) : null}
        </View>

        <BattlePassCard />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.lastN', { n: data.stats.totalMatches })}</Text>
          <View style={styles.statsGrid}>
            <StatBox label={t('profile.wins')} value={data.stats.wins} />
            <StatBox label={t('profile.winrate')} value={`${data.stats.winrate}%`} />
            <StatBox label={t('profile.bestStreak')} value={t('profile.streakValue', { n: data.stats.maxStreak })} />
            <StatBox label={t('profile.avgRR')} value={data.stats.avgPdl} />
            <StatBox label={t('profile.peakRank')} value={data.stats.peakTierName || t('profile.unranked')} wide />
          </View>
        </View>

        <View style={styles.card}>
          <Row label={t('profile.server')} value={data.shard} />
          <Row label="PUUID" value={`${data.puuid.slice(0, 8)}...`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          <LanguagePicker />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
          <ShopAlertsToggle />
        </View>

        <View style={styles.actions}>
          <Button label={t('profile.signOut')} tone="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: theme.gap * 2,
  },
  banner: {
    height: 170,
    backgroundColor: theme.surfaceAlt,
  },
  agentBanner: {
    height: 240,
    overflow: 'hidden',
  },
  agentBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  agentPortrait: {
    position: 'absolute',
    right: -70,
    top: -10,
    width: 320,
    height: 320,
  },
  agentLabel: {
    position: 'absolute',
    left: theme.gap,
    top: theme.gap,
  },
  agentKicker: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  agentName: {
    color: '#FFFFFF',
    fontSize: 39,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontFamily: theme.fonts.display,
  },
  agentGames: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    paddingHorizontal: theme.gap,
    marginTop: -48,
    marginBottom: theme.gap * 1.25,
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: theme.bg,
    backgroundColor: theme.surfaceAlt,
  },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '800',
  },
  level: {
    marginTop: -12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  levelText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  nameBlock: {
    flex: 1,
    paddingBottom: 14,
    gap: 2,
  },
  name: {
    fontSize: 26,
    color: theme.text,
    fontFamily: theme.fonts.display,
  },
  tag: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textDim,
  },
  title: {
    fontSize: 13,
    color: theme.accent,
    fontWeight: '600',
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    marginHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
    padding: theme.gap,
  },
  tierIcon: {
    width: 56,
    height: 56,
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankLabel: {
    fontSize: 11,
    color: theme.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rankName: {
    fontSize: 22,
    color: theme.text,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.surfaceAlt,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rr: {
    fontSize: 28,
    color: theme.text,
    fontFamily: theme.fonts.display,
  },
  rrUnit: {
    fontSize: 12,
    color: theme.textDim,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: theme.gap,
    marginBottom: theme.gap,
  },
  sectionTitle: {
    fontSize: 19,
    color: theme.text,
    marginBottom: theme.gap,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(theme.gap / 2),
    marginTop: -(theme.gap / 2),
  },
  statBoxContainer: {
    width: '50%',
    padding: theme.gap / 2,
  },
  statBoxWide: {
    width: '100%',
  },
  statBox: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    padding: theme.gap,
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    color: theme.textDim,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 23,
    color: theme.text,
    fontFamily: theme.fonts.display,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: theme.gap,
    marginBottom: theme.gap,
    overflow: 'hidden',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.gap,
  },
  toggleText: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleHint: {
    color: theme.textDim,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    paddingHorizontal: theme.gap,
  },
});
