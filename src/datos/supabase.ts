// Fuente de datos real sobre Supabase: tablas y funciones de supabase/migrations.
// La sesión es anónima en el MVP; el perfil guarda el nombre que el usuario escribe al entrar.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Repositorio } from './repositorio';
import type { CuentaCobro, EstadoPago, EstadoViaje, NuevoViaje, Paradero, Perfil, Viaje } from './tipos';

type FilaViaje = {
  id: string;
  conductor_id: string;
  origen: string;
  destino: string;
  sale_en: string;
  costo_total: number;
  cupos: number;
  inscritos: number;
  estado: EstadoViaje;
  notas: string | null;
};

type FilaCuenta = {
  id: string;
  titular: string;
  rut: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  email: string | null;
  link_pago: string | null;
};

const COLUMNAS_VIAJE = 'id, conductor_id, origen, destino, sale_en, costo_total, cupos, inscritos, estado, notas';

// Lanza el error de Supabase con su mensaje (las funciones SQL ya lo escriben en español).
function revisar<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

function aCuenta(f: FilaCuenta): CuentaCobro {
  return {
    id: f.id, titular: f.titular, rut: f.rut, banco: f.banco, tipoCuenta: f.tipo_cuenta,
    numeroCuenta: f.numero_cuenta, email: f.email, linkPago: f.link_pago,
  };
}

export class RepositorioSupabase implements Repositorio {
  readonly esDemo = false;
  private sb: SupabaseClient;
  private usuarioId: string | null = null;

  constructor(url: string, llave: string) {
    this.sb = createClient(url, llave, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }

  private get yo(): string {
    if (!this.usuarioId) throw new Error('Sesión no iniciada');
    return this.usuarioId;
  }

  async iniciarSesion(): Promise<Perfil | null> {
    let { data } = await this.sb.auth.getSession();
    if (!data.session) {
      const r = await this.sb.auth.signInAnonymously();
      if (r.error) throw new Error(r.error.message);
      data = { session: r.data.session! };
    }
    this.usuarioId = data.session!.user.id;
    const perfil = revisar(await this.sb.from('perfiles').select('id, nombre, auto, patente').eq('id', this.yo).maybeSingle());
    return perfil;
  }

  async guardarPerfil(datos: Omit<Perfil, 'id'>): Promise<Perfil> {
    return revisar(
      await this.sb.from('perfiles').upsert({ id: this.yo, ...datos }).select('id, nombre, auto, patente').single(),
    )!;
  }

  async guardarPushToken(token: string): Promise<void> {
    revisar(await this.sb.from('perfiles').update({ push_token: token }).eq('id', this.yo));
  }

  // Completa filas de la vista con paraderos y datos del conductor (dos consultas en vez de una por viaje).
  private async completar(filas: FilaViaje[]): Promise<Viaje[]> {
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.id);
    const conductores = [...new Set(filas.map((f) => f.conductor_id))];
    const [paraderos, perfiles] = await Promise.all([
      this.sb.from('paraderos').select('id, viaje_id, orden, nombre, tipo, lat, lng, minutos_desde_salida').in('viaje_id', ids).order('orden'),
      this.sb.from('perfiles').select('id, nombre, auto, patente').in('id', conductores),
    ]);
    const listaParaderos = revisar(paraderos) ?? [];
    const listaPerfiles = revisar(perfiles) ?? [];
    return filas.map((f) => {
      const c = listaPerfiles.find((p) => p.id === f.conductor_id);
      return {
        id: f.id,
        conductor: { id: f.conductor_id, nombre: c?.nombre ?? 'Conductor', auto: c?.auto ?? null, patente: c?.patente ?? null },
        origen: f.origen,
        destino: f.destino,
        saleEn: f.sale_en,
        costoTotal: f.costo_total,
        cupos: f.cupos,
        inscritos: f.inscritos,
        estado: f.estado,
        notas: f.notas,
        paraderos: listaParaderos
          .filter((p) => p.viaje_id === f.id)
          .map((p): Paradero => ({
            id: p.id, orden: p.orden, nombre: p.nombre, tipo: p.tipo, lat: p.lat, lng: p.lng,
            minutosDesdeSalida: p.minutos_desde_salida,
          })),
      };
    });
  }

