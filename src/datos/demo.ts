// Fuente de datos de ejemplo en memoria, para probar la app en Expo Go sin backend.
// Usa la misma lógica de precio que la base y simula que el conductor avanza por los paraderos.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { precioPorPersona } from '../lib/precio';
import type { Repositorio } from './repositorio';
import type { CuentaCobro, EstadoPago, EstadoViaje, Inscripcion, NuevoViaje, Perfil, Viaje } from './tipos';

const YO = 'yo';
const CLAVE_PERFIL = 'demo.perfil';

// Fecha de mañana a la hora indicada.
function manana(hora: number, minuto: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

function viajesDeEjemplo(): Viaje[] {
  return [
    {
      id: 'v1', origen: 'Maipú', destino: 'Metro Los Leones', saleEn: manana(7, 30), costoTotal: 10000, cupos: 4,
      inscritos: 2, estado: 'esperando_pasajeros', notas: null,
      conductor: { id: 'c1', nombre: 'Camila R.', auto: 'Toyota Yaris gris', patente: 'RTKP·42' },
      paraderos: [
        { id: 'p1', orden: 1, nombre: 'Metro Plaza de Maipú', tipo: 'metro', lat: -33.511, lng: -70.7576, minutosDesdeSalida: 0 },
        { id: 'p2', orden: 2, nombre: 'Metro Las Rejas', tipo: 'metro', lat: -33.4573, lng: -70.7065, minutosDesdeSalida: 22 },
        { id: 'p3', orden: 3, nombre: 'Metro Los Leones', tipo: 'metro', lat: -33.4223, lng: -70.6087, minutosDesdeSalida: 50 },
      ],
    },
    {
      id: 'v2', origen: 'La Florida', destino: 'Campus San Joaquín', saleEn: manana(8, 0), costoTotal: 12000, cupos: 3,
      inscritos: 1, estado: 'esperando_pasajeros', notas: null,
      conductor: { id: 'c2', nombre: 'Diego M.', auto: 'Kia Morning blanco', patente: 'LJRS·18' },
      paraderos: [
        { id: 'p4', orden: 1, nombre: 'Metro Bellavista de La Florida', tipo: 'metro', lat: -33.5196, lng: -70.5986, minutosDesdeSalida: 0 },
        { id: 'p5', orden: 2, nombre: 'Campus San Joaquín', tipo: 'punto_fijo', lat: -33.4985, lng: -70.6145, minutosDesdeSalida: 20 },
      ],
    },
    {
      id: 'v3', origen: 'Ñuñoa', destino: 'Las Condes', saleEn: manana(8, 15), costoTotal: 0, cupos: 3,
      inscritos: 1, estado: 'esperando_pasajeros', notas: 'Voy igual a la oficina, súbete gratis.',
      conductor: { id: 'c3', nombre: 'Valentina S.', auto: 'Suzuki Swift rojo', patente: 'KXPD·71' },
      paraderos: [
        { id: 'p6', orden: 1, nombre: 'Plaza Ñuñoa', tipo: 'punto_fijo', lat: -33.4565, lng: -70.5975, minutosDesdeSalida: 0 },
        { id: 'p7', orden: 2, nombre: 'Metro Escuela Militar', tipo: 'metro', lat: -33.4137, lng: -70.5835, minutosDesdeSalida: 18 },
      ],
    },
  ];
}

const CUENTA_EJEMPLO: CuentaCobro = {
  id: 'cc1', titular: 'Camila R. (ejemplo)', rut: '11.111.111-1', banco: 'Banco de ejemplo',
  tipoCuenta: 'Cuenta vista', numeroCuenta: '0000 1111', email: 'camila@ejemplo.cl', linkPago: null,
};

const espera = () => new Promise((r) => setTimeout(r, 150));

export class RepositorioDemo implements Repositorio {
  readonly esDemo = true;
  private viajes = viajesDeEjemplo();
  private inscripciones: (Inscripcion & { pasajeroId: string; pago: EstadoPago })[] = [];
  private seguidos = new Set<string>();
  private cuentas = new Map<string, CuentaCobro>([['c1', CUENTA_EJEMPLO]]);
  private cuentaPorViaje = new Map<string, string>([['v1', 'c1'], ['v2', 'c1']]);
  private inicioEnCurso = new Map<string, number>();
  private perfil: Perfil | null = null;
  private bloqueadas = new Set<string>();

  private copia = (v: Viaje): Viaje => ({ ...v, paraderos: v.paraderos.map((p) => ({ ...p })) });
  private buscar(id: string): Viaje {
    const v = this.viajes.find((x) => x.id === id);
    if (!v) throw new Error('Viaje no existe');
    return v;
  }

  async iniciarSesion() {
    try {
      const guardado = await AsyncStorage.getItem(CLAVE_PERFIL);
      this.perfil = guardado ? JSON.parse(guardado) : null;
    } catch {
      this.perfil = null;
    }
    return this.perfil;
  }

  async guardarPerfil(datos: Omit<Perfil, 'id'>) {
    this.perfil = { id: YO, ...datos };
    await AsyncStorage.setItem(CLAVE_PERFIL, JSON.stringify(this.perfil)).catch(() => {});
    return this.perfil;
  }

  async guardarPushToken() {}

  async eliminarCuenta() {
    await espera();
    if (this.viajes.some((v) => v.conductor.id === YO && ['esperando_pasajeros', 'confirmado', 'en_curso'].includes(v.estado) && v.inscritos > 0)) {
      throw new Error('Cancela o termina tus viajes con pasajeros antes de eliminar tu cuenta');
    }
    this.viajes = this.viajes.filter((v) => v.conductor.id !== YO);
    this.inscripciones = this.inscripciones.filter((i) => i.pasajeroId !== YO);
    this.perfil = null;
    await AsyncStorage.removeItem(CLAVE_PERFIL).catch(() => {});
  }

  async reportar(d: { viajeId?: string; personaId?: string; motivo: string }) {
    await espera();
    if (!d.motivo.trim()) throw new Error('Cuéntanos el motivo');
  }

  async bloquear(personaId: string) {
    this.bloqueadas.add(personaId);
  }

  async desbloquear(personaId: string) {
    this.bloqueadas.delete(personaId);
  }

  async bloqueados() {
    return [...this.bloqueadas];
  }

  async listarViajes() {
    await espera();
    const ahora = Date.now();
    return this.viajes
      .filter((v) => ['esperando_pasajeros', 'confirmado'].includes(v.estado) && Date.parse(v.saleEn) > ahora)
      .filter((v) => !this.bloqueadas.has(v.conductor.id))
      .sort((a, b) => a.saleEn.localeCompare(b.saleEn))
      .map(this.copia);
  }

  async obtenerViaje(id: string) {
    await espera();
    const v = this.viajes.find((x) => x.id === id);
    return v ? this.copia(v) : null;
  }

  // Valida igual que publicar_viaje en la base.
  async publicarViaje(d: NuevoViaje) {
    if (d.saleEn.getTime() <= Date.now()) throw new Error('La salida debe ser en el futuro');
    if (d.costoTotal > 0 && !d.cuentaCobroId) throw new Error('Agrega una cuenta de cobro para viajes pagados');
    if (d.paraderos.length === 0) throw new Error('Agrega al menos un paradero');
    const id = `v${Date.now()}`;
    this.viajes.push({
      id, origen: d.origen, destino: d.destino, saleEn: d.saleEn.toISOString(), costoTotal: d.costoTotal,
      cupos: d.cupos, inscritos: 0, estado: 'esperando_pasajeros', notas: d.notas,
      conductor: { id: YO, nombre: this.perfil?.nombre ?? 'Tú', auto: this.perfil?.auto ?? null, patente: this.perfil?.patente ?? null },
      paraderos: d.paraderos.map((p, i) => ({ ...p, id: `${id}-p${i}`, orden: i + 1 })),
    });
    if (d.cuentaCobroId) this.cuentaPorViaje.set(id, YO);
    return id;
  }

  async cambiarEstado(viajeId: string, estado: EstadoViaje) {
    this.buscar(viajeId).estado = estado;
    if (estado === 'en_curso') this.inicioEnCurso.set(viajeId, Date.now());
  }

  async misViajes() {
    await espera();
    const mios = new Set(this.inscripciones.filter((i) => i.pasajeroId === YO).map((i) => i.viajeId));
    return {
      comoPasajero: this.viajes.filter((v) => mios.has(v.id)).map(this.copia),
      comoConductor: this.viajes.filter((v) => v.conductor.id === YO).map(this.copia),
    };
  }

  async miInscripcion(viajeId: string) {
    const i = this.inscripciones.find((x) => x.viajeId === viajeId && x.pasajeroId === YO);
    return i ? { id: i.id, viajeId: i.viajeId, paraderoId: i.paraderoId } : null;
  }

  // Igual que inscribirse() en la base: revisa estado, cupos y que no sea el propio viaje.
  async inscribirse(viajeId: string, paraderoId: string | null) {
    await espera();
    const v = this.buscar(viajeId);
    if (v.conductor.id === YO) throw new Error('No puedes inscribirte en tu propio viaje');
    if (await this.miInscripcion(viajeId)) throw new Error('Ya estás inscrito en este viaje');
    if (v.inscritos >= v.cupos) throw new Error('No quedan cupos');
    v.inscritos += 1;
    this.inscripciones.push({ id: `i${Date.now()}`, viajeId, paraderoId, pasajeroId: YO, pago: 'pendiente' });
  }

  async simularOtroPasajero(viajeId: string) {
    const v = this.buscar(viajeId);
    if (v.inscritos >= v.cupos) throw new Error('No quedan cupos');
    v.inscritos += 1;
  }

  async simularDiaDelViaje(viajeId: string) {
    await this.cambiarEstado(viajeId, 'en_curso');
  }

  async cancelarInscripcion(viajeId: string) {
    const antes = this.inscripciones.length;
    this.inscripciones = this.inscripciones.filter((x) => !(x.viajeId === viajeId && x.pasajeroId === YO));
    if (this.inscripciones.length < antes) this.buscar(viajeId).inscritos -= 1;
  }

  async sigoViaje(viajeId: string) {
    return this.seguidos.has(viajeId);
  }

  async seguirViaje(viajeId: string, seguir: boolean) {
    if (seguir) this.seguidos.add(viajeId);
    else this.seguidos.delete(viajeId);
  }

  async pasajerosDelViaje(viajeId: string) {
    const v = this.buscar(viajeId);
    return this.inscripciones
      .filter((i) => i.viajeId === viajeId)
      .map((i) => ({
        inscripcionId: i.id,
        nombre: i.pasajeroId === YO ? (this.perfil?.nombre ?? 'Tú') : 'Pasajero',
        paradero: v.paraderos.find((p) => p.id === i.paraderoId)?.nombre ?? null,
        pago: i.pago,
      }));
  }

  async miCuentaCobro() {
    return this.cuentas.get(YO) ?? null;
  }

  async guardarCuentaCobro(c: CuentaCobro) {
    const guardada = { ...c, id: c.id ?? `cc${Date.now()}` };
    this.cuentas.set(YO, guardada);
    return guardada;
  }

  async cuentaCobroDeViaje(viajeId: string) {
    const dueno = this.cuentaPorViaje.get(viajeId);
    return dueno ? (this.cuentas.get(dueno) ?? null) : null;
  }

  async miPago(viajeId: string) {
    return this.inscripciones.find((x) => x.viajeId === viajeId && x.pasajeroId === YO)?.pago ?? 'pendiente';
  }

  async informarPago(viajeId: string) {
    const i = this.inscripciones.find((x) => x.viajeId === viajeId && x.pasajeroId === YO);
    if (!i) throw new Error('No estás inscrito en este viaje');
    if (i.pago === 'pendiente') i.pago = 'informado';
    const v = this.buscar(viajeId);
    return precioPorPersona(v.costoTotal, v.inscritos);
  }

  async confirmarPago(inscripcionId: string) {
    const i = this.inscripciones.find((x) => x.id === inscripcionId);
    if (!i || i.pago !== 'informado') throw new Error('No hay un pago informado que puedas confirmar');
    i.pago = 'confirmado';
  }

  async actualizarUbicacion() {}

  // Simula al conductor avanzando del primer al último paradero en 2 minutos.
  async ubicacionConductor(viajeId: string) {
    const v = this.buscar(viajeId);
    if (!this.inicioEnCurso.has(viajeId)) this.inicioEnCurso.set(viajeId, Date.now());
    const avance = Math.min((Date.now() - this.inicioEnCurso.get(viajeId)!) / 120000, 1);
    const tramos = v.paraderos.length - 1;
    if (tramos < 1) return { lat: v.paraderos[0].lat, lng: v.paraderos[0].lng, actualizadoEn: new Date().toISOString() };
    const k = Math.min(Math.floor(avance * tramos), tramos - 1);
    const t = avance * tramos - k;
    const a = v.paraderos[k];
    const b = v.paraderos[k + 1];
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, actualizadoEn: new Date().toISOString() };
  }
}
