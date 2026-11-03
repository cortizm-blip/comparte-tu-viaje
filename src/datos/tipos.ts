// Tipos que comparten las pantallas y las fuentes de datos (Supabase o demo).
export type EstadoViaje = 'esperando_pasajeros' | 'confirmado' | 'en_curso' | 'terminado' | 'cancelado';
export type TipoParadero = 'metro' | 'punto_fijo';
export type EstadoPago = 'pendiente' | 'informado' | 'confirmado';

export type Coordenada = { lat: number; lng: number };

export type Paradero = Coordenada & {
  id: string;
  orden: number;
  nombre: string;
  tipo: TipoParadero;
  minutosDesdeSalida: number;
};

export type Conductor = { id: string; nombre: string; auto: string | null; patente: string | null };

export type Viaje = {
  id: string;
  conductor: Conductor;
  origen: string;
  destino: string;
  // Ubicación del destino; null en viajes publicados antes de guardarla.
  destinoUbicacion: Coordenada | null;
  saleEn: string;
  costoTotal: number;
  cupos: number;
  inscritos: number;
  estado: EstadoViaje;
  paraderos: Paradero[];
  notas: string | null;
};

export type Inscripcion = { id: string; viajeId: string; paraderoId: string | null };

export type Pasajero = {
  inscripcionId: string;
  nombre: string;
  paradero: string | null;
  pago: EstadoPago;
};

export type CuentaCobro = {
  id?: string;
  titular: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  email: string | null;
  linkPago: string | null;
};

export type Perfil = { id: string; nombre: string; auto: string | null; patente: string | null };

export type UbicacionConductor = Coordenada & { actualizadoEn: string };

export type NuevoParadero = Omit<Paradero, 'id' | 'orden'>;

export type NuevoViaje = {
  origen: string;
  destino: string;
  destinoUbicacion?: Coordenada | null;
  saleEn: Date;
  costoTotal: number;
  cupos: number;
  cuentaCobroId: string | null;
  paraderos: NuevoParadero[];
  notas: string | null;
};
