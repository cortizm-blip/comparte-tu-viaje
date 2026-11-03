// Inicio: mapa arriba y hoja con saludo, accesos rápidos (Viajar, Publicar, Mis viajes),
// búsqueda "¿A dónde vas?", destinos con viajes publicados y viajes que salen pronto.
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Estado, s, Subtitulo } from '../../componentes/basicos';
import { TarjetaViaje } from '../../componentes/viaje';
import { repo, type Viaje } from '../../datos';
import { diaYHora } from '../../lib/fechas';
import { regionPara } from '../../lib/geo';
import { useSesion } from '../../sesion';
import { usePermisoUbicacion } from '../../usePermisoUbicacion';
import { color, espacio, radio, TOQUE_MINIMO } from '../../tema';
import { useCarga } from '../../useCarga';

const ACCIONES: { titulo: string; imagen: ImageSourcePropType; destino: Href }[] = [
  { titulo: 'Viajar', imagen: require('../../../assets/iconos/viajar.png'), destino: '/buscar' },
  { titulo: 'Publicar', imagen: require('../../../assets/iconos/publicar.png'), destino: '/publicar' },
  { titulo: 'Mis viajes', imagen: require('../../../assets/iconos/mis-viajes.png'), destino: '/mis-viajes' },
];

const ALTO_MAPA = 340;

export default function Inicio() {
  const { perfil } = useSesion();
  const arriba = useSafeAreaInsets().top;
  const { datos: viajes, cargando, error, recargar } = useCarga(() => repo.listarViajes());
  const paraderos = useMemo(() => (viajes ?? []).flatMap((v) => v.paraderos), [viajes]);
  const ubicacion = usePermisoUbicacion();
  const mapa = useRef<MapView>(null);
  // Encuadra los paraderos solo cuando cambian, sin pisar lo que la persona movió en el mapa.
  const claveParaderos = paraderos.map((p) => p.id).join();
  useEffect(() => {
    if (paraderos.length) mapa.current?.animateToRegion(regionPara(paraderos), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveParaderos]);

  // Un acceso por destino, con el primer viaje que sale hacia allá.
  const destinos = new Map<string, Viaje>();
  for (const v of viajes ?? []) if (!destinos.has(v.destino)) destinos.set(v.destino, v);

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <MapView style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ALTO_MAPA + 40 }}
        ref={mapa} initialRegion={regionPara([])} showsUserLocation={ubicacion} legalLabelInsets={{ top: 0, left: 0, right: 0, bottom: 48 }}>
        {paraderos.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.nombre} pinColor={color.primario} />
        ))}
      </MapView>
      <Pressable onPress={() => router.push('/perfil')} accessibilityLabel="Perfil"
        style={[st.avatar, { top: arriba + espacio.s }]}>
        <Text style={st.avatarTexto}>{perfil?.nombre.charAt(0).toUpperCase()}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingTop: ALTO_MAPA }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} />}>
        <View style={st.hoja}>
          <View style={st.asa} />
          <View>
            <Text style={[s.textoSuave, { fontSize: 16 }]}>¡Hola, {perfil?.nombre.split(' ')[0]}!</Text>
            <Text style={st.pregunta}>¿Qué quieres hacer?</Text>
          </View>

          <View style={st.acciones}>
            {ACCIONES.map((a, i) => (
              <Pressable key={a.titulo} onPress={() => router.push(a.destino)} accessibilityRole="button"
                style={({ pressed }) => [st.accion, i === 0 && st.accionActiva, pressed && { opacity: 0.8 }]}>
                <Image source={a.imagen} style={st.accionImagen} resizeMode="contain" />
                <Text style={[st.accionTexto, i === 0 && { color: color.primario }]}>{a.titulo}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={st.buscador} onPress={() => router.push('/buscar')} accessibilityRole="search">
            <Ionicons name="search" size={20} color={color.texto} />
            <Text style={[s.texto, { flex: 1, color: color.textoSuave, fontSize: 17 }]}>¿A dónde vas?</Text>
          </Pressable>

          {[...destinos.values()].map((v) => (
            <Pressable key={v.destino} style={st.atajo}
              onPress={() => router.push({ pathname: '/buscar', params: { destino: v.destino } })}>
              <Ionicons name="location" size={20} color={color.primario} />
              <View style={{ flex: 1 }}>
                <Text style={[s.texto, { fontWeight: '600', color: color.primario }]}>{v.destino}</Text>
                <Text style={s.textoSuave}>Desde {v.origen} · {diaYHora(v.saleEn)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.textoSuave} />
            </Pressable>
          ))}

          <Subtitulo derecha={viajes && <Text style={s.textoSuave}>{viajes.length} viajes</Text>}>Saliendo pronto</Subtitulo>
          <Estado cargando={cargando} error={error} onReintentar={recargar}
            vacio={viajes?.length === 0 ? 'Aún no hay viajes publicados. ¡Publica el tuyo!' : undefined} />
          <View style={{ gap: espacio.m }}>
            {viajes?.map((v) => <TarjetaViaje key={v.id} viaje={v} onPress={() => router.push(`/viaje/${v.id}`)} />)}
          </View>
          {repo.esDemo && <Text style={[s.textoSuave, { textAlign: 'center', marginTop: espacio.l }]}>Modo demo · datos de ejemplo</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  avatar: {
    position: 'absolute', left: espacio.l, zIndex: 1, width: 48, height: 48, borderRadius: 24,
    backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: color.blanco, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  avatarTexto: { color: color.blanco, fontSize: 20, fontWeight: '700' },
  hoja: {
    backgroundColor: color.fondo, borderTopLeftRadius: radio.grande, borderTopRightRadius: radio.grande,
    padding: espacio.l, gap: espacio.l, minHeight: 600, paddingBottom: espacio.xl * 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -2 },
  },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.borde },
  pregunta: { fontSize: 24, fontWeight: '800', color: color.texto },
  acciones: { flexDirection: 'row', gap: espacio.m },
  accion: {
    flex: 1, alignItems: 'center', gap: espacio.s, paddingVertical: espacio.m, borderRadius: radio.medio,
    borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.fondo,
  },
  accionActiva: { borderColor: color.primario, borderWidth: 2, backgroundColor: color.primarioSuave },
  accionImagen: { width: 72, height: 72 },
  accionTexto: { fontSize: 15, fontWeight: '600', color: color.texto },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: espacio.s, backgroundColor: color.fondoGris,
    borderRadius: radio.medio, minHeight: 56, paddingHorizontal: espacio.l,
  },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: TOQUE_MINIMO + 8 },
});
