// Buscar: ubica en el mapa la dirección o lugar al que vas (Apple Maps) y muestra los viajes con paraderos cerca;
// sin lugar elegido, filtra los viajes por destino, origen o paradero. También filtra por día de salida.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Estado, s, Segmento } from '../componentes/basicos';
import { TarjetaViaje } from '../componentes/viaje';
import { repo, type Viaje } from '../datos';
import { dia } from '../lib/fechas';
import { regionPara, viajesCerca } from '../lib/geo';
import { buscarLugares, type Lugar } from '../lib/lugares';
import { color, espacio, radio, TOQUE_MINIMO } from '../tema';
import { useCarga } from '../useCarga';
import { usePermisoUbicacion } from '../usePermisoUbicacion';

type Dia = 'todos' | 'Hoy' | 'Mañana' | 'Pasado mañana';

const RADIO_CERCA_M = 3000;

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Coincide si el texto aparece en origen, destino o algún paradero (sin importar tildes).
function coincide(v: Viaje, texto: string): boolean {
  const q = normalizar(texto.trim());
  if (!q) return true;
  return [v.origen, v.destino, ...v.paraderos.map((p) => p.nombre)].some((t) => normalizar(t).includes(q));
}

// Distancia legible: metros bajo 1 km, kilómetros con un decimal sobre eso.
const distanciaTexto = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

