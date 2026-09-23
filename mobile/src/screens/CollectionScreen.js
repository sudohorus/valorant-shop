import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { Image } from '../ui/Img';
import { useSession } from '../auth';
import { contentTiers, skins } from '../content';
import { useI18n } from '../i18n';
import { forgetOwned, ownedSkins } from '../owned';
import { knownPrices } from '../prices';
import { useSkinPreview } from '../skinPreview';
import { theme } from '../theme';
import { Chips } from '../ui/Chips';
import { Message, Screen } from '../ui/kit';
import { SkeletonScreen } from '../ui/Skeleton';
import { useRemote } from '../useRemote';

async function loadCollection(session) {
  // Puxar pra atualizar busca de novo (comprou algo agora há pouco).
  forgetOwned(session);

  const [skinIndex, owned, prices, tiers] = await Promise.all([
    skins(),
    ownedSkins(session),
    knownPrices(),
    contentTiers(),
  ]);

  // Os entitlements trazem todos os níveis que você tem; o level 1
  // é o que identifica a skin no catálogo.
  const mine = [];

  for (const id of owned) {
    const skin = skinIndex.get(id);

    if (skin) {
      const known = prices.get(id);

      mine.push({
        id,
        ...skin,
        price: known ?? skin.tierPrice,
        estimated: known == null && skin.melee && skin.tierPrice != null,
        tierColor: skin.tierId ? tiers.get(skin.tierId)?.color : null,
      });
    }
  }

  return mine;
}

/** Agrupa por arma (na ordem do arsenal) e quebra em linhas de 2. */
function toSections(list) {
  const groups = new Map();

  for (const skin of list) {
    const key = skin.weapon?.id || 'other';

    if (!groups.has(key)) {
      groups.set(key, { weapon: skin.weapon, skins: [] });
    }

    groups.get(key).skins.push(skin);
  }

  return [...groups.values()]
    .sort((a, b) => (a.weapon?.order ?? 99) - (b.weapon?.order ?? 99) || (a.weapon?.name || '').localeCompare(b.weapon?.name || ''))
    .map(({ weapon, skins: items }) => {
      const sorted = items.sort((a, b) => (a.name < b.name ? -1 : 1));
      const rows = [];

      for (let i = 0; i < sorted.length; i += 2) {
        rows.push(sorted.slice(i, i + 2));
      }

      return { key: weapon?.id || 'other', title: weapon?.name || '—', count: items.length, data: rows };
    });
}

const CollectionCard = memo(function CollectionCard({ skin }) {
  const { openSkin } = useSkinPreview();

  return (
    <Pressable
      onPress={() => openSkin(skin.id, { price: skin.estimated ? null : skin.price, owned: true })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.art, skin.tierColor && { borderBottomColor: skin.tierColor }]}>
        <Image source={{ uri: skin.image }} style={styles.image} resizeMode="contain" />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {skin.name}
      </Text>
    </Pressable>
  );
});

const CATEGORIES = ['Sidearm', 'SMG', 'Shotgun', 'Rifle', 'Sniper', 'Heavy', 'Melee'];

export function CollectionScreen() {
  const session = useSession();
  const { t, lang } = useI18n();
  const [category, setCategory] = useState('all');

  const { data, error, loading, refreshing, refresh } = useRemote(
    useCallback(() => loadCollection(session), [session, lang])
  );

  const filtered = useMemo(
    () => (data || []).filter((skin) => category === 'all' || skin.weapon?.category === category),
    [data, category]
  );

  const sections = useMemo(() => toSections(filtered), [filtered]);

  if (loading) {
    return <SkeletonScreen variant="grid" />;
  }

  if (error) {
    return <Message title={t('common.errorTitle')} body={error.message} actionLabel={t('common.retry')} onAction={refresh} />;
  }

  if (!data.length) {
    return <Message title={t('collection.title')} body={t('collection.empty')} actionLabel={t('common.retry')} onAction={refresh} />;
  }

  const total = data.reduce((sum, skin) => sum + (skin.price || 0), 0);
  const estimated = data.some((skin) => skin.estimated);

  // Só mostra as categorias em que você tem alguma skin.
  const present = new Set(data.map((skin) => skin.weapon?.category));
  const options = [
    { key: 'all', label: t('collection.all') },
    ...CATEGORIES.filter((key) => present.has(key)).map((key) => ({ key, label: t(`category.${key}`) })),
  ];

  return (
    <Screen
      title={t('collection.title')}
      subtitle={t('collection.subtitle', {
        n: data.length,
        vp: `${estimated ? '~' : ''}${total.toLocaleString(lang)}`,
      })}
    >
      <Chips options={options} value={category} onChange={setCategory} />

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.map((skin) => skin.id).join('-')}
        stickySectionHeadersEnabled={false}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.textDim} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.count}</Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((skin) => (
              <CollectionCard key={skin.id} skin={skin} />
            ))}
            {row.length === 1 ? <View style={styles.filler} /> : null}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: theme.gap,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 19,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  filler: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  art: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderBottomWidth: 2,
    borderBottomColor: theme.border,
  },
  image: {
    width: '84%',
    height: '70%',
  },
  name: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    padding: 10,
  },
});
