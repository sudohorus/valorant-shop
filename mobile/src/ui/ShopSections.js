import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Image } from './Img';
import { useI18n } from '../i18n';
import { useSkinPreview } from '../skinPreview';
import { theme } from '../theme';

const NIGHT = '#A78BFA';
const OWNED = '#4ADE80';

/** Selo verde de "já tenho", sobreposto na arte da skin. */
export function OwnedBadge({ compact }) {
  const { t } = useI18n();

  return (
    <View style={[styles.owned, compact && styles.ownedCompact]}>
      <Ionicons name="checkmark" size={12} color="#052E14" />
      {compact ? null : <Text style={styles.ownedText}>{t('shop.owned')}</Text>}
    </View>
  );
}

/** Saldo de cada moeda, em "pílulas" lado a lado. */
export function WalletBar({ balances }) {
  const { lang } = useI18n();

  return (
    <View style={styles.wallet}>
      {balances.map((balance) => (
        <View key={balance.id} style={styles.walletItem}>
          {balance.icon ? (
            <Image source={{ uri: balance.icon }} style={styles.walletIcon} />
          ) : (
            <Ionicons name="wallet-outline" size={16} color={theme.textDim} />
          )}
          <Text style={styles.walletAmount}>{balance.amount.toLocaleString(lang)}</Text>
        </View>
      ))}
    </View>
  );
}

/** "2d 5h" para prazos longos, "5h 03min" para curtos. */
export function formatDuration(seconds) {
  if (seconds == null) {
    return null;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

export function SectionHeader({ title, subtitle, icon, color = theme.text }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Price({ value, lang, style }) {
  return <Text style={style}>{value == null ? '--' : `${value.toLocaleString(lang)} VP`}</Text>;
}

/** Card compacto do mercado noturno: preço cheio riscado + desconto. */
export function NightMarketCard({ item, wishlisted }) {
  const { t, lang } = useI18n();
  const { openSkin } = useSkinPreview();

  return (
    <Pressable
      onPress={() => openSkin(item.id, { price: item.discounted, owned: item.owned })}
      style={({ pressed }) => [
        styles.nightCard,
        wishlisted && styles.nightCardWish,
        item.owned && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.nightArt}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.nightImage} resizeMode="contain" />
        ) : null}

        {item.owned ? <OwnedBadge /> : null}

        {item.percent ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{item.percent}%</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.nightFooter}>
        <View style={styles.nameRow}>
          <Text style={styles.nightName} numberOfLines={1}>
            {item.name || t('shop.unknownSkin')}
          </Text>
          {wishlisted ? <Ionicons name="heart" size={13} color={theme.accent} /> : null}
        </View>

        <View style={styles.nightPrices}>
          <Price value={item.price} lang={lang} style={styles.oldPrice} />
          <Price value={item.discounted} lang={lang} style={styles.nightPrice} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  owned: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: OWNED,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ownedCompact: {
    top: 4,
    left: 4,
    paddingHorizontal: 5,
  },
  ownedText: {
    color: '#052E14',
    fontSize: 11,
    fontWeight: '800',
  },
  dimmed: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.75,
  },
  wallet: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.gap * 1.5,
  },
  walletItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  walletIcon: {
    width: 18,
    height: 18,
  },
  walletAmount: {
    color: theme.text,
    fontSize: 17,
    fontFamily: theme.fonts.display,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionSubtitle: {
    color: theme.textDim,
    fontSize: 12,
  },
  oldPrice: {
    color: theme.textDim,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },

  nightCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    overflow: 'hidden',
  },
  nightCardWish: {
    borderColor: theme.accent,
  },
  nightArt: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.08)',
  },
  nightImage: {
    width: '84%',
    height: '70%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: NIGHT,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#1A1033',
    fontSize: 11,
    fontWeight: '800',
  },
  nightFooter: {
    padding: 10,
    gap: 4,
  },
  nightName: {
    flexShrink: 1,
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  nightPrices: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  nightPrice: {
    color: NIGHT,
    fontSize: 13,
    fontWeight: '800',
  },
});
