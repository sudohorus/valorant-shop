// Preview de skin aberto de qualquer tela (loja, mercado noturno,
// bundles, lista de desejos) via useSkinPreview().openSkin(id).

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal } from 'react-native';

import { tap } from './haptics';
import { SkinPreviewScreen } from './screens/SkinPreviewScreen';

const SkinPreviewContext = createContext(null);

export function SkinPreviewProvider({ children }) {
  // { id, extra: { price, owned } } da skin aberta, ou null.
  const [open, setOpen] = useState(null);

  const openSkin = useCallback((id, extra = {}) => {
    if (id) {
      tap();
      setOpen({ id, extra });
    }
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const value = useMemo(() => ({ openSkin }), [openSkin]);

  return (
    <SkinPreviewContext.Provider value={value}>
      {children}

      <Modal
        visible={open !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        // Botão voltar do Android fecha o preview.
        onRequestClose={close}
      >
        {open ? <SkinPreviewScreen skinId={open.id} extra={open.extra} onClose={close} /> : null}
      </Modal>
    </SkinPreviewContext.Provider>
  );
}

export function useSkinPreview() {
  const value = useContext(SkinPreviewContext);

  if (!value) {
    throw new Error('useSkinPreview precisa estar dentro de <SkinPreviewProvider>.');
  }

  return value;
}
