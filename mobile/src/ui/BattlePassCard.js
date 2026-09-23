import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSession } from '../auth';
import { loadBattlePass } from '../battlepass';
import { useI18n } from '../i18n';
import { useSkinPreview } from '../skinPreview';
import { theme } from '../theme';
import { useRemote } from '../useRemote';
import { Image } from './Img';
import { Bone } from './Skeleton';

const REWARD_WIDTH = 92;
const GAP = 10;

function Reward({ level }) {
  const { t, lang } = useI18n();
  const { openSkin } = useSkinPreview();

  const label =
    level.kind === 'currency' && level.amount
      ? `${level.amount.toLocaleString(lang)} ${level.name || ''}`.trim()
      : level.name;

  return (
    <Pressable
      disabled={level.kind !== 'skin'}
      onPress={() => openSkin(level.skinId, { owned: level.reached })}
      style={({ pressed }) => [styles.reward, level.reached && styles.rewardReached, pressed && styles.pressed]}
    >
      <View style={styles.rewardArt}>
        {level.image ? (
          <Image
            source={{ uri: level.image }}
            style={level.kind === 'card' ? styles.cardImage : styles.rewardImage}
            resizeMode={level.kind === 'card' ? 'cover' : 'contain'}
          />
        ) : level.kind === 'title' ? (
          <Ionicons name="text" size={22} color={theme.textDim} />
        ) : null}

        {level.reached ? (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={11} color="#052E14" />
          </View>
        ) : null}
      </View>

      <Text style={styles.levelLabel}>
        {level.epilogue ? t('bp.epilogue') : t('bp.levelShort', { n: level.number })}
      </Text>

      {label ? (
        <Text style={styles.rewardName} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function BattlePassCard() {
  const session = useSession();
  const { t, lang } = useI18n();
  const scroll = useRef(null);

  const { data, error, loading } = useRemote(
    useCallback(() => loadBattlePass(session), [session, lang])
  );

  // Abre a fileira já no próximo nível, não no começo do passe.
  useEffect(() => {
    if (data && data.reached > 1) {
      const x = Math.max(0, (data.reached - 1) * (REWARD_WIDTH + GAP));
      setTimeout(() => scroll.current?.scrollTo({ x, animated: false }), 0);
    }
  }, [data]);

  if (loading) {
    return <Bone style={styles.skeleton} />;
  }

  // Sem passe ativo ou falha: o perfil segue sem esse bloco.
  if (error || !data) {
    return null;
  }

  const progress = data.xpNeeded ? Math.min(1, data.xpInto / data.xpNeeded) : 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{data.name}</Text>
          <Text style={styles.level}>
            {data.complete
              ? t('bp.complete')
              : t('bp.level', { n: Math.min(data.reached, data.total), total: data.total })}
          </Text>
        </View>

        {!data.complete && data.xpNeeded ? (
          <Text style={styles.xp}>
            {t('bp.xp', { a: data.xpInto.toLocaleString(lang), b: data.xpNeeded.toLocaleString(lang) })}
          </Text>
        ) : null}
      </View>

      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rewards}
      >
        {data.levels.map((level) => (
          <Reward key={level.number} level={level} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    height: 210,
    marginHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
    borderRadius: theme.radius,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
    paddingTop: theme.gap,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: theme.gap,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  level: {
    color: theme.text,
    fontSize: 22,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xp: {
    color: theme.textDim,
    fontSize: 12,
    fontWeight: '600',
    paddingBottom: 3,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.surfaceAlt,
    marginHorizontal: theme.gap,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.accent,
  },
  rewards: {
    padding: theme.gap,
    gap: GAP,
  },
  reward: {
    width: REWARD_WIDTH,
    gap: 4,
  },
  rewardReached: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
  rewardArt: {
    height: 64,
    borderRadius: 10,
    backgroundColor: theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rewardImage: {
    width: '80%',
    height: '75%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  rewardName: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
