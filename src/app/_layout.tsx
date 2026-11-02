// Raíz de la app: sesión, pantalla de bienvenida la primera vez y navegación en pila.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Campo, Estado, s } from '../componentes/basicos';
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

function Contenido() {
  const { cargando, error, perfil, reintentar } = useSesion();
  useEffect(() => escucharToques(), []);

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={color.primario} />
      </View>
    );
  }
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
    </Stack>
  );
}

// Primera vez: pide el nombre que verán conductores y pasajeros.
function Bienvenida() {
  const { guardarPerfil } = useSesion();
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={[s.titulo, { color: color.primario }]}>Comparte tu viaje</Text>
        <Text style={s.texto}>
          Súmate a viajes que tu comunidad ya va a hacer. Mientras más se inscriben, menos paga cada uno.
        </Text>
        <Campo etiqueta="¿Cómo te llamas?" value={nombre} onChangeText={setNombre} placeholder="Nombre y apellido" autoFocus
          autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => nombre.trim() && continuar()} />
        {error && <Text style={{ color: color.error }}>{error}</Text>}
        <Boton titulo="Empezar" onPress={continuar} cargando={guardando} deshabilitado={nombre.trim().length < 2} />
        {repo.esDemo && <Text style={[s.textoSuave, { textAlign: 'center' }]}>Modo demo: viajes y datos de ejemplo.</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
