// Barra de pestañas inferior: Viajes, Publicar, Mis viajes y Perfil.
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { color } from '../../tema';

type NombreIcono = keyof typeof Ionicons.glyphMap;

function icono(nombre: NombreIcono) {
  return ({ color: c, size }: { color: ColorValue; size: number }) => <Ionicons name={nombre} size={size} color={c as string} />;
}

export default function Pestanas() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: color.primario, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Viajes', tabBarIcon: icono('map-outline') }} />
      <Tabs.Screen name="publicar" options={{ title: 'Publicar', tabBarIcon: icono('add-circle-outline') }} />
      <Tabs.Screen name="mis-viajes" options={{ title: 'Mis viajes', tabBarIcon: icono('calendar-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person-outline') }} />
    </Tabs>
  );
}
