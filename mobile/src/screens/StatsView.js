import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Image } from '../ui/Img';
import { useSession } from '../auth';
import { useI18n } from '../i18n';
import { loadStats } from '../stats';
import { theme } from '../theme';
import { Message } from '../ui/kit';

const WIN = '#4ADE80';

function winColor(winrate) {
  if (winrate >= 55) return WIN;
  if (winrate >= 45) return theme.text;

  return theme.accent;
}

function Big({ label, value }) {
  return (
    <View style={styles.big}>
      <Text style={styles.bigValue}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

/** Linha de agente ou mapa: imagem, nome, recorde, barra de winrate e números. */
function StatLine({ image, wide, name, line }) {
  const { t } = useI18n();

  return (
    <View style={styles.line}>
      {image ? (
        <Image source={{ uri: image }} style={wide ? styles.mapThumb : styles.agentThumb} />
      ) : (
        <View style={wide ? styles.mapThumb : styles.agentThumb} />
      )}

      <View style={styles.lineInfo}>
        <View style={styles.lineTop}>
          <Text style={styles.lineName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.lineWinrate, { color: winColor(line.winrate) }]}>{line.winrate}%</Text>
        </View>

        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${line.winrate}%`, backgroundColor: winColor(line.winrate) }]} />
        </View>

        <Text style={styles.lineMeta} numberOfLines={1}>
          {[
            t(line.games === 1 ? 'stats.game' : 'stats.games', { n: line.games }),
            t('stats.record', { w: line.wins, l: line.losses }),
            `K/D ${line.kd}`,
            `ACS ${line.acs}`,
          ].join(' · ')}
        </Text>
      </View>
    </View>
  );
}

export function StatsView({ matchIds }) {
  const session = useSession();
  const { t, lang } = useI18n();

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: matchIds.length });
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async () => {
    setError(null);
    setProgress({ done: 0, total: matchIds.length });

    try {
      setStats(await loadStats(session, matchIds, (done, total) => setProgress({ done, total })));
    } catch (problem) {
      setError(problem);
    }
    // `lang` recarrega nomes de mapa/agente no idioma novo.
  }, [session, matchIds, lang]);

  useEffect(() => {
    run();
  }, [run]);

  async function refresh() {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }

  if (error) {
    return <Message title={t('common.errorTitle')} body={error.message} actionLabel={t('common.retry')} onAction={run} />;
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
        <Text style={styles.dim}>{t('stats.loading', progress)}</Text>
      </View>
    );
  }

  if (!stats.overall.games) {
    return <Message title={t('matches.emptyTitle')} body={t('stats.empty')} />;
  }

  const { overall } = stats;

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textDim} />}
    >
      <Text style={styles.sectionTitle}>{t('stats.overall', { n: overall.games })}</Text>

      <View style={styles.bigRow}>
        <Big label={t('stats.winrate')} value={`${overall.winrate}%`} />
        <Big label="K/D" value={overall.kd} />
        <Big label="ACS" value={overall.acs} />
        <Big label="HS%" value={overall.hs == null ? '—' : `${overall.hs}%`} />
      </View>

      <Text style={styles.sectionTitle}>{t('stats.byAgent')}</Text>
      <View style={styles.card}>
        {stats.agents.map((agent) => (
          <StatLine key={agent.id} image={agent.icon} name={agent.name || '—'} line={agent} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('stats.byMap')}</Text>
      <View style={styles.card}>
        {stats.maps.map((map) => (
          <StatLine key={map.id} image={map.image} wide name={map.name || t('matches.unknownMap')} line={map} />
        ))}
      </View>

      {stats.failed ? <Text style={styles.dim}>{t('stats.partial', { n: stats.failed })}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  body: {
    paddingHorizontal: theme.gap,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 19,
    marginBottom: 12,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 16,
    marginBottom: theme.gap * 1.5,
  },
  big: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bigValue: {
    color: theme.text,
    fontSize: 26,
    fontFamily: theme.fonts.display,
  },
  bigLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.gap * 1.5,
    overflow: 'hidden',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  agentThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.surfaceAlt,
  },
  mapThumb: {
    width: 64,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.surfaceAlt,
  },
  lineInfo: {
    flex: 1,
    gap: 5,
  },
  lineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  lineName: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  lineWinrate: {
    fontSize: 18,
    fontFamily: theme.fonts.display,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  lineMeta: {
    color: theme.textDim,
    fontSize: 12,
  },
  dim: {
    color: theme.textDim,
    fontSize: 12,
    textAlign: 'center',
  },
});
