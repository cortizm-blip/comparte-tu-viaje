// Indica si el permiso de ubicación ya está concedido, sin pedirlo (los mapas muestran la posición solo en ese caso).
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function usePermisoUbicacion(): boolean {
  const [concedido, setConcedido] = useState(false);
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((p) => setConcedido(p.granted)).catch(() => {});
  }, []);
  return concedido;
}
