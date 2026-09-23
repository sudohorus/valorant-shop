// Placeholders pulsando no formato do conteúdo que está carregando.

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { theme } from '../theme';

function usePulse() {
  const value = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [value]);

  return value;
}

export function Bone({ style }) {
  return <View style={[styles.bone, style]} />;
}

function Header() {
  return (
    <View style={styles.header}>
      <Bone style={styles.title} />
      <Bone style={styles.subtitle} />
    </View>
  );
}

const LAYOUTS = {
  // Loja: carteira + cards grandes.
  cards: () => (
    <>
      <Header />
      <View style={styles.padded}>
        <Bone style={styles.wallet} />
        {[0, 1, 2].map((i) => (
          <Bone key={i} style={styles.bigCard} />
        ))}
      </View>
    </>
  ),

  // Lista de desejos / partidas: linhas com miniatura.
  rows: () => (
    <>
      <Header />
      <View style={styles.padded}>
        <Bone style={styles.input} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.row}>
            <Bone style={styles.thumb} />
            <View style={styles.rowText}>
              <Bone style={styles.lineLong} />
              <Bone style={styles.lineShort} />
            </View>
          </View>
        ))}
      </View>
    </>
  ),

  // Só as linhas, para áreas que já têm cabeçalho (partidas).
  list: () => (
    <View style={styles.padded}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.row}>
          <Bone style={styles.thumb} />
          <View style={styles.rowText}>
            <Bone style={styles.lineLong} />
            <Bone style={styles.lineShort} />
          </View>
        </View>
      ))}
    </View>
  ),

  // Coleção: grade de 2 colunas.
  grid: () => (
    <>
      <Header />
      <View style={styles.padded}>
        <Bone style={styles.chips} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.gridRow}>
            <Bone style={styles.gridCard} />
            <Bone style={styles.gridCard} />
          </View>
        ))}
      </View>
    </>
  ),

  // Perfil: banner, avatar e blocos.
  profile: () => (
    <>
      <Bone style={styles.banner} />
      <View style={styles.padded}>
        <View style={styles.identity}>
          <Bone style={styles.avatar} />
          <View style={styles.rowText}>
            <Bone style={styles.lineLong} />
            <Bone style={styles.lineShort} />
          </View>
        </View>
        <Bone style={styles.rankCard} />
        <View style={styles.gridRow}>
          <Bone style={styles.stat} />
          <Bone style={styles.stat} />
        </View>
        <View style={styles.gridRow}>
          <Bone style={styles.stat} />
          <Bone style={styles.stat} />
        </View>
      </View>
    </>
  ),
};

/** Tela inteira de esqueleto. `variant`: cards | rows | grid | profile. */
export function SkeletonScreen({ variant = 'rows' }) {
  const opacity = usePulse();
  const Layout = LAYOUTS[variant] || LAYOUTS.rows;

  return (
    <Animated.View style={[styles.screen, { opacity }]}>
      <Layout />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bone: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 10,
  },
  header: {
    paddingHorizontal: theme.gap,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  title: {
    width: '45%',
    height: 30,
  },
  subtitle: {
    width: '60%',
    height: 12,
  },
  padded: {
    paddingHorizontal: theme.gap,
    gap: 12,
  },
  wallet: {
    height: 40,
    borderRadius: 999,
  },
  bigCard: {
    height: 190,
    borderRadius: theme.radius,
  },
  input: {
    height: 46,
    borderRadius: theme.radius,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 44,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
  lineLong: {
    width: '70%',
    height: 13,
  },
  lineShort: {
    width: '40%',
    height: 11,
  },
  chips: {
    height: 34,
    width: '80%',
    borderRadius: 999,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    height: 120,
    borderRadius: theme.radius,
  },
  banner: {
    height: 200,
    borderRadius: 0,
    marginBottom: theme.gap,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  rankCard: {
    height: 88,
    borderRadius: theme.radius,
  },
  stat: {
    flex: 1,
    height: 70,
    borderRadius: theme.radius,
  },
});
