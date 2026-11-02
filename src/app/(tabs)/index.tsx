// Inicio: mapa con los paraderos, búsqueda "¿A dónde vas?", atajos a destinos y viajes que salen pronto.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Estado, s, Subtitulo } from '../../componentes/basicos';
import { TarjetaViaje } from '../../componentes/viaje';
import { repo } from '../../datos';
import { regionPara } from '../../lib/geo';
import { useSesion } from '../../sesion';
import { color, espacio, radio, TOQUE_MINIMO } from '../../tema';
import { useCarga } from '../../useCarga';

export default function Inicio() {
  const { perfil } = useSesion();
  const arriba = useSafeAreaInsets().top;
  const { datos: viajes, cargando, error, recargar } = useCarga(() => repo.listarViajes());
  const paraderos = (viajes ?? []).flatMap((v) => v.paraderos);
  const destinos = [...new Set((viajes ?? []).map((v) => v.destino))];

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <MapView style={StyleSheet.absoluteFill} region={regionPara(paraderos)} showsUserLocation>
        {paraderos.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.nombre} pinColor={color.primario} />
        ))}
      </MapView>
      <ScrollView
        contentContainerStyle={{ paddingTop: arriba + 180 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} />}
      >
        <View style={st.hoja}>
          <View style={st.asa} />
          <Text style={s.titulo}>Hola, {perfil?.nombre.split(' ')[0]}</Text>
          <Text style={s.textoSuave}>Viajes que tu comunidad ya va a hacer</Text>

          <Pressable style={st.buscador} onPress={() => router.push('/buscar')} accessibilityRole="search">
            <Ionicons name="search" size={20} color={color.texto} />
            <Text style={[s.texto, { flex: 1, fontWeight: '600' }]}>¿A dónde vas?</Text>
          </Pressable>

          {destinos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
              {destinos.map((d) => (
                <Pressable key={d} style={st.chip} onPress={() => router.push({ pathname: '/buscar', params: { destino: d } })}>
                  <Ionicons name="location-outline" size={15} color={color.texto} />
                  <Text style={s.texto}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

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
  hoja: {
    backgroundColor: color.fondo, borderTopLeftRadius: radio.grande, borderTopRightRadius: radio.grande,
    padding: espacio.l, gap: espacio.m, minHeight: 600, paddingBottom: espacio.xl * 2,
  },
  asa: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: color.borde },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: espacio.s, backgroundColor: color.fondoGris,
    borderRadius: radio.medio, minHeight: 52, paddingHorizontal: espacio.l,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: color.borde,
    borderRadius: radio.grande, paddingHorizontal: espacio.m, minHeight: TOQUE_MINIMO - 6,
  },
});
