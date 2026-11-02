// Confirmación después de inscribirse: precio de hoy, cuánto bajaría y qué avisos llegarán.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Estado, FilaDato, s, Subtitulo, Tarjeta } from '../../../componentes/basicos';
import { repo } from '../../../datos';
import { diaYHora, hora, sumarMinutos } from '../../../lib/fechas';
import { formatoCLP, precioConUnoMas, precioPorPersona } from '../../../lib/precio';
import { color, espacio, radio } from '../../../tema';
import { useCarga } from '../../../useCarga';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export default function Inscrito() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const abajo = useSafeAreaInsets().bottom;
  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [viaje, inscripcion] = await Promise.all([repo.obtenerViaje(id), repo.miInscripcion(id)]);
    return { viaje, inscripcion };
  }, [id]);

  if (!datos?.viaje) return <Estado cargando={cargando} error={error} onReintentar={recargar} />;
  const { viaje, inscripcion } = datos;
  const paradero = viaje.paraderos.find((p) => p.id === inscripcion?.paraderoId);
  const baja = precioConUnoMas(viaje.costoTotal, viaje.inscritos, viaje.cupos);
  const avisos: { icono: NombreIcono; titulo: string; detalle: string }[] = [
    ...(viaje.costoTotal > 0 ? [{ icono: 'arrow-down' as const, titulo: 'Cuando baje el precio', detalle: 'Cada vez que alguien se inscriba' }] : []),
    { icono: 'notifications-outline', titulo: '30 minutos antes de salir', detalle: 'Si el viaje está confirmado' },
    { icono: 'location-outline', titulo: `Cuando ${viaje.conductor.nombre.split(' ')[0]} se acerque`, detalle: paradero ? `A ${paradero.nombre}` : 'A tu paradero' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={36} color={color.blanco} />
        </View>
        <Text style={s.titulo}>Quedaste inscrito</Text>
        <Text style={s.textoSuave}>{viaje.origen} → {viaje.destino} · {diaYHora(viaje.saleEn)}</Text>
        <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
          <FilaDato etiqueta="Hoy pagas" valor={formatoCLP(precioPorPersona(viaje.costoTotal, viaje.inscritos))} />
          {baja !== null && <FilaDato etiqueta="Si se suma 1 más" valor={formatoCLP(baja)} destacado />}
          <FilaDato etiqueta="Inscritos" valor={`${viaje.inscritos} de ${viaje.cupos}`} />
          {paradero && (
            <FilaDato etiqueta="Tu paradero" valor={`${paradero.nombre} · ${hora(sumarMinutos(viaje.saleEn, paradero.minutosDesdeSalida))}`} />
          )}
        </Tarjeta>
        <Subtitulo>Te avisaremos</Subtitulo>
        {avisos.map((a) => (
          <View key={a.titulo} style={[s.fila, { gap: espacio.m, paddingVertical: espacio.xs }]}>
            <View style={{ width: 36, height: 36, borderRadius: radio.chico, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icono} size={18} color={color.primario} />
            </View>
            <View>
              <Text style={s.texto}>{a.titulo}</Text>
              <Text style={s.textoSuave}>{a.detalle}</Text>
            </View>
          </View>
        ))}
        {viaje.costoTotal > 0 && (
          <Text style={s.textoSuave}>Pagas al terminar el viaje, por transferencia directa al conductor.</Text>
        )}
      </ScrollView>
      <View style={{ padding: espacio.l, paddingBottom: abajo + espacio.s, gap: espacio.s }}>
        <Boton titulo="Ver mis viajes" onPress={() => router.replace('/mis-viajes')} />
        <Boton titulo="Ver detalle del viaje" variante="secundario" onPress={() => router.replace(`/viaje/${viaje.id}`)} />
      </View>
    </View>
  );
}
