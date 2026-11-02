// Raíz de la app: pantalla de inicio con la marca, sesión, bienvenida la primera vez y navegación en pila.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Campo, Estado, s } from '../componentes/basicos';
import { Marca, PantallaInicio } from '../componentes/marca';
import { DOCUMENTOS, type DocumentoLegal } from '../legal';
import { repo } from '../datos';
import { escucharToques } from '../notificaciones';
import { ProveedorSesion, useSesion } from '../sesion';
import { color, espacio } from '../tema';

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <StatusBar style="dark" />
        <Contenido />
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}

const INICIO_MINIMO_MS = 1500;

function Contenido() {
  const { cargando, error, perfil, reintentar } = useSesion();
  const [marcaVista, setMarcaVista] = useState(false);
  useEffect(() => escucharToques(), []);
  // La marca se muestra al menos 1,5 s al abrir, aunque la sesión cargue antes.
  useEffect(() => {
    const t = setTimeout(() => setMarcaVista(true), INICIO_MINIMO_MS);
    return () => clearTimeout(t);
  }, []);

  if (cargando || !marcaVista) return <PantallaInicio />;
  if (error) return <SafeAreaView style={{ flex: 1 }}><Estado error={error} onReintentar={reintentar} /></SafeAreaView>;
  if (!perfil) return <Bienvenida />;

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerTintColor: color.texto, headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="buscar" options={{ title: 'Planifica tu viaje' }} />
      <Stack.Screen name="viaje/[id]/index" options={{ title: 'Detalle del viaje' }} />
      <Stack.Screen name="viaje/[id]/inscrito" options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="viaje/[id]/en-curso" options={{ title: 'Viaje en curso' }} />
      <Stack.Screen name="viaje/[id]/pago" options={{ title: 'Pagar el viaje' }} />
      <Stack.Screen name="cuenta-cobro" options={{ title: 'Cuenta de cobro', presentation: 'modal' }} />
      <Stack.Screen name="legal" options={{ title: '' }} />
    </Stack>
  );
}

// Primera vez: pide el nombre que verán conductores y pasajeros.
function Bienvenida() {
  const { guardarPerfil } = useSesion();
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentoLegal | null>(null);

  async function continuar() {
    setGuardando(true);
    setError(null);
    try {
      await guardarPerfil({ nombre: nombre.trim(), auto: null, patente: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, padding: espacio.xl, justifyContent: 'center', gap: espacio.l }}>
        <Marca tamano={110} />
        <Text style={[s.texto, { textAlign: 'center' }]}>
          Súmate a viajes que tu comunidad ya va a hacer. Mientras más se inscriben, menos paga cada uno.
        </Text>
        <Campo etiqueta="¿Cómo te llamas?" value={nombre} onChangeText={setNombre} placeholder="Nombre y apellido" autoFocus
          autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => nombre.trim() && continuar()} />
        {error && <Text style={{ color: color.error }}>{error}</Text>}
        <Boton titulo="Empezar" onPress={continuar} cargando={guardando} deshabilitado={nombre.trim().length < 2} />
        <Text style={[s.textoSuave, { textAlign: 'center' }]}>
          Al empezar aceptas los{' '}
          <Text style={st.link} onPress={() => setDoc('terminos')} accessibilityRole="link">Términos de uso</Text>
          {' '}y la{' '}
          <Text style={st.link} onPress={() => setDoc('privacidad')} accessibilityRole="link">Política de privacidad</Text>.
        </Text>
        {repo.esDemo && <Text style={[s.textoSuave, { textAlign: 'center' }]}>Modo demo: viajes y datos de ejemplo.</Text>}
      </KeyboardAvoidingView>
      <Modal visible={doc !== null} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => setDoc(null)}>
        <DocumentoModal doc={doc ?? 'terminos'} onCerrar={() => setDoc(null)} />
      </Modal>
    </SafeAreaView>
  );
}

// Términos o privacidad en una hoja, para leerlos antes de crear el perfil (aún no hay navegación en pila).
function DocumentoModal({ doc, onCerrar }: { doc: DocumentoLegal; onCerrar: () => void }) {
  const documento = DOCUMENTOS[doc];
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={[s.fila, { justifyContent: 'space-between', padding: espacio.l }]}>
        <Text style={s.subtitulo}>{documento.titulo}</Text>
        <Pressable onPress={onCerrar} hitSlop={12} accessibilityRole="button"><Text style={st.link}>Cerrar</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: espacio.l, paddingTop: 0, gap: espacio.l, paddingBottom: espacio.xl * 2 }}>
        {documento.secciones.map((sec) => (
          <View key={sec.titulo} style={{ gap: espacio.xs }}>
            <Text style={[s.texto, { fontWeight: '700' }]} accessibilityRole="header">{sec.titulo}</Text>
            <Text style={s.texto}>{sec.texto}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({ link: { color: color.primario, fontWeight: '600', fontSize: 17 } });
