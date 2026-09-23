// Wishlist persistida com expo-file-system.
// Evita o problema do AsyncStorage com native module null.
// Usa a API nova (File/Paths): os métodos antigos (getInfoAsync,
// writeAsStringAsync...) agora lançam erro em runtime.

import { File, Paths } from 'expo-file-system';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const WishlistContext = createContext(null);

function wishlistFile() {
  return new File(Paths.document, 'wishlist.json');
}

async function readFile() {
  try {
    const file = wishlistFile();

    if (!file.exists) {
      return [];
    }

    const list = JSON.parse(await file.text());

    return Array.isArray(list) ? list : [];
  } catch (problem) {
    console.warn('Não consegui ler a lista de desejos:', problem?.message);

    return [];
  }
}

function writeFile(list) {
  try {
    const file = wishlistFile();

    if (!file.exists) {
      file.create();
    }

    file.write(JSON.stringify(list));
  } catch (problem) {
    console.warn('Não consegui salvar a lista de desejos:', problem?.message);
  }
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readFile().then((list) => {
      setWishlist(new Set(list));
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next) => {
    writeFile(Array.from(next));
  }, []);

  const add = useCallback((uuid) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.add(uuid.toLowerCase());
      persist(next);
      return next;
    });
  }, [persist]);

  const remove = useCallback((uuid) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.delete(uuid.toLowerCase());
      persist(next);
      return next;
    });
  }, [persist]);

  const has = useCallback((uuid) => {
    return wishlist.has(uuid.toLowerCase());
  }, [wishlist]);

  const getAll = useCallback(() => {
    return Array.from(wishlist);
  }, [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, loaded, add, remove, has, getAll }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error('useWishlist deve ser usado dentro de um WishlistProvider');
  }

  return context;
}
