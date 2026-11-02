// Carga datos cada vez que la pantalla toma foco, con estado de carga, error y recarga manual.
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(cargar);
  ref.current = cargar;

  const recargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await ref.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal');
    } finally {
      setCargando(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { recargar(); }, [recargar, ...deps]));
  return { datos, cargando, error, recargar };
}
