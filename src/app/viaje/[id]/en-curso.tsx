// Viaje en curso: mapa con el conductor, tiempo de llegada al paradero y línea de paraderos.
// El conductor comparte su ubicación desde aquí; el pasajero la ve y puede compartir el viaje.
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Estado, s, Tarjeta } from '../../../componentes/basicos';
import { ListaParaderos, MapaViaje } from '../../../componentes/viaje';
import { repo, type Coordenada, type Viaje } from '../../../datos';
import { distanciaM, minutosHasta } from '../../../lib/geo';
import { useSesion } from '../../../sesion';
import { color, espacio, radio } from '../../../tema';
import { useCarga } from '../../../useCarga';

const CADA_MS = 10000;

export default function EnCurso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSesion();
  const abajo = useSafeAreaInsets().bottom;
  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [viaje, inscripcion] = await Promise.all([repo.obtenerViaje(id), repo.miInscripcion(id)]);
    return { viaje, inscripcion };
  }, [id]);
  const viaje = datos?.viaje;
  const soyConductor = !!viaje && viaje.conductor.id === perfil?.id;
  const conductor = useUbicacionConductor(viaje, soyConductor);

  if (!viaje) return <Estado cargando={cargando} error={error} onReintentar={recargar} />;
  const miParadero = viaje.paraderos.find((p) => p.id === datos?.inscripcion?.paraderoId);
  const nombre = viaje.conductor.nombre.split(' ')[0];

  async function llegamos() {
    if (soyConductor) {
      try {
        await repo.cambiarEstado(viaje!.id, 'terminado');
        router.back();
      } catch (e) {
        Alert.alert('No se pudo terminar', e instanceof Error ? e.message : '');
      }
    } else if (viaje!.costoTotal > 0) {
      router.replace(`/viaje/${viaje!.id}/pago`);
    } else {
      router.back();
    }
  }

  function compartir() {
    const auto = [viaje!.conductor.auto, viaje!.conductor.patente].filter(Boolean).join(', ');
    Share.share({
      message: `Voy en Comparte tu viaje: ${viaje!.origen} → ${viaje!.destino} con ${viaje!.conductor.nombre}${auto ? ` (${auto})` : ''}.`
        + (conductor ? ` Ubicación: https://maps.apple.com/?ll=${conductor.lat},${conductor.lng}` : ''),
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <MapaViaje paraderos={viaje.paraderos} conductor={conductor} elegido={miParadero?.id} alto={330} />
      {!soyConductor && miParadero && conductor && (
        <View style={{ position: 'absolute', top: espacio.m, left: espacio.m, right: espacio.m }}>
          <Tarjeta estilo={[s.fila, { gap: espacio.m, borderRadius: radio.grande }]}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: color.primario }}>{minutosHasta(conductor, miParadero)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.texto, { fontWeight: '600' }]}>
                {distanciaM(conductor, miParadero) <= 1000 ? `${nombre} está llegando` : `${nombre} va a tu paradero`}
              </Text>
              <Text style={s.textoSuave}>min · {miParadero.nombre}</Text>
            </View>
          </Tarjeta>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: 100 + abajo }}>
        <View style={[s.fila, { gap: espacio.m }]}>
          <Ionicons name="person-circle" size={44} color={color.primario} />
          <View style={{ flex: 1 }}>
            <Text style={[s.texto, { fontWeight: '600' }]}>{viaje.conductor.nombre}</Text>
            <Text style={s.textoSuave}>{viaje.conductor.auto ?? ''}</Text>
          </View>
          {viaje.conductor.patente && <Text style={{ fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6 }}>{viaje.conductor.patente}</Text>}
        </View>
        {soyConductor && (
          <Text style={s.textoSuave}>
            Estás compartiendo tu ubicación con los pasajeros mientras esta pantalla esté abierta.
          </Text>
        )}
        <ListaParaderos viaje={viaje} elegido={miParadero?.id} />
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: espacio.s, padding: espacio.l, paddingBottom: abajo + espacio.s, backgroundColor: color.fondo }}>
        <Boton titulo="Compartir" variante="secundario" onPress={compartir} estilo={{ flex: 1 }}
          icono={<Ionicons name="share-outline" size={18} color={color.texto} />} />
        <Boton titulo={soyConductor ? 'Terminar viaje' : 'Llegamos'} onPress={llegamos} estilo={{ flex: 1 }} />
      </View>
    </View>
  );
}

// Conductor: envía su GPS cada 10 s. Pasajero: consulta la última posición del conductor cada 10 s.
function useUbicacionConductor(viaje: Viaje | null | undefined, soyConductor: boolean): Coordenada | null {
  const [posicion, setPosicion] = useState<Coordenada | null>(null);
  const viajeId = viaje?.id;

  useEffect(() => {
    if (!viajeId) return;
    let activo = true;
    let sub: Location.LocationSubscription | null = null;

    if (soyConductor) {
      (async () => {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted || !activo) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: CADA_MS, distanceInterval: 30 },
          (l) => {
            const p = { lat: l.coords.latitude, lng: l.coords.longitude };
            setPosicion(p);
            repo.actualizarUbicacion(viajeId, p.lat, p.lng).catch(() => {});
          },
        );
      })();
      return () => {
        activo = false;
        sub?.remove();
      };
    }

    const consultar = () => repo.ubicacionConductor(viajeId).then((u) => activo && u && setPosicion(u)).catch(() => {});
    consultar();
    const intervalo = setInterval(consultar, repo.esDemo ? 2000 : CADA_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [viajeId, soyConductor]);

  return posicion;
}
