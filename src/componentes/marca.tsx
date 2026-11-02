// Marca InTraffic: símbolo del logo con el nombre, para la pantalla de inicio y la bienvenida.
import { Image, Text, View } from 'react-native';
import { color } from '../tema';

const SIMBOLO = require('../../assets/marca/simbolo.png');

// Símbolo y nombre centrados; "tamano" es el alto del símbolo en puntos.
export function Marca({ tamano = 140 }: { tamano?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: tamano * 0.12 }} accessibilityRole="image" accessibilityLabel="InTraffic">
      <Image source={SIMBOLO} style={{ height: tamano, width: tamano * 0.652 }} resizeMode="contain" />
      <Text style={{ fontSize: tamano * 0.3, fontWeight: '800', color: color.texto, letterSpacing: -0.5 }}>InTraffic</Text>
    </View>
  );
}

// Pantalla completa con la marca, mientras la app se conecta.
export function PantallaInicio() {
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Marca tamano={160} />
    </View>
  );
}
