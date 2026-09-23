// Vibração curta de resposta ao toque. Falha silenciosa: em aparelho
// sem motor de vibração (ou emulador) simplesmente não faz nada.

import * as Haptics from 'expo-haptics';

/** Toques de navegação: aba, filtro, abrir algo. */
export function tap() {
  Haptics.selectionAsync().catch(() => {});
}

/** Ações que mudam algo: favoritar, ligar um ajuste. */
export function confirm() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
