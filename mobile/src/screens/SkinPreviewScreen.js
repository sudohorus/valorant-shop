import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from '../ui/Img';
import { contentTiers, skins } from '../content';
import { useI18n } from '../i18n';
import { theme } from '../theme';
import { Loading, Message } from '../ui/kit';
import { useRemote } from '../useRemote';
import { confirm } from '../haptics';
import { useWishlist } from '../wishlist';

async function loadSkin(id) {
  const [skinIndex, tierIndex] = await Promise.all([skins(), contentTiers()]);

  const skin = skinIndex.get((id || '').toLowerCase());

  if (!skin) {
    return { skin: null };
  }

  return { skin, tier: skin.tierId ? tierIndex.get(skin.tierId) : null };
}

/** Player em loop. Recriado (via `key`) a cada vídeo novo. */
function SkinVideo({ uri }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

function levelLabel(level, index, t) {
  if (index === 0) {
    return t('preview.base');
  }

  const key = `levelItem.${level.item}`;
  const label = level.item ? t(key) : null;

  // Tipo novo que ainda não traduzimos: mostra o nome cru.
  return label === key ? level.item : label;
}

function chromaLabel(chroma, index, t) {
  if (index === 0) {
    return t('preview.base');
  }

  return chroma.name || t('preview.variant', { n: index });
}

export function SkinPreviewScreen({ skinId, extra, onClose }) {
  const { t, lang } = useI18n();
  const { has, add, remove } = useWishlist();
  const wishlisted = has(skinId);

  const { data, error, loading, refresh } = useRemote(
    useCallback(() => loadSkin(skinId), [skinId, lang])
  );

  function toggleWishlist() {
    confirm();

    if (wishlisted) {
      remove(skinId);
    } else {
      add(skinId);
    }
  }

  const [chromaIndex, setChromaIndex] = useState(0);
  // Qual vídeo está tocando: { kind: 'level' | 'chroma', index }.
  const [selected, setSelected] = useState(null);
  // Último nível escolhido, para voltar nele ao sair de uma variante.
  const [levelIndex, setLevelIndex] = useState(0);

  const skin = data?.skin;

  // Começa no primeiro nível que tiver vídeo.
  useEffect(() => {
    if (!skin) {
      return;
    }

    setChromaIndex(0);

    const first = skin.levels.findIndex((level) => level.video);

    setLevelIndex(first >= 0 ? first : 0);
    setSelected(first >= 0 ? { kind: 'level', index: first } : null);
  }, [skin]);

  const header = (
    <View style={styles.topBar}>
      {/* Skin que você já tem não faz sentido desejar. */}
      {data?.skin && !extra?.owned ? (
        <Pressable
          onPress={toggleWishlist}
          hitSlop={12}
          style={styles.close}
          accessibilityLabel={t(wishlisted ? 'preview.unwish' : 'preview.wish')}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={22}
            color={wishlisted ? theme.accent : theme.text}
          />
        </Pressable>
      ) : null}

      <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel={t('preview.close')}>
        <Ionicons name="close" size={24} color={theme.text} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <Loading />
      </SafeAreaView>
    );
  }

  if (error || !skin) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <Message
          title={t('common.errorTitle')}
          body={error?.message || t('preview.notFound')}
          actionLabel={error ? t('common.retry') : undefined}
          onAction={error ? refresh : undefined}
        />
      </SafeAreaView>
    );
  }

  const tier = data.tier;
  const tierColor = tier?.color || theme.accent;
  const chroma = skin.chromas[chromaIndex];
  const image = chroma?.render || skin.image;

  const video =
    selected?.kind === 'chroma'
      ? skin.chromas[selected.index]?.video
      : selected?.kind === 'level'
        ? skin.levels[selected.index]?.video
        : null;

  function pickChroma(index) {
    setChromaIndex(index);

    // Variante com vídeo próprio toca o dela.
    if (index > 0 && skin.chromas[index]?.video) {
      setSelected({ kind: 'chroma', index });

      return;
    }

    // Voltando para a cor padrão (ou variante sem vídeo), o player tem
    // de voltar para o nível escolhido — antes continuava preso no
    // vídeo da variante anterior.
    setSelected(skin.levels[levelIndex]?.video ? { kind: 'level', index: levelIndex } : null);
  }

  function pickLevel(index) {
    setLevelIndex(index);

    // Nível é sempre na cor padrão: senão a arte ficava de uma cor e o
    // vídeo de outra.
    setChromaIndex(0);
    setSelected({ kind: 'level', index });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[`${tierColor}55`, theme.bg]}
            style={StyleSheet.absoluteFillObject}
          />

          {header}

          <Image source={{ uri: image }} style={styles.render} resizeMode="contain" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name}>{skin.name}</Text>

          <View style={styles.metaRow}>
            {tier ? (
              <View style={[styles.tier, { borderColor: tierColor }]}>
                {tier.icon ? <Image source={{ uri: tier.icon }} style={styles.tierIcon} /> : null}
                <Text style={[styles.tierName, { color: tierColor }]}>{tier.name}</Text>
              </View>
            ) : null}

            {extra?.price != null ? (
              <Text style={styles.price}>{extra.price.toLocaleString(lang)} VP</Text>
            ) : null}

            {extra?.owned ? (
              <View style={styles.owned}>
                <Ionicons name="checkmark" size={12} color="#052E14" />
                <Text style={styles.ownedText}>{t('shop.owned')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.videoBox}>
          {video ? (
            <SkinVideo key={video} uri={video} />
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off-outline" size={22} color={theme.textDim} />
              <Text style={styles.dim}>{t('preview.noVideo')}</Text>
            </View>
          )}
        </View>

        {skin.chromas.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('preview.variants')}</Text>

            <View style={styles.swatches}>
              {skin.chromas.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => pickChroma(index)}
                  style={[styles.swatch, index === chromaIndex && { borderColor: tierColor }]}
                >
                  {item.swatch ? (
                    <Image source={{ uri: item.swatch }} style={styles.swatchImage} />
                  ) : (
                    <View style={[styles.swatchImage, styles.swatchEmpty]} />
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={styles.dim}>{chromaLabel(chroma, chromaIndex, t)}</Text>
          </View>
        ) : null}

        {skin.levels.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('preview.levels')}</Text>

            <View style={styles.levels}>
              {skin.levels.map((level, index) => {
                const active = selected?.kind === 'level' && selected.index === index;

                return (
                  <Pressable
                    key={level.id}
                    disabled={!level.video}
                    onPress={() => pickLevel(index)}
                    style={({ pressed }) => [
                      styles.level,
                      active && styles.levelActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.levelNumber, active && { backgroundColor: tierColor }]}>
                      <Text style={styles.levelNumberText}>{index + 1}</Text>
                    </View>

                    <View style={styles.levelInfo}>
                      <Text style={styles.levelTitle}>{t('preview.level', { n: index + 1 })}</Text>
                      <Text style={styles.dim}>{levelLabel(level, index, t)}</Text>
                    </View>

                    {level.video ? (
                      <Ionicons
                        name={active ? 'play-circle' : 'play-circle-outline'}
                        size={26}
                        color={active ? tierColor : theme.textDim}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  body: {
    paddingBottom: theme.gap * 2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: theme.gap,
    paddingTop: 8,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  hero: {
    height: 240,
  },
  render: {
    flex: 1,
    marginHorizontal: theme.gap * 1.5,
    marginBottom: theme.gap,
  },
  titleBlock: {
    paddingHorizontal: theme.gap,
    gap: 10,
    marginBottom: theme.gap,
  },
  name: {
    color: theme.text,
    fontSize: 31,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierIcon: {
    width: 16,
    height: 16,
  },
  tierName: {
    fontSize: 12,
    fontWeight: '800',
  },
  price: {
    color: theme.accent,
    fontSize: 19,
    fontFamily: theme.fonts.display,
  },
  owned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4ADE80',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ownedText: {
    color: '#052E14',
    fontSize: 11,
    fontWeight: '800',
  },
  videoBox: {
    marginHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
    aspectRatio: 16 / 9,
    borderRadius: theme.radius,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  noVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surface,
  },
  section: {
    paddingHorizontal: theme.gap,
    marginBottom: theme.gap * 1.5,
    gap: 10,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 19,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  swatchEmpty: {
    backgroundColor: theme.surfaceAlt,
  },
  levels: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  levelActive: {
    backgroundColor: theme.surfaceAlt,
  },
  pressed: {
    opacity: 0.7,
  },
  levelNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
  },
  levelNumberText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
  },
  levelInfo: {
    flex: 1,
    gap: 2,
  },
  levelTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dim: {
    color: theme.textDim,
    fontSize: 12,
  },
});
