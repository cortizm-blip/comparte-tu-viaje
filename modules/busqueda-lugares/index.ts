// Puente JS del módulo nativo BusquedaLugares (solo iOS); null cuando no está disponible (web, Expo Go).
import { requireOptionalNativeModule } from 'expo';

export type Lugar = { nombre: string; direccion: string | null; lat: number; lng: number };

type ModuloBusqueda = { buscarLugares(texto: string): Promise<Lugar[]> };

export default requireOptionalNativeModule<ModuloBusqueda>('BusquedaLugares');