  async listarViajes(): Promise<Viaje[]> {
    const filas = revisar(
      await this.sb.from('viajes_con_precio').select(COLUMNAS_VIAJE)
        .in('estado', ['esperando_pasajeros', 'confirmado'])
        .gt('sale_en', new Date().toISOString())
        .order('sale_en'),
    );
    return this.completar(filas ?? []);
  }

  async obtenerViaje(id: string): Promise<Viaje | null> {
    const fila = revisar(await this.sb.from('viajes_con_precio').select(COLUMNAS_VIAJE).eq('id', id).maybeSingle());
    return fila ? (await this.completar([fila]))[0] : null;
  }

  async publicarViaje(d: NuevoViaje): Promise<string> {
    return revisar(
      await this.sb.rpc('publicar_viaje', {
        p_origen: d.origen,
        p_destino: d.destino,
        p_sale_en: d.saleEn.toISOString(),
        p_costo_total: d.costoTotal,
        p_cupos: d.cupos,
        p_cuenta_cobro: d.cuentaCobroId,
        p_notas: d.notas,
        p_paraderos: d.paraderos.map((p) => ({
          nombre: p.nombre, tipo: p.tipo, lat: p.lat, lng: p.lng, minutos_desde_salida: p.minutosDesdeSalida,
        })),
      }),
    );
  }

  async cambiarEstado(viajeId: string, estado: EstadoViaje): Promise<void> {
    revisar(await this.sb.from('viajes').update({ estado }).eq('id', viajeId));
  }

  async misViajes() {
    const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const inscripciones = revisar(
      await this.sb.from('inscripciones').select('viaje_id').eq('pasajero_id', this.yo).eq('estado', 'activa'),
    ) ?? [];
    const [comoPasajero, comoConductor] = await Promise.all([
      inscripciones.length === 0
        ? Promise.resolve({ data: [] as FilaViaje[], error: null })
        : this.sb.from('viajes_con_precio').select(COLUMNAS_VIAJE)
            .in('id', inscripciones.map((i) => i.viaje_id)).gt('sale_en', desde).order('sale_en'),
      this.sb.from('viajes_con_precio').select(COLUMNAS_VIAJE)
        .eq('conductor_id', this.yo).gt('sale_en', desde).order('sale_en'),
    ]);
    return {
      comoPasajero: await this.completar(revisar(comoPasajero) ?? []),
      comoConductor: await this.completar(revisar(comoConductor) ?? []),
    };
  }

  async miInscripcion(viajeId: string) {
    const f = revisar(
      await this.sb.from('inscripciones').select('id, viaje_id, paradero_id')
        .eq('viaje_id', viajeId).eq('pasajero_id', this.yo).eq('estado', 'activa').maybeSingle(),
    );
    return f ? { id: f.id, viajeId: f.viaje_id, paraderoId: f.paradero_id } : null;
  }

  async inscribirse(viajeId: string, paraderoId: string | null): Promise<void> {
    revisar(await this.sb.rpc('inscribirse', { p_viaje: viajeId, p_paradero: paraderoId }));
  }

  async cancelarInscripcion(viajeId: string): Promise<void> {
    revisar(
      await this.sb.from('inscripciones').update({ estado: 'cancelada' })
        .eq('viaje_id', viajeId).eq('pasajero_id', this.yo),
    );
  }

  async sigoViaje(viajeId: string): Promise<boolean> {
    const f = revisar(
      await this.sb.from('seguidores_viaje').select('viaje_id').eq('viaje_id', viajeId).eq('usuario_id', this.yo).maybeSingle(),
    );
    return !!f;
  }

