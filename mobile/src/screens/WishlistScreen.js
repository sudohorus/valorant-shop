import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Image } from '../ui/Img';
import { skins } from '../content';
import { t as translate, useI18n } from '../i18n';
import { useSession } from '../auth';
import { ownedSkins } from '../owned';
import { knownPrices } from '../prices';
import { theme } from '../theme';
import { Message, Screen } from '../ui/kit';
import { SkeletonScreen } from '../ui/Skeleton';
import { confirm } from '../haptics';
import { useSkinPreview } from '../skinPreview';
import { useWishlist } from '../wishlist';
import { useRemote } from '../useRemote';

// memo: com a busca, a lista re-renderiza a cada tecla; linhas que
// não mudaram não precisam ser redesenhadas.
const WishlistItem = memo(function WishlistItem({ skin, wishlisted, onToggle }) {
  const { t, lang } = useI18n();
  const { openSkin } = useSkinPreview();

  return (
    <View style={styles.item}>
      <Pressable
        onPress={() => openSkin(skin.id, { price: skin.estimated ? null : skin.price, owned: skin.owned })}
        style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          {skin.image ? (
            <Image source={{ uri: skin.image }} style={styles.thumbImage} resizeMode="contain" />
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.skinName} numberOfLines={1}>
            {skin.name}
          </Text>

          <Text style={[styles.price, skin.price == null && styles.priceMissing]}>
            {skin.price == null
              ? t('wishlist.notInStore')
              : `${skin.estimated ? '~' : ''}${skin.price.toLocaleString(lang)} VP`}
            {skin.owned ? <Text style={styles.owned}>  ·  {t('shop.owned')}</Text> : null}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onToggle(skin.id)}
        style={({ pressed }) => [styles.heartButton, pressed && styles.pressed]}
      >
        <Ionicons
          name={wishlisted ? 'heart' : 'heart-outline'}
          size={22}
          color={wishlisted ? theme.accent : theme.textDim}
        />
      </Pressable>
    </View>
  );
});

function collatorFor(lang) {
  try {
    const collator = new Intl.Collator(lang, { sensitivity: 'base' });

    return (a, b) => collator.compare(a.name, b.name);
  } catch {
    return (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }
}

async function loadCatalog(session, lang) {
  const [skinsMap, prices, owned] = await Promise.all([skins(), knownPrices(), ownedSkins(session)]);

  if (!skinsMap.size) {
    throw new Error(translate('wishlist.catalogError'));
  }

  const all = Array.from(skinsMap.entries())
    .map(([uuid, skin]) => ({
      id: uuid,
      ...skin,
      // 1º preço visto na loja; 2º preço fixo da raridade (armas).
      price: prices.get(uuid) ?? skin.tierPrice,
      // Faca que nunca apareceu na loja: preço da raridade é chute.
      estimated: !prices.has(uuid) && skin.melee && skin.tierPrice != null,
      owned: owned.has(uuid),
      // Pré-calculado: a busca roda a cada tecla.
      searchKey: skin.name.toLowerCase(),
    }))
    // Um Collator só: localeCompare(x, lang) cria um por comparação e,
    // com milhares de skins, trava a thread de JS no Hermes.
    .sort(collatorFor(lang));

  return {
    byId: new Map(all.map((skin) => [skin.id, skin])),
    // A busca só mostra o que dá pra comprar
    // (tira skins de passe de batalha, padrão, etc).
    searchable: all.filter((skin) => skin.price != null),
  };
}

export function WishlistScreen() {
  const session = useSession();
  const { t, lang } = useI18n();
  const { add, remove, has, getAll } = useWishlist();
  const [search, setSearch] = useState('');

  const { data: catalog, error, loading, refresh } = useRemote(
    useCallback(() => loadCatalog(session, lang), [session, lang])
  );

  const query = search.trim().toLowerCase();
  // O campo atualiza na hora; o filtro (milhares de skins) roda com
  // prioridade baixa, sem travar a digitação.
  const deferredQuery = useDeferredValue(query);

  const searchResults = useMemo(
    () =>
      catalog && deferredQuery.length > 1
        ? catalog.searchable.filter((skin) => skin.searchKey.includes(deferredQuery))
        : [],
    [catalog, deferredQuery]
  );

  const toggle = useCallback(
    (uuid) => {
      confirm();

      if (has(uuid)) {
        remove(uuid);
      } else {
        add(uuid);
      }
    },
    [has, add, remove]
  );

  if (loading) {
    return <SkeletonScreen variant="rows" />;
  }

  if (error) {
    return (
      <Message
        title={t('common.errorTitle')}
        body={error.message}
        actionLabel={t('common.retry')}
        onAction={refresh}
      />
    );
  }

  const wishlistedSkins = getAll()
    .map((uuid) => catalog.byId.get(uuid))
    .filter(Boolean);

  const totalVp = wishlistedSkins.reduce((sum, skin) => sum + (skin.price || 0), 0);
  const totalEstimated = wishlistedSkins.some((skin) => skin.estimated);

  const listData = query.length > 1 ? searchResults : wishlistedSkins;
  const isSearching = query.length > 1;

  return (
    <Screen title={t('wishlist.title')} subtitle={t('wishlist.subtitle')}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('wishlist.search')}
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {isSearching
              ? t('wishlist.results', { n: searchResults.length })
              : t('wishlist.yourList', { n: wishlistedSkins.length }) +
                (totalVp ? ` · ${totalEstimated ? '~' : ''}${totalVp.toLocaleString(lang)} VP` : '')}
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isSearching ? t('wishlist.noResults') : t('wishlist.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <WishlistItem
            skin={item}
            wishlisted={has(item.id)}
            onToggle={toggle}
          />
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
  separator: {
    height: 1,
    backgroundColor: theme.border,
  },
  searchContainer: {
    paddingHorizontal: theme.gap,
    marginBottom: theme.gap,
  },
  input: {
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 16,
  },
  sectionTitle: {
    color: theme.textDim,
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  empty: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '90%',
    height: '90%',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  skinName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  owned: {
    color: '#4ADE80',
    fontWeight: '700',
  },
  priceMissing: {
    color: theme.textDim,
    fontWeight: '500',
  },
  heartButton: {
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  heart: {
    fontSize: 18,
  },
});
