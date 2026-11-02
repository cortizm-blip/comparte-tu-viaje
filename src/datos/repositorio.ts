// Contrato de acceso a datos. Lo implementan Supabase (real) y la versión demo en memoria.
import type {
  CuentaCobro, EstadoPago, EstadoViaje, Inscripcion, NuevoViaje, Pasajero, Perfil, UbicacionConductor, Viaje,
} from './tipos';

export interface Repositorio {
  readonly esDemo: boolean;

  // Sesión y perfil del usuario actual.
  iniciarSesion(): Promise<Perfil | null>;
  guardarPerfil(datos: Omit<Perfil, 'id'>): Promise<Perfil>;
  guardarPushToken(token: string): Promise<void>;
  // Borra la cuenta y todos sus datos (Apple lo exige). Falla si maneja un viaje con pasajeros sin cancelar.
  eliminarCuenta(): Promise<void>;

  // Seguridad: reportar un viaje o una persona, y bloquear personas (oculta sus viajes).
  reportar(datos: { viajeId?: string; personaId?: string; motivo: string }): Promise<void>;
  bloquear(personaId: string): Promise<void>;
  desbloquear(personaId: string): Promise<void>;
  bloqueados(): Promise<string[]>;

  // Viajes.
  listarViajes(): Promise<Viaje[]>;
  obtenerViaje(id: string): Promise<Viaje | null>;
  publicarViaje(datos: NuevoViaje): Promise<string>;
  cambiarEstado(viajeId: string, estado: EstadoViaje): Promise<void>;
  misViajes(): Promise<{ comoPasajero: Viaje[]; comoConductor: Viaje[] }>;

  // Inscripción y seguimiento.
  miInscripcion(viajeId: string): Promise<Inscripcion | null>;
  inscribirse(viajeId: string, paraderoId: string | null): Promise<void>;
  cancelarInscripcion(viajeId: string): Promise<void>;
  sigoViaje(viajeId: string): Promise<boolean>;
  seguirViaje(viajeId: string, seguir: boolean): Promise<void>;
  pasajerosDelViaje(viajeId: string): Promise<Pasajero[]>;

  // Cobro y pagos (el dinero va directo a la cuenta del conductor).
  miCuentaCobro(): Promise<CuentaCobro | null>;
  guardarCuentaCobro(cuenta: CuentaCobro): Promise<CuentaCobro>;
  cuentaCobroDeViaje(viajeId: string): Promise<CuentaCobro | null>;
  miPago(viajeId: string): Promise<EstadoPago>;
  informarPago(viajeId: string): Promise<number>;
  confirmarPago(inscripcionId: string): Promise<void>;

  // Viaje en curso.
  actualizarUbicacion(viajeId: string, lat: number, lng: number): Promise<void>;
  ubicacionConductor(viajeId: string): Promise<UbicacionConductor | null>;

  // Solo en modo demo: suma un pasajero ficticio para ver bajar el precio.
  simularOtroPasajero?(viajeId: string): Promise<void>;
  // Solo en modo demo: pone el viaje en curso para probar el mapa y el pago como pasajero.
  simularDiaDelViaje?(viajeId: string): Promise<void>;
}
