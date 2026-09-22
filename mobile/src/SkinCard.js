import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

export function SkinCard({ skin }) {
  return (
    <View style={styles.card}>
      <View style={styles.art}>
        {skin.image ? (
          <Image
            source={{ uri: skin.image }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.placeholder}>sem imagem</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={1}>
          {skin.name}
        </Text>

        <Text style={styles.price}>
          {skin.price === null ? '--' : `${skin.price} VP`}
        </Text>
      </View>
    </View>
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
  name: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  price: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
