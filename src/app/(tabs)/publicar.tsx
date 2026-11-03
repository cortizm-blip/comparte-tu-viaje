// Publicar viaje: formulario corto, Pagado/Gratis, paraderos marcados en el mapa y vista previa del precio.
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, type LatLng, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Campo, s, Segmento, Subtitulo, Tarjeta, Titulo } from '../../componentes/basicos';
import { BotonBuscar, ListaLugares } from '../../componentes/lugares';
import { EscalaPrecios } from '../../componentes/viaje';
import { repo, type Coordenada, type NuevoParadero, type TipoParadero } from '../../datos';
import { registrarPush } from '../../notificaciones';
import { armarSalida } from '../../lib/fechas';
import { buscarLugares, type Lugar } from '../../lib/lugares';
import { regionPara } from '../../lib/geo';
import { color, espacio, TOQUE_MINIMO } from '../../tema';
import { useCarga } from '../../useCarga';

const MAX_CUPOS = 8;

export default function Publicar() {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [destinoUbicacion, setDestinoUbicacion] = useState<Coordenada | null>(null);
  const [lugaresDestino, setLugaresDestino] = useState<Lugar[]>([]);
  const [buscandoDestino, setBuscandoDestino] = useState(false);
  const [diaSalida, setDiaSalida] = useState(1);
  const [horaSalida, setHoraSalida] = useState('');
  const [pagado, setPagado] = useState(true);
  const [costo, setCosto] = useState('');
  const [cupos, setCupos] = useState(4);
  const [paraderos, setParaderos] = useState<NuevoParadero[]>([]);
  const [notas, setNotas] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const { datos: cuenta } = useCarga(() => repo.miCuentaCobro());

  const costoTotal = pagado ? Number(costo.replace(/\D/g, '')) || 0 : 0;
  const salida = armarSalida(diaSalida, horaSalida);

  // Busca el destino en Apple Maps; si hay un solo resultado lo ubica directamente.
  async function buscarDestino() {
    const q = destino.trim();
    if (q.length < 3) return;
    setBuscandoDestino(true);
    try {
      const r = await buscarLugares(q);
      if (r.length === 0) Alert.alert('No lo encontramos', 'Prueba con la dirección o el nombre del lugar.');
      if (r.length === 1) setDestinoUbicacion({ lat: r[0].lat, lng: r[0].lng });
      else setLugaresDestino(r);
    } catch {
      Alert.alert('No se pudo buscar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBuscandoDestino(false);
    }
  }

  // Devuelve el primer problema del formulario, o null si se puede publicar.
  function problema(): string | null {
    if (!origen.trim() || !destino.trim()) return 'Completa desde dónde y hasta dónde vas.';
    if (!salida) return 'Escribe la hora de salida como 07:45.';
    if (salida.getTime() <= Date.now()) return 'La hora de salida ya pasó.';
    if (pagado && costoTotal < 500) return 'Escribe el costo total del viaje (bencina y peajes).';
    if (pagado && !cuenta) return 'Agrega tu cuenta de cobro para recibir las transferencias.';
    if (paraderos.length === 0) return 'Agrega al menos un paradero.';
    return null;
  }

  async function publicar() {
    const p = problema();
    if (p) {
      Alert.alert('Falta algo', p);
      return;
    }
    setPublicando(true);
    try {
      const id = await repo.publicarViaje({
        origen: origen.trim(), destino: destino.trim(), destinoUbicacion, saleEn: salida!, costoTotal, cupos,
        cuentaCobroId: pagado ? (cuenta?.id ?? null) : null, paraderos, notas: notas.trim() || null,
      });
      registrarPush({ pedir: true }).catch(() => {});
      setOrigen(''); setDestino(''); setDestinoUbicacion(null); setHoraSalida(''); setCosto(''); setParaderos([]); setNotas('');
      router.push(`/viaje/${id}`);
    } catch (e) {
      Alert.alert('No se pudo publicar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setPublicando(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacio.xl * 2 }} keyboardShouldPersistTaps="handled">
          <View>
            <Titulo>Publicar viaje</Titulo>
            <Text style={s.textoSuave}>Un viaje que ya vas a hacer, 1 o 2 días antes</Text>
          </View>
          <Campo etiqueta="Desde" value={origen} onChangeText={setOrigen} placeholder="Ej: Metro Ñuble" />
          <View style={[s.fila, { alignItems: 'flex-end' }]}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Hasta" value={destino} placeholder="Ej: Campus Lo Contador" returnKeyType="search"
                onChangeText={(t) => { setDestino(t); setDestinoUbicacion(null); setLugaresDestino([]); }}
                onSubmitEditing={buscarDestino} />
            </View>
            <BotonBuscar onPress={buscarDestino} buscando={buscandoDestino} />
          </View>
          <ListaLugares lugares={lugaresDestino} onElegir={(l) => {
            setDestinoUbicacion({ lat: l.lat, lng: l.lng });
            setLugaresDestino([]);
            Keyboard.dismiss();
          }} />
          <Text style={s.textoSuave}>
            {destinoUbicacion ? '✓ Destino ubicado en el mapa: así te encuentran quienes van cerca.' : 'Toca la lupa para ubicar el destino y que te encuentren quienes van cerca.'}
          </Text>
          <Text style={s.etiqueta}>Salida</Text>
          <Segmento valor={diaSalida} onCambio={setDiaSalida}
            opciones={[{ valor: 0, texto: 'Hoy' }, { valor: 1, texto: 'Mañana' }, { valor: 2, texto: 'Pasado mañana' }]} />
          <Campo etiqueta="Hora" value={horaSalida} onChangeText={setHoraSalida} placeholder="07:45"
            keyboardType="numbers-and-punctuation" maxLength={5} />

          <Text style={s.etiqueta}>Tipo de viaje</Text>
          <Segmento valor={pagado ? 'pagado' : 'gratis'} onCambio={(v) => setPagado(v === 'pagado')}
            opciones={[{ valor: 'pagado', texto: 'Pagado' }, { valor: 'gratis', texto: 'Gratis' }]} />
          {pagado && (
            <Campo etiqueta="Costo total del viaje (bencina y peajes)" value={costo} onChangeText={setCosto}
              placeholder="$8.000" keyboardType="number-pad" />
          )}

          <Text style={s.etiqueta}>Cupos</Text>
          <View style={[s.fila, { gap: espacio.l }]}>
            <BotonCupo icono="remove" onPress={() => setCupos(Math.max(1, cupos - 1))} />
            <Text style={{ fontSize: 22, fontWeight: '700', minWidth: 24, textAlign: 'center' }}>{cupos}</Text>
            <BotonCupo icono="add" onPress={() => setCupos(Math.min(MAX_CUPOS, cupos + 1))} />
            <Text style={s.textoSuave}>máximo {MAX_CUPOS}</Text>
          </View>

          <Subtitulo>Paraderos</Subtitulo>
          <Text style={s.textoSuave}>Estaciones de metro o puntos fijos donde subirán los pasajeros, en orden.</Text>
          {paraderos.map((p, i) => (
            <Tarjeta key={`${p.nombre}-${i}`} estilo={[s.fila, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.texto}>{i + 1}. {p.nombre}</Text>
                <Text style={s.textoSuave}>{p.tipo === 'metro' ? 'Metro' : 'Punto fijo'} · {p.minutosDesdeSalida} min después de salir</Text>
              </View>
              <Pressable accessibilityLabel={`Quitar ${p.nombre}`} hitSlop={12}
                onPress={() => setParaderos(paraderos.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle" size={24} color={color.textoSuave} />
              </Pressable>
            </Tarjeta>
          ))}
          <Boton titulo="Agregar paradero" variante="secundario" onPress={() => setAgregando(true)}
            icono={<Ionicons name="add" size={20} color={color.texto} />} />

          {pagado && (
            <>
              <Subtitulo>Cuenta de cobro</Subtitulo>
              <Pressable onPress={() => router.push('/cuenta-cobro')}>
                <Tarjeta estilo={[s.fila, { justifyContent: 'space-between' }]}>
                  <Text style={[s.texto, { flex: 1 }]}>
                    {cuenta ? `${cuenta.banco} · ${cuenta.tipoCuenta} ${cuenta.numeroCuenta}` : 'Agregar cuenta de cobro'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={color.textoSuave} />
                </Tarjeta>
              </Pressable>
              {costoTotal > 0 && (
                <Tarjeta estilo={{ gap: espacio.m }}>
                  <Text style={s.subtitulo}>Así baja el precio para tus pasajeros</Text>
                  <EscalaPrecios costoTotal={costoTotal} cupos={cupos} />
                </Tarjeta>
              )}
            </>
          )}
          <Campo etiqueta="Notas (opcional)" value={notas} onChangeText={setNotas} placeholder="Ej: llevo maletero libre" />
          <Boton titulo="Publicar viaje" onPress={publicar} cargando={publicando} />
        </ScrollView>
      </KeyboardAvoidingView>
      <NuevoParaderoModal
        visible={agregando}
        cerca={paraderos[paraderos.length - 1]}
        onCerrar={() => setAgregando(false)}
        onAgregar={(p) => { setParaderos([...paraderos, p]); setAgregando(false); }}
      />
    </SafeAreaView>
  );
}

function BotonCupo({ icono, onPress }: { icono: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={icono === 'add' ? 'Más cupos' : 'Menos cupos'}
      style={{ width: TOQUE_MINIMO, height: TOQUE_MINIMO, borderRadius: 10, backgroundColor: color.fondoGris, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icono} size={22} color={color.texto} />
    </Pressable>
  );
}

// Modal para marcar un paradero tocando el mapa y ponerle nombre, tipo y minutos desde la salida.
function NuevoParaderoModal({ visible, cerca, onCerrar, onAgregar }: {
  visible: boolean; cerca?: NuevoParadero; onCerrar: () => void; onAgregar: (p: NuevoParadero) => void;
}) {
  const [punto, setPunto] = useState<LatLng | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoParadero>('metro');
  const [minutos, setMinutos] = useState('0');
  const mapa = useRef<MapView>(null);
  // Mueve el mapa sin controlarlo en cada render (evita el ciclo region ↔ onRegionChangeComplete).
  const mover = (r: Region) => mapa.current?.animateToRegion(r, 300);

  // Al abrir, centra el mapa en el último paradero o en la ubicación actual.
  async function alAbrir() {
    setPunto(null); setNombre(''); setResultados([]); setTipo('metro'); setMinutos(cerca ? String(cerca.minutosDesdeSalida + 10) : '0');
    if (cerca) return mover({ ...regionPara([cerca]), latitudeDelta: 0.05, longitudeDelta: 0.05 });
    const permiso = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!permiso?.granted) return;
    const l = await Location.getLastKnownPositionAsync().catch(() => null);
    if (l) mover({ latitude: l.coords.latitude, longitude: l.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  }

  const [buscando, setBuscando] = useState(false);

  const [resultados, setResultados] = useState<Lugar[]>([]);

  // Busca el nombre con Apple Maps y muestra los lugares encontrados para elegir uno.
  async function buscarEnMapa() {
    const q = nombre.trim();
    if (q.length < 3) return;
    setBuscando(true);
    try {
      const lugares = await buscarLugares(q);
      if (lugares.length === 0) {
        Alert.alert('No lo encontramos', 'Prueba con otro nombre o toca el mapa donde subirán los pasajeros.');
      }
      setResultados(lugares);
    } catch {
      Alert.alert('No se pudo buscar', 'Revisa tu conexión o toca el mapa.');
    } finally {
      setBuscando(false);
    }
  }

  // Deja el pin en el lugar elegido y acerca el mapa.
  function elegir(l: Lugar) {
    setPunto({ latitude: l.lat, longitude: l.lng });
    mover({ latitude: l.lat, longitude: l.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    if (!nombre.trim()) setNombre(l.nombre);
    if (/metro|estaci[oó]n/i.test(`${nombre} ${l.nombre}`)) setTipo('metro');
    setResultados([]);
    Keyboard.dismiss();
  }

  const listo = punto && nombre.trim().length > 1;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={alAbrir} onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.fondo }}>
        <View style={[s.fila, { justifyContent: 'space-between', padding: espacio.l }]}>
          <Text style={s.subtitulo}>Nuevo paradero</Text>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button"><Text style={{ color: color.primario, fontSize: 17 }}>Cancelar</Text></Pressable>
        </View>
        <MapView ref={mapa} style={{ flex: 1 }} initialRegion={regionPara(cerca ? [cerca] : [])} showsUserLocation
          onPress={(e) => setPunto(e.nativeEvent.coordinate)}>
          {punto && <Marker coordinate={punto} pinColor={color.primario} />}
        </MapView>
        <View style={{ padding: espacio.l, gap: espacio.m }}>
          <Text style={s.textoSuave}>
            {punto ? 'Puedes mover el pin tocando otro punto del mapa.' : 'Escribe el lugar y búscalo, o toca el mapa.'}
          </Text>
          <View style={[s.fila, { alignItems: 'flex-end' }]}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Metro Santa Isabel"
                returnKeyType="search" onSubmitEditing={buscarEnMapa} />
            </View>
            <BotonBuscar onPress={buscarEnMapa} buscando={buscando} />
          </View>
          <ListaLugares lugares={resultados} onElegir={elegir} />
          <Segmento valor={tipo} onCambio={setTipo}
            opciones={[{ valor: 'metro', texto: 'Estación de metro' }, { valor: 'punto_fijo', texto: 'Punto fijo' }]} />
          <Campo etiqueta="Minutos después de la salida" value={minutos} onChangeText={setMinutos} keyboardType="number-pad" maxLength={3} />
          <Boton titulo="Agregar" deshabilitado={!listo}
            onPress={() => punto && onAgregar({
              nombre: nombre.trim(), tipo, lat: punto.latitude, lng: punto.longitude,
              minutosDesdeSalida: Number(minutos.replace(/\D/g, '')) || 0,
            })} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
