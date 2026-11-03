// Mis viajes: próximos como pasajero y como conductor, con su estado.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Estado, InsigniaEstado, s, Segmento, Tarjeta, Titulo } from '../../componentes/basicos';
import { Ruta } from '../../componentes/viaje';
import { repo, type Viaje } from '../../datos';
import { diaYHora } from '../../lib/fechas';
import { formatoCLP, precioPorPersona } from '../../lib/precio';
import { color, espacio } from '../../tema';
import { useCarga } from '../../useCarga';

export default function MisViajes() {
  const [rol, setRol] = useState<'pasajero' | 'conductor'>('pasajero');
  const { datos, cargando, error, recargar } = useCarga(() => repo.misViajes());
  const lista = rol === 'pasajero' ? datos?.comoPasajero : datos?.comoConductor;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} />}>
        <Titulo>Mis viajes</Titulo>
        <Segmento valor={rol} onCambio={setRol}
          opciones={[{ valor: 'pasajero', texto: 'Como pasajero' }, { valor: 'conductor', texto: 'Como conductor' }]} />
        <Estado cargando={cargando} error={error} onReintentar={recargar}
          vacio={lista?.length === 0 ? (rol === 'pasajero' ? 'No estás inscrito en ningún viaje.' : 'No has publicado viajes.') : undefined} />
        {lista?.map((v) => <FilaViaje key={v.id} viaje={v} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaViaje({ viaje }: { viaje: Viaje }) {
  const enCurso = viaje.estado === 'en_curso';
  return (
    <Pressable onPress={() => router.push(enCurso ? `/viaje/${viaje.id}/en-curso` : `/viaje/${viaje.id}`)}>
      <Tarjeta estilo={[s.fila, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Ruta viaje={viaje} />
          <Text style={s.textoSuave}>{diaYHora(viaje.saleEn)}</Text>
          <InsigniaEstado estado={viaje.estado} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{formatoCLP(precioPorPersona(viaje.costoTotal, viaje.inscritos))}</Text>
          <Text style={s.textoSuave}>{viaje.inscritos} de {viaje.cupos}</Text>
        </View>
      </Tarjeta>
    </Pressable>
  );
}
