import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Image } from './Img';
import { useI18n } from '../i18n';
import { theme } from '../theme';
import { useSkinPreview } from '../skinPreview';
import { OwnedBadge } from './ShopSections';

export function SkinCard({ skin, wishlisted }) {
  const { t, lang } = useI18n();
  const { openSkin } = useSkinPreview();

  return (
    <Pressable
      onPress={() => openSkin(skin.id, { price: skin.price, owned: skin.owned })}
      style={({ pressed }) => [styles.card, skin.owned && styles.ownedCard, pressed && styles.pressed]}
    >
      <View style={styles.art}>
        {skin.image ? (
          <Image
            source={{ uri: skin.image }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.placeholder}>{t('shop.noImage')}</Text>
        )}

        {skin.owned ? <OwnedBadge /> : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {skin.name || t('shop.unknownSkin')}
          </Text>
          {wishlisted ? <Ionicons name="heart" size={15} color={theme.accent} /> : null}
        </View>

        <Text style={styles.price}>
          {skin.price == null ? '--' : `${skin.price.toLocaleString(lang)} VP`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
  ownedCard: {
    borderColor: 'rgba(74,222,128,0.5)',
  },
  art: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
  },
  image: {
    width: '86%',
    height: '78%',
  },
  placeholder: {
    color: theme.textDim,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  name: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  price: {
    color: theme.accent,
    fontSize: 17,
    fontFamily: theme.fonts.display,
  },
});
