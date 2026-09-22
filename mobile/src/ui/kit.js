import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function Screen({ title, subtitle, children }) {
  return (
    <View style={styles.screen}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>

          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}

      {children}
    </View>
  );
}

export function Loading({ label }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.accent} />
      {label ? <Text style={styles.dim}>{label}</Text> : null}
    </View>
  );
}

export function Message({ title, body, actionLabel, onAction }) {
  return (
    <View style={styles.center}>
      {title ? <Text style={styles.messageTitle}>{title}</Text> : null}

      <Text style={styles.dim}>{body}</Text>

      {onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function Button({ label, onPress, tone = 'accent' }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'ghost' && styles.buttonGhost,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'ghost' && styles.ghostLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.gap,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.textDim,
    fontSize: 13,
    marginTop: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  dim: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageTitle: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '700',
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 14,
  },
  ghostLabel: {
    color: theme.textDim,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 16,
  },
  rowValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
