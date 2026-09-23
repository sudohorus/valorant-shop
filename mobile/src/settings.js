// Preferências do app (idioma, notificações) em settings.json.
// Leitura síncrona para dar pra usar já na abertura do app.

import { File, Paths } from 'expo-file-system';

function settingsFile() {
  return new File(Paths.document, 'settings.json');
}

export function readSettings() {
  try {
    const file = settingsFile();

    return file.exists ? JSON.parse(file.textSync()) : {};
  } catch {
    return {};
  }
}

/** Mescla `changes` no que já está salvo. */
export function updateSettings(changes) {
  try {
    const file = settingsFile();

    if (!file.exists) {
      file.create();
    }

    file.write(JSON.stringify({ ...readSettings(), ...changes }));
  } catch (problem) {
    console.warn('Não consegui salvar as configurações:', problem?.message);
  }
}