  async seguirViaje(viajeId: string, seguir: boolean): Promise<void> {
    const tabla = this.sb.from('seguidores_viaje');
    revisar(
      seguir
        ? await tabla.upsert({ viaje_id: viajeId, usuario_id: this.yo })
        : await tabla.delete().eq('viaje_id', viajeId).eq('usuario_id', this.yo),
    );
  }

  async pasajerosDelViaje(viajeId: string) {
    const filas = revisar(
      await this.sb.from('inscripciones')
        .select('id, pasajero_id, paraderos(nombre), pagos(estado)')
        .eq('viaje_id', viajeId).eq('estado', 'activa').order('creado_en'),
    ) ?? [];
    const nombres = revisar(
      await this.sb.from('perfiles').select('id, nombre').in('id', filas.map((f) => f.pasajero_id)),
    ) ?? [];
    return filas.map((f) => {
      const paradero = f.paraderos as unknown as { nombre: string } | null;
      const pago = f.pagos as unknown as { estado: EstadoPago } | { estado: EstadoPago }[] | null;
      const estado = Array.isArray(pago) ? pago[0]?.estado : pago?.estado;
      return {
        inscripcionId: f.id,
        nombre: nombres.find((n) => n.id === f.pasajero_id)?.nombre ?? 'Pasajero',
        paradero: paradero?.nombre ?? null,
        pago: estado ?? 'pendiente',
      };
    });
  }

  async miCuentaCobro(): Promise<CuentaCobro | null> {
    const f = revisar(
      await this.sb.from('cuentas_cobro').select('*').eq('conductor_id', this.yo)
        .order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    );
    return f ? aCuenta(f) : null;
  }

  async guardarCuentaCobro(c: CuentaCobro): Promise<CuentaCobro> {
    const fila = {
      conductor_id: this.yo, titular: c.titular, rut: c.rut, banco: c.banco, tipo_cuenta: c.tipoCuenta,
      numero_cuenta: c.numeroCuenta, email: c.email, link_pago: c.linkPago,
    };
    const r = c.id
      ? await this.sb.from('cuentas_cobro').update(fila).eq('id', c.id).select('*').single()
      : await this.sb.from('cuentas_cobro').insert(fila).select('*').single();
    return aCuenta(revisar(r));
  }

  async cuentaCobroDeViaje(viajeId: string): Promise<CuentaCobro | null> {
    const v = revisar(await this.sb.from('viajes').select('cuenta_cobro_id').eq('id', viajeId).maybeSingle());
    if (!v?.cuenta_cobro_id) return null;
    const f = revisar(await this.sb.from('cuentas_cobro').select('*').eq('id', v.cuenta_cobro_id).maybeSingle());
    return f ? aCuenta(f) : null;
  }

  async miPago(viajeId: string): Promise<EstadoPago> {
    const insc = await this.miInscripcion(viajeId);
    if (!insc) return 'pendiente';
    const f = revisar(await this.sb.from('pagos').select('estado').eq('inscripcion_id', insc.id).maybeSingle());
    return f?.estado ?? 'pendiente';
  }

  async informarPago(viajeId: string): Promise<number> {
    return revisar(await this.sb.rpc('informar_pago', { p_viaje: viajeId }));
  }

  async confirmarPago(inscripcionId: string): Promise<void> {
    revisar(await this.sb.rpc('confirmar_pago', { p_inscripcion: inscripcionId }));
  }

  async actualizarUbicacion(viajeId: string, lat: number, lng: number): Promise<void> {
    revisar(await this.sb.rpc('actualizar_ubicacion', { p_viaje: viajeId, p_lat: lat, p_lng: lng }));
  }

  async ubicacionConductor(viajeId: string) {
    const f = revisar(
      await this.sb.from('ubicaciones_conductor').select('lat, lng, actualizado_en').eq('viaje_id', viajeId).maybeSingle(),
    );
    return f ? { lat: f.lat, lng: f.lng, actualizadoEn: f.actualizado_en } : null;
  }
}
