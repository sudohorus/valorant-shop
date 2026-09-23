import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../haptics';
import { theme } from '../theme';

// Abas visitadas ficam montadas; isto diz a cada tela se a dela
// é a que está na frente (ex.: botão voltar só age na aba ativa).
export const TabActiveContext = createContext(true);

export function useTabActive() {
  return useContext(TabActiveContext);
}

/**
 * Barra de abas própria.
 *
 * São poucas telas e todas irmãs — não vale carregar uma
 * biblioteca de navegação por enquanto.
 */
export function Tabs({ tabs, active, onChange }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        // Android desenha por baixo da barra de navegação.
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;

        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!selected) {
                tap();
                onChange(tab.key);
              }
            }}
            style={styles.tab}
          >
            {tab.icon ? (
              <Ionicons
                name={selected ? tab.icon : `${tab.icon}-outline`}
                size={22}
                color={selected ? theme.accent : theme.textDim}
              />
            ) : null}

            <Text style={[styles.label, selected && styles.labelActive]}>
              {tab.label}
            </Text>
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
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: theme.text,
  },
});