export default function Buscar() {
  const params = useLocalSearchParams<{ destino?: string }>();
  const [texto, setTexto] = useState(params.destino ?? '');
  const [cuando, setCuando] = useState<Dia>('todos');
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [buscando, setBuscando] = useState(false);
  const { datos, cargando, error, recargar } = useCarga(() => repo.listarViajes());

  const ubicacion = usePermisoUbicacion();
  const mapa = useRef<MapView>(null);

  const delDia = useMemo(() => (datos ?? []).filter((v) => cuando === 'todos' || dia(v.saleEn) === cuando), [datos, cuando]);
  const cercanos = useMemo(() => (lugar ? viajesCerca(delDia, lugar, RADIO_CERCA_M) : []), [delDia, lugar]);
  const porTexto = useMemo(() => (lugar ? [] : delDia.filter((v) => coincide(v, texto))), [delDia, lugar, texto]);
  const paraderos = useMemo(
    () => (lugar ? cercanos.map((c) => c.viaje) : porTexto).flatMap((v) => v.paraderos), [lugar, cercanos, porTexto]);

  // Mueve el mapa solo al elegir un lugar o cuando cambian los paraderos mostrados, no en cada tecla.
  const claveParaderos = paraderos.map((p) => p.id).join();
  useEffect(() => {
    if (lugar) mapa.current?.animateToRegion({ latitude: lugar.lat, longitude: lugar.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 400);
    else if (paraderos.length) mapa.current?.animateToRegion(regionPara(paraderos), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lugar, claveParaderos]);

  // Busca la dirección o lugar en Apple Maps; si hay uno solo, lo elige directamente.
  async function buscarEnMapa() {
    const q = texto.trim();
    if (q.length < 3) return;
    setBuscando(true);
    try {
      const r = await buscarLugares(q);
      if (r.length === 0) Alert.alert('No lo encontramos', 'Prueba con la calle y el número, la comuna o el nombre del lugar.');
      if (r.length === 1) elegir(r[0]);
      else setLugares(r);
    } catch {
      Alert.alert('No se pudo buscar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBuscando(false);
    }
  }

  // Fija el lugar elegido en el mapa y muestra los viajes que pasan cerca.
  function elegir(l: Lugar) {
    setLugar(l);
    setLugares([]);
    Keyboard.dismiss();
  }

  // Al editar el texto se vuelve a filtrar por nombre hasta que se busque otro lugar.
  function cambiarTexto(t: string) {
    setTexto(t);
    setLugar(null);
    setLugares([]);
  }

  return (
    <ScrollView style={{ backgroundColor: color.fondo }} contentContainerStyle={{ paddingBottom: espacio.xl * 2 }}
      keyboardShouldPersistTaps="handled">
      <MapView ref={mapa} style={{ height: 240 }} initialRegion={regionPara([])} showsUserLocation={ubicacion}>
        {lugar && <Marker coordinate={{ latitude: lugar.lat, longitude: lugar.lng }} title={lugar.nombre} pinColor={color.primario} />}
        {paraderos.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.nombre} pinColor={color.marcaNaranja} />
        ))}
      </MapView>

      <View style={{ padding: espacio.l, gap: espacio.m }}>
        <View style={[s.fila, { gap: espacio.s }]}>
          <TextInput
            value={texto}
            onChangeText={cambiarTexto}
            onSubmitEditing={buscarEnMapa}
            returnKeyType="search"
            placeholder="¿A dónde vas? Dirección, comuna o metro"
            placeholderTextColor={color.textoSuave}
            autoFocus={!params.destino}
            clearButtonMode="while-editing"
            style={{ flex: 1, minHeight: 52, backgroundColor: color.fondoGris, borderRadius: radio.medio, paddingHorizontal: espacio.l, fontSize: 17 }}
          />
          <Pressable onPress={buscarEnMapa} accessibilityLabel="Buscar en el mapa" disabled={buscando}
            style={{ width: 52, height: 52, borderRadius: radio.medio, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
            {buscando ? <ActivityIndicator color={color.blanco} /> : <Ionicons name="search" size={22} color={color.blanco} />}
          </Pressable>
        </View>

        {lugares.length > 0 && (
          <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.medio }}>
            {lugares.map((l, i) => (
              <Pressable key={`${l.lat},${l.lng}`} onPress={() => elegir(l)} accessibilityRole="button"
                style={({ pressed }) => [s.fila, {
                  minHeight: TOQUE_MINIMO + 8, paddingHorizontal: espacio.m, gap: espacio.m,
                  borderTopWidth: i === 0 ? 0 : 1, borderColor: color.borde, opacity: pressed ? 0.6 : 1,
                }]}>
                <Ionicons name="location" size={20} color={color.primario} />
                <View style={{ flex: 1, paddingVertical: espacio.s }}>
                  <Text style={s.texto} numberOfLines={1}>{l.nombre}</Text>
                  {l.direccion && <Text style={s.textoSuave} numberOfLines={1}>{l.direccion}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Segmento<Dia>
          valor={cuando}
          onCambio={setCuando}
          opciones={[
            { valor: 'todos', texto: 'Todos' }, { valor: 'Hoy', texto: 'Hoy' },
            { valor: 'Mañana', texto: 'Mañana' }, { valor: 'Pasado mañana', texto: 'Pasado' },
          ]}
        />

        {lugar ? (
          <>
            <View>
              <Text style={s.subtitulo}>Viajes cerca de {lugar.nombre}</Text>
              <Text style={s.textoSuave}>Con un paradero a menos de {distanciaTexto(RADIO_CERCA_M)}</Text>
            </View>
            <Estado cargando={cargando} error={error} onReintentar={recargar}
              vacio={datos && cercanos.length === 0 ? 'Todavía no hay viajes que pasen cerca. Prueba otro día o publica el tuyo.' : undefined} />
            {cercanos.map((c) => (
              <View key={c.viaje.id} style={{ gap: espacio.xs }}>
                <Text style={s.textoSuave}>Sube en {c.paradero.nombre} · a {distanciaTexto(c.distanciaM)}</Text>
                <TarjetaViaje viaje={c.viaje} onPress={() => router.push(`/viaje/${c.viaje.id}`)} />
              </View>
            ))}
          </>
        ) : (
          <>
            <View>
              <Text style={s.subtitulo}>Elige tu viaje</Text>
              <Text style={s.textoSuave}>Busca una dirección para ver los viajes que pasan cerca</Text>
            </View>
            <Estado cargando={cargando} error={error} onReintentar={recargar}
              vacio={datos && porTexto.length === 0 ? 'No hay viajes con ese nombre. Toca la lupa para buscar la dirección en el mapa.' : undefined} />
            {porTexto.map((v) => <TarjetaViaje key={v.id} viaje={v} onPress={() => router.push(`/viaje/${v.id}`)} />)}
          </>
        )}
      </View>
    </ScrollView>
  );
}
