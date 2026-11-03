// Sesión del usuario: inicia sesión al abrir la app y guarda el perfil para todas las pantallas.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo, type Perfil } from './datos';
import { registrarPush } from './notificaciones';

type Sesion = {
  cargando: boolean;
  error: string | null;
  perfil: Perfil | null;
  guardarPerfil: (datos: Omit<Perfil, 'id'>) => Promise<void>;
  eliminarCuenta: () => Promise<void>;
  reintentar: () => void;
};

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  // Inicia sesión y, si ya hay perfil, registra el token push.
  const iniciar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const p = await repo.iniciarSesion();
      setPerfil(p);
      if (p) registrarPush().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  const guardarPerfil = useCallback(async (datos: Omit<Perfil, 'id'>) => {
    const p = await repo.guardarPerfil(datos);
    setPerfil(p);
    registrarPush().catch(() => {});
  }, []);

  // Borra la cuenta y abre una sesión anónima nueva, que vuelve a la bienvenida.
  const eliminarCuenta = useCallback(async () => {
    await repo.eliminarCuenta();
    setPerfil(null);
    await iniciar();
  }, [iniciar]);

  return (
    <Contexto.Provider value={{ cargando, error, perfil, guardarPerfil, eliminarCuenta, reintentar: iniciar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSesion(): Sesion {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSesion fuera de ProveedorSesion');
  return s;
}
