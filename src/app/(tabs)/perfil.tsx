// Perfil: nombre y auto que ven los pasajeros, cuenta de cobro, términos, privacidad y eliminar la cuenta.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Campo, s, Subtitulo, Tarjeta } from '../../componentes/basicos';
import { repo } from '../../datos';
import { useSesion } from '../../sesion';
import { color, espacio } from '../../tema';
import { useCarga } from '../../useCarga';

export default function Perfil() {
  const { perfil, guardarPerfil, eliminarCuenta } = useSesion();
  const [eliminando, setEliminando] = useState(false);
  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [auto, setAuto] = useState(perfil?.auto ?? '');
  const [patente, setPatente] = useState(perfil?.patente ?? '');
  const [guardando, setGuardando] = useState(false);
  const { datos: cuenta } = useCarga(() => repo.miCuentaCobro());

  useEffect(() => {
    setNombre(perfil?.nombre ?? '');
    setAuto(perfil?.auto ?? '');
    setPatente(perfil?.patente ?? '');
  }, [perfil]);

  async function guardar() {
    setGuardando(true);
    try {
      await guardarPerfil({ nombre: nombre.trim(), auto: auto.trim() || null, patente: patente.trim().toUpperCase() || null });
      Alert.alert('Listo', 'Guardamos tu perfil.');
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : '');
    } finally {
      setGuardando(false);
    }
  }

  // Pide confirmación y borra la cuenta con todos sus datos; la app vuelve a la bienvenida.
  function confirmarEliminar() {
    Alert.alert('¿Eliminar tu cuenta?', 'Se borran tu perfil, tus viajes, inscripciones y cuenta de cobro. No se puede deshacer.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Eliminar cuenta', style: 'destructive', onPress: async () => {
          setEliminando(true);
          try {
            await eliminarCuenta();
          } catch (e) {
            setEliminando(false);
            Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
          }
        },
      },
    ]);
  }

  const cambios = nombre !== perfil?.nombre || auto !== (perfil?.auto ?? '') || patente !== (perfil?.patente ?? '');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m }} keyboardShouldPersistTaps="handled">
        <View style={[s.fila, { gap: espacio.m }]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: color.blanco, fontSize: 24, fontWeight: '700' }}>{perfil?.nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[s.titulo, { fontSize: 24 }]}>{perfil?.nombre}</Text>
            <Text style={s.textoSuave}>Pasajero y conductor</Text>
          </View>
        </View>

        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} />
        <Subtitulo>Como conductor</Subtitulo>
        <Campo etiqueta="Auto" value={auto} onChangeText={setAuto} placeholder="Ej: Toyota Yaris gris" />
        <Campo etiqueta="Patente" value={patente} onChangeText={setPatente} placeholder="Ej: RTKP42" autoCapitalize="characters" maxLength={8} />
        {cambios && <Boton titulo="Guardar perfil" onPress={guardar} cargando={guardando} deshabilitado={nombre.trim().length < 2} />}

        <Pressable onPress={() => router.push('/cuenta-cobro')} accessibilityRole="button">
          <Tarjeta estilo={[s.fila, { gap: espacio.m }]}>
            <Ionicons name="business-outline" size={22} color={color.primario} />
            <View style={{ flex: 1 }}>
              <Text style={s.texto}>Cuenta de cobro</Text>
              <Text style={s.textoSuave}>{cuenta ? `${cuenta.banco} · ${cuenta.numeroCuenta}` : 'Se reutiliza en todos tus viajes'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.textoSuave} />
          </Tarjeta>
        </Pressable>

        <Subtitulo derecha={<Text style={s.textoSuave}>Fuera del MVP</Text>}>Más adelante</Subtitulo>
        {['Verificar identidad y patente', 'Comunidades cerradas', 'Calificaciones'].map((t) => (
          <Text key={t} style={[s.textoSuave, { paddingVertical: espacio.xs }]}>{t}</Text>
        ))}
        <Subtitulo>Privacidad y seguridad</Subtitulo>
        <FilaEnlace icono="document-text-outline" texto="Términos de uso" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terminos' } })} />
        <FilaEnlace icono="lock-closed-outline" texto="Política de privacidad" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacidad' } })} />
        <Boton titulo="Eliminar mi cuenta" variante="secundario" onPress={confirmarEliminar} cargando={eliminando}
          icono={<Ionicons name="trash-outline" size={18} color={color.error} />} />

        {repo.esDemo && (
          <Text style={[s.textoSuave, { marginTop: espacio.l }]}>
            Modo demo: los datos viven solo en este teléfono. Configura Supabase en .env para usar datos reales.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaEnlace({ icono, texto, onPress }: { icono: keyof typeof Ionicons.glyphMap; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={[s.fila, { gap: espacio.m, minHeight: 48 }]}>
      <Ionicons name={icono} size={22} color={color.textoSuave} />
      <Text style={[s.texto, { flex: 1 }]}>{texto}</Text>
      <Ionicons name="chevron-forward" size={18} color={color.textoSuave} />
    </Pressable>
  );
}
