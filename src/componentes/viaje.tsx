// Piezas propias de un viaje: tarjeta de la lista, escala de precios, paraderos y mapa del recorrido.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Coordenada, Paradero, Viaje } from '../datos';
import { diaYHora, hora, sumarMinutos } from '../lib/fechas';
import { regionPara } from '../lib/geo';
import { escalaDePrecios, formatoCLP, precioConUnoMas, precioPorPersona } from '../lib/precio';
import { color, espacio, radio, TOQUE_MINIMO } from '../tema';
import { s as base, Tarjeta } from './basicos';

export function Ruta({ viaje, tamano = 16 }: { viaje: Viaje; tamano?: number }) {
  return (
    <Text style={{ fontSize: tamano, fontWeight: '700', color: color.texto }} numberOfLines={2}>
      {viaje.origen} → {viaje.destino}
    </Text>
  );
}

export function BajaConUnoMas({ viaje }: { viaje: Viaje }) {
  const baja = precioConUnoMas(viaje.costoTotal, viaje.inscritos, viaje.cupos);
  if (baja === null) return null;
  return (
    <View style={st.pildora}>
      <Ionicons name="arrow-down" size={13} color={color.primario} />
      <Text style={st.pildoraTexto}>Baja a {formatoCLP(baja)} con 1 más</Text>
    </View>
  );
}

// Tarjeta de la lista: ruta, hora, cupos, conductor y precio actual grande a la derecha.
export function TarjetaViaje({ viaje, onPress, destacada }: { viaje: Viaje; onPress: () => void; destacada?: boolean }) {
  const precio = precioPorPersona(viaje.costoTotal, viaje.inscritos);
  const libres = viaje.cupos - viaje.inscritos;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Tarjeta destacada={destacada} estilo={{ gap: espacio.s }}>
        <View style={[base.fila, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Ruta viaje={viaje} />
            <View style={[base.fila, { flexWrap: 'wrap', columnGap: espacio.m, rowGap: 2 }]}>
              <View style={[base.fila, { gap: 4 }]}>
                <Ionicons name="time-outline" size={14} color={color.textoSuave} />
                <Text style={base.textoSuave}>{diaYHora(viaje.saleEn)}</Text>
              </View>
              <View style={[base.fila, { gap: 4 }]}>
                <Ionicons name="person-outline" size={14} color={color.textoSuave} />
                <Text style={base.textoSuave}>{libres > 0 ? `${libres} de ${viaje.cupos} cupos libres` : 'Completo'}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.precio}>{formatoCLP(precio)}</Text>
            {viaje.costoTotal > 0 && <Text style={st.chico}>por persona hoy</Text>}
          </View>
        </View>
        <Text style={st.chico}>{viaje.conductor.nombre}</Text>
        <BajaConUnoMas viaje={viaje} />
      </Tarjeta>
    </Pressable>
  );
}

// Barras con el precio por persona según cuántos se inscriban; marca la cantidad actual.
export function EscalaPrecios({ costoTotal, cupos, actual }: { costoTotal: number; cupos: number; actual?: number }) {
  const escala = escalaDePrecios(costoTotal, cupos);
  return (
    <View style={{ gap: 6 }}>
      {escala.map((e) => {
        const marcado = e.pasajeros === actual;
        return (
          <View key={e.pasajeros} style={base.fila}>
            <Text style={[st.escalaTexto, marcado && st.marcado]}>
              {e.pasajeros} {e.pasajeros === 1 ? 'persona' : 'personas'}
            </Text>
            <View style={st.barraFondo}>
              <View style={[st.barra, { width: `${(e.precio / costoTotal) * 100}%` }, marcado && { backgroundColor: color.primario }]} />
            </View>
            <Text style={[st.escalaPrecio, marcado && st.marcado]}>{formatoCLP(e.precio)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Línea de paraderos con su hora estimada. Si hay onElegir, se puede tocar uno para elegirlo.
export function ListaParaderos({ viaje, elegido, onElegir, etiquetaElegido = 'Tu paradero' }: {
  viaje: Viaje; elegido?: string | null; onElegir?: (id: string) => void; etiquetaElegido?: string;
}) {
  return (
    <View>
      {viaje.paraderos.map((p) => {
        const activo = p.id === elegido;
        return (
          <Pressable
            key={p.id}
            disabled={!onElegir}
            onPress={() => onElegir?.(p.id)}
            accessibilityRole={onElegir ? 'radio' : undefined}
            accessibilityState={{ checked: activo }}
            style={st.paradero}
          >
            <View style={[st.punto, activo && st.puntoActivo]} />
            <View style={{ flex: 1 }}>
              <Text style={base.texto}>{p.nombre}</Text>
              <Text style={st.chico}>
                {p.tipo === 'metro' ? 'Estación de metro' : 'Punto fijo'} · {hora(sumarMinutos(viaje.saleEn, p.minutosDesdeSalida))}
              </Text>
            </View>
            {activo && (
              <View style={st.pildora}>
                <Text style={st.pildoraTexto}>{etiquetaElegido}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// Mapa con el recorrido entre paraderos y, si se entrega, la posición del conductor.
export function MapaViaje({ paraderos, conductor, alto = 260, elegido }: {
  paraderos: Paradero[]; conductor?: Coordenada | null; alto?: number; elegido?: string | null;
}) {
  const puntos: Coordenada[] = conductor ? [...paraderos, conductor] : paraderos;
  return (
    <MapView style={{ height: alto }} initialRegion={regionPara(puntos)} showsPointsOfInterests={false}>
      <Polyline
        coordinates={paraderos.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
        strokeColor={color.primario}
        strokeWidth={5}
      />
      {paraderos.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          title={p.nombre}
          pinColor={p.id === elegido ? color.primario : color.primarioClaro}
        />
      ))}
      {conductor && (
        <Marker coordinate={{ latitude: conductor.lat, longitude: conductor.lng }} title="Conductor" anchor={{ x: 0.5, y: 0.5 }}>
          <View style={st.auto}>
            <Ionicons name="car" size={18} color={color.blanco} />
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const st = StyleSheet.create({
  precio: { fontSize: 22, fontWeight: '700', color: color.texto },
  chico: { fontSize: 12, color: color.textoSuave },
  pildora: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: color.primarioSuave, paddingHorizontal: espacio.s, paddingVertical: 4, borderRadius: 6,
  },
  pildoraTexto: { fontSize: 12, fontWeight: '600', color: color.primario },
  escalaTexto: { width: 90, fontSize: 13, color: color.textoSuave },
  escalaPrecio: { width: 72, textAlign: 'right', fontSize: 13, color: color.texto },
  marcado: { fontWeight: '700', color: color.texto },
  barraFondo: { flex: 1, height: 6, backgroundColor: color.fondoGris, borderRadius: 3 },
  barra: { height: 6, backgroundColor: color.primarioClaro, borderRadius: 3 },
  paradero: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: TOQUE_MINIMO + 8, paddingVertical: 6 },
  punto: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color.textoSuave },
  puntoActivo: { borderColor: color.primario, backgroundColor: color.primario },
  auto: { backgroundColor: color.primario, borderRadius: radio.grande, padding: 6, borderWidth: 2, borderColor: color.blanco },
});
