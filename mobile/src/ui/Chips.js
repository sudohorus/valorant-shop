import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { tap } from '../haptics';
import { theme } from '../theme';

/** Fileira rolável de filtros; um selecionado por vez. */
export function Chips({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((option) => {
        const selected = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => {
              if (!selected) {
                tap();
                onChange(option.key);
              }
            }}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // ScrollView vem com flexShrink: 1; com uma lista longa embaixo
    // ele era espremido na vertical e cortava os chips.
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: theme.gap,
  },
  row: {
    paddingHorizontal: theme.gap,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipSelected: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(255,70,85,0.12)',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    color: theme.text,
  },
});
