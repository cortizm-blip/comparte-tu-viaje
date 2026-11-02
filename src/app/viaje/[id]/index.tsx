// Detalle del viaje: precio de hoy, escala de precios, paraderos y conductor.
// Según quién mira muestra inscribirse, la inscripción propia o el panel del conductor.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Estado, InsigniaEstado, s, Subtitulo, Tarjeta } from '../../../componentes/basicos';
import { EscalaPrecios, ListaParaderos, MapaViaje, Ruta } from '../../../componentes/viaje';
import { repo, type EstadoViaje, type Viaje } from '../../../datos';
import { diaYHora, hora, sumarMinutos } from '../../../lib/fechas';
import { formatoCLP, precioPorPersona } from '../../../lib/precio';
import { useSesion } from '../../../sesion';
import { color, espacio } from '../../../tema';
import { useCarga } from '../../../useCarga';

export default function DetalleViaje() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSesion();
  const abajo = useSafeAreaInsets().bottom;
  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [viaje, inscripcion, sigo] = await Promise.all([repo.obtenerViaje(id), repo.miInscripcion(id), repo.sigoViaje(id)]);
    return { viaje, inscripcion, sigo };
  }, [id]);
  const [paradero, setParadero] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!datos?.viaje) {
    return <Estado cargando={cargando} error={error ?? (datos ? 'Este viaje ya no existe.' : null)} onReintentar={recargar} />;
  }
  const { viaje, inscripcion, sigo } = datos;
  const soyConductor = viaje.conductor.id === perfil?.id;
  const elegido = inscripcion?.paraderoId ?? paradero;
  const ultimo = viaje.paraderos[viaje.paraderos.length - 1];

  // Ejecuta una acción mostrando el error en una alerta y recarga al terminar.
  async function hacer(accion: () => Promise<void>) {
    setOcupado(true);
    try {
      await accion();
      await recargar();
    } catch (e) {
      Alert.alert('No se pudo completar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + abajo }}>
        <MapaViaje paraderos={viaje.paraderos} elegido={elegido} alto={220} />
        <View style={{ padding: espacio.l, gap: espacio.m }}>
          <View style={{ gap: 4 }}>
            <Ruta viaje={viaje} tamano={22} />
            <Text style={s.textoSuave}>
              {diaYHora(viaje.saleEn)}
              {ultimo ? ` · llega ${hora(sumarMinutos(viaje.saleEn, ultimo.minutosDesdeSalida))}` : ''}
            </Text>
            <InsigniaEstado estado={viaje.estado} />
          </View>

          <Precio viaje={viaje} />

          <Subtitulo derecha={<Text style={s.textoSuave}>{inscripcion || soyConductor ? '' : 'Elige dónde subir'}</Text>}>
            Paraderos
          </Subtitulo>
          <ListaParaderos viaje={viaje} elegido={elegido} onElegir={!inscripcion && !soyConductor ? setParadero : undefined} />

          <Subtitulo>Conductor</Subtitulo>
          <Tarjeta estilo={[s.fila, { gap: espacio.m }]}>
            <Ionicons name="person-circle" size={44} color={color.primario} />
            <View style={{ flex: 1 }}>
              <Text style={[s.texto, { fontWeight: '600' }]}>{viaje.conductor.nombre}{soyConductor ? ' (tú)' : ''}</Text>
              <Text style={s.textoSuave}>{viaje.conductor.auto ?? 'Auto sin informar'}</Text>
            </View>
            {viaje.conductor.patente && <Text style={{ fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6 }}>{viaje.conductor.patente}</Text>}
          </Tarjeta>
          {viaje.notas && <Text style={s.texto}>{viaje.notas}</Text>}

          {soyConductor && <PanelConductor viaje={viaje} />}

          {!inscripcion && !soyConductor && (
            <View style={[s.fila, { justifyContent: 'space-between', marginTop: espacio.s }]}>
              <Text style={s.texto}>Avisarme si baja el precio</Text>
              <Switch value={sigo} onValueChange={(v) => hacer(() => repo.seguirViaje(viaje.id, v))} trackColor={{ true: color.primario }} />
            </View>
          )}
          {repo.simularDiaDelViaje && inscripcion && viaje.estado !== 'en_curso' && viaje.estado !== 'terminado' && (
            <Boton titulo="Simular el día del viaje" variante="secundario"
              onPress={() => hacer(async () => {
                await repo.simularDiaDelViaje!(viaje.id);
                router.push(`/viaje/${viaje.id}/en-curso`);
              })} />
          )}
          {repo.simularOtroPasajero && viaje.inscritos < viaje.cupos && (
            <Boton titulo="Simular: se inscribe otra persona" variante="secundario"
              onPress={() => hacer(() => repo.simularOtroPasajero!(viaje.id))} />
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: espacio.l, paddingBottom: abajo + espacio.s, backgroundColor: color.fondo, gap: espacio.s }}>
        {soyConductor ? (
          <AccionesConductor viaje={viaje} ocupado={ocupado} hacer={hacer} />
        ) : inscripcion ? (
          <AccionesInscrito viaje={viaje} ocupado={ocupado} hacer={hacer} />
        ) : (
          <Boton
            titulo={viaje.inscritos >= viaje.cupos ? 'Viaje completo' : `Inscribirme · pagarías ${formatoCLP(precioPorPersona(viaje.costoTotal, viaje.inscritos + 1))}`}
            deshabilitado={viaje.inscritos >= viaje.cupos || (viaje.paraderos.length > 1 && !paradero)}
            cargando={ocupado}
            onPress={() => hacer(async () => {
              await repo.inscribirse(viaje.id, paradero ?? viaje.paraderos[0]?.id ?? null);
              router.replace(`/viaje/${viaje.id}/inscrito`);
            })}
          />
        )}
      </View>
    </View>
  );
}

function Precio({ viaje }: { viaje: Viaje }) {
  if (viaje.costoTotal === 0) {
    return (
      <Tarjeta>
        <Text style={{ fontSize: 34, fontWeight: '800', color: color.primario }}>Gratis</Text>
        <Text style={s.textoSuave}>{viaje.inscritos} de {viaje.cupos} inscritos</Text>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta estilo={{ gap: espacio.m }}>
      <View style={[s.fila, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View>
          <Text style={s.textoSuave}>Precio hoy por persona</Text>
          <Text style={{ fontSize: 38, fontWeight: '800', color: color.texto }}>
            {formatoCLP(precioPorPersona(viaje.costoTotal, viaje.inscritos))}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.textoSuave}>{viaje.inscritos} de {viaje.cupos} inscritos</Text>
          <Text style={s.textoSuave}>Costo total {formatoCLP(viaje.costoTotal)}</Text>
        </View>
      </View>
      <EscalaPrecios costoTotal={viaje.costoTotal} cupos={viaje.cupos} actual={viaje.inscritos} />
    </Tarjeta>
  );
}

type PropsAcciones = { viaje: Viaje; ocupado: boolean; hacer: (a: () => Promise<void>) => Promise<void> };

function AccionesInscrito({ viaje, ocupado, hacer }: PropsAcciones) {
  const enCurso = viaje.estado === 'en_curso';
  const terminado = viaje.estado === 'terminado';
  return (
    <>
      {enCurso && <Boton titulo="Ver viaje en curso" onPress={() => router.push(`/viaje/${viaje.id}/en-curso`)} />}
      {(enCurso || terminado) && viaje.costoTotal > 0 && (
        <Boton titulo="Pagar al conductor" variante={enCurso ? 'secundario' : 'primario'} onPress={() => router.push(`/viaje/${viaje.id}/pago`)} />
      )}
      {!enCurso && !terminado && (
        <Boton titulo="Cancelar mi inscripción" variante="secundario" cargando={ocupado}
          onPress={() => Alert.alert('¿Cancelar tu inscripción?', 'El precio subirá para el resto.', [
            { text: 'Volver', style: 'cancel' },
            { text: 'Cancelar inscripción', style: 'destructive', onPress: () => hacer(() => repo.cancelarInscripcion(viaje.id)) },
          ])} />
      )}
    </>
  );
}

const SIGUIENTE: Partial<Record<EstadoViaje, { estado: EstadoViaje; texto: string }>> = {
  esperando_pasajeros: { estado: 'confirmado', texto: 'Confirmar viaje' },
  confirmado: { estado: 'en_curso', texto: 'Iniciar viaje' },
  en_curso: { estado: 'terminado', texto: 'Terminar viaje' },
};

function AccionesConductor({ viaje, ocupado, hacer }: PropsAcciones) {
  const siguiente = SIGUIENTE[viaje.estado];
  return (
    <>
      {viaje.estado === 'en_curso' && <Boton titulo="Ver mapa del viaje" onPress={() => router.push(`/viaje/${viaje.id}/en-curso`)} />}
      {siguiente && (
        <Boton titulo={siguiente.texto} cargando={ocupado} variante={viaje.estado === 'en_curso' ? 'secundario' : 'primario'}
          onPress={() => hacer(async () => {
            await repo.cambiarEstado(viaje.id, siguiente.estado);
            if (siguiente.estado === 'en_curso') router.push(`/viaje/${viaje.id}/en-curso`);
          })} />
      )}
      {(viaje.estado === 'esperando_pasajeros' || viaje.estado === 'confirmado') && (
        <Boton titulo="Cancelar viaje" variante="secundario"
          onPress={() => Alert.alert('¿Cancelar el viaje?', 'Avisaremos al tiro a los inscritos.', [
            { text: 'Volver', style: 'cancel' },
            { text: 'Cancelar viaje', style: 'destructive', onPress: () => hacer(() => repo.cambiarEstado(viaje.id, 'cancelado')) },
          ])} />
      )}
    </>
  );
}

// Pasajeros del viaje con su paradero y el estado de su pago; el conductor confirma las transferencias.
function PanelConductor({ viaje }: { viaje: Viaje }) {
  const { datos, recargar } = useCarga(() => repo.pasajerosDelViaje(viaje.id), [viaje.id, viaje.inscritos]);
  const textoPago = { pendiente: 'Pago pendiente', informado: 'Dice que transfirió', confirmado: 'Pago confirmado' };
  return (
    <>
      <Subtitulo>Pasajeros</Subtitulo>
      {datos?.length === 0 && <Text style={s.textoSuave}>Todavía no se inscribe nadie.</Text>}
      {datos?.map((p) => (
        <Tarjeta key={p.inscripcionId} estilo={[s.fila, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.texto, { fontWeight: '600' }]}>{p.nombre}</Text>
            <Text style={s.textoSuave}>{p.paradero ?? 'Sin paradero'} · {textoPago[p.pago]}</Text>
          </View>
          {p.pago === 'informado' && (
            <Boton titulo="Me llegó" variante="secundario"
              onPress={async () => {
                try {
                  await repo.confirmarPago(p.inscripcionId);
                  recargar();
                } catch (e) {
                  Alert.alert('No se pudo confirmar', e instanceof Error ? e.message : '');
                }
              }} />
          )}
        </Tarjeta>
      ))}
    </>
  );
}
