// Lista de lugares encontrados en Apple Maps (nombre y dirección) para elegir uno.
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { Lugar } from '../lib/lugares';
import { color, espacio, radio, TOQUE_MINIMO } from '../tema';
import { s } from './basicos';

export function ListaLugares({ lugares, onElegir }: { lugares: Lugar[]; onElegir: (l: Lugar) => void }) {
  if (lugares.length === 0) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.medio }}>
      {lugares.map((l, i) => (
        <Pressable key={`${l.lat},${l.lng}`} onPress={() => onElegir(l)} accessibilityRole="button"
          accessibilityLabel={l.direccion ? `${l.nombre}, ${l.direccion}` : l.nombre}
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
  );
}

// Botón cuadrado de lupa junto a un campo de búsqueda; muestra un indicador mientras busca.
export function BotonBuscar({ onPress, buscando }: { onPress: () => void; buscando: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Buscar en el mapa" disabled={buscando}
      style={{ width: TOQUE_MINIMO + 4, height: TOQUE_MINIMO + 4, borderRadius: radio.chico, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
      {buscando ? <ActivityIndicator color={color.blanco} /> : <Ionicons name="search" size={22} color={color.blanco} />}
    </Pressable>
  );
}
