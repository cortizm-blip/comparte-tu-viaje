// Buscar: filtra los viajes publicados por destino, origen o paradero y por día de salida.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Estado, s, Segmento } from '../componentes/basicos';
import { TarjetaViaje } from '../componentes/viaje';
import { repo, type Viaje } from '../datos';
import { dia } from '../lib/fechas';
import { color, espacio, radio } from '../tema';
import { useCarga } from '../useCarga';

type Dia = 'todos' | 'Hoy' | 'Mañana' | 'Pasado mañana';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Coincide si el texto aparece en origen, destino o algún paradero (sin importar tildes).
function coincide(v: Viaje, texto: string): boolean {
  const q = normalizar(texto.trim());
  if (!q) return true;
  return [v.origen, v.destino, ...v.paraderos.map((p) => p.nombre)].some((t) => normalizar(t).includes(q));
}

export default function Buscar() {
  const params = useLocalSearchParams<{ destino?: string }>();
  const [texto, setTexto] = useState(params.destino ?? '');
  const [cuando, setCuando] = useState<Dia>('todos');
  const { datos, cargando, error, recargar } = useCarga(() => repo.listarViajes());
  const resultados = (datos ?? []).filter((v) => coincide(v, texto) && (cuando === 'todos' || dia(v.saleEn) === cuando));

  return (
    <ScrollView style={{ backgroundColor: color.fondo }} contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}
      keyboardShouldPersistTaps="handled">
      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="¿A dónde vas? Destino, comuna o metro"
        placeholderTextColor={color.textoSuave}
        autoFocus={!params.destino}
        clearButtonMode="while-editing"
        style={{ minHeight: 52, backgroundColor: color.fondoGris, borderRadius: radio.medio, paddingHorizontal: espacio.l, fontSize: 17 }}
      />
      <Segmento<Dia>
        valor={cuando}
        onCambio={setCuando}
        opciones={[
          { valor: 'todos', texto: 'Todos' }, { valor: 'Hoy', texto: 'Hoy' },
          { valor: 'Mañana', texto: 'Mañana' }, { valor: 'Pasado mañana', texto: 'Pasado' },
        ]}
      />
      <View>
        <Text style={s.subtitulo}>Elige tu viaje</Text>
        <Text style={s.textoSuave}>El precio baja con cada persona que se suma</Text>
      </View>
      <Estado cargando={cargando} error={error} onReintentar={recargar}
        vacio={datos && resultados.length === 0 ? 'No hay viajes para esa búsqueda.' : undefined} />
      {resultados.map((v) => <TarjetaViaje key={v.id} viaje={v} onPress={() => router.push(`/viaje/${v.id}`)} />)}
    </ScrollView>
  );
}
