import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANGUAGES, useI18n } from '../i18n';
import { tap } from '../haptics';
import { theme } from '../theme';

/** Botões lado a lado para trocar o idioma do app. */
export function LanguagePicker() {
  const { lang, setLang } = useI18n();

  return (
    <View style={styles.row}>
      {LANGUAGES.map((language) => {
        const selected = language.code === lang;

        return (
          <Pressable
            key={language.code}
            onPress={() => {
              if (!selected) {
                tap();
                setLang(language.code);
              }
            }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {language.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
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
