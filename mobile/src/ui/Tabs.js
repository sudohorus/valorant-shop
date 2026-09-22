import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

/**
 * Barra de abas própria.
 *
 * São poucas telas e todas irmãs — não vale carregar uma
 * biblioteca de navegação por enquanto.
 */
export function Tabs({ tabs, active, onChange }) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const selected = tab.key === active;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>
              {tab.label}
            </Text>

            <View style={[styles.dot, selected && styles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
    paddingTop: 12,
    paddingBottom: 18,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: theme.text,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: theme.accent,
  },
});
