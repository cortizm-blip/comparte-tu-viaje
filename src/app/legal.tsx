// Términos de uso o Política de privacidad, según el parámetro "doc".
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { s } from '../componentes/basicos';
import { DOCUMENTOS, type DocumentoLegal } from '../legal';
import { color, espacio } from '../tema';

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: DocumentoLegal }>();
  const documento = DOCUMENTOS[doc === 'privacidad' ? 'privacidad' : 'terminos'];
  return (
    <ScrollView style={{ backgroundColor: color.fondo }} contentContainerStyle={{ padding: espacio.l, gap: espacio.l, paddingBottom: espacio.xl * 2 }}>
      <Stack.Screen options={{ title: documento.titulo }} />
      {documento.secciones.map((sec) => (
        <View key={sec.titulo} style={{ gap: espacio.xs }}>
          <Text style={s.subtitulo} accessibilityRole="header">{sec.titulo}</Text>
          <Text style={s.texto}>{sec.texto}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
