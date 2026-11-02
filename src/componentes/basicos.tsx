// Componentes base de la interfaz: botón, tarjeta, campo, segmento, insignia de estado y filas de datos.
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import type { EstadoViaje } from '../datos';
import { color, espacio, radio, TOQUE_MINIMO } from '../tema';

type PropsBoton = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: ReactNode;
  estilo?: StyleProp<ViewStyle>;
};

export function Boton({ titulo, onPress, variante = 'primario', cargando, deshabilitado, icono, estilo }: PropsBoton) {
  const primario = variante === 'primario';
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        s.boton,
        primario ? s.botonPrimario : s.botonSecundario,
        inactivo && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={primario ? color.blanco : color.primario} />
      ) : (
        <View style={s.fila}>
          {icono}
          <Text style={[s.botonTexto, { color: primario ? color.blanco : color.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Tarjeta({ children, estilo, destacada }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; destacada?: boolean }) {
  return <View style={[s.tarjeta, destacada && { borderColor: color.primario, borderWidth: 2 }, estilo]}>{children}</View>;
}

export function Campo({ etiqueta, ...props }: TextInputProps & { etiqueta: string }) {
  return (
    <View style={{ gap: espacio.xs }}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <TextInput placeholderTextColor={color.textoSuave} style={s.campo} {...props} />
    </View>
  );
}

// Control segmentado tipo iOS.
export function Segmento<T extends string | number>({
  opciones, valor, onCambio,
}: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <View style={s.segmento}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => onCambio(o.valor)}
            style={[s.segmentoOpcion, activo && s.segmentoActivo]}
          >
            <Text style={[s.segmentoTexto, activo && { color: color.texto, fontWeight: '600' }]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TEXTO_ESTADO: Record<EstadoViaje, string> = {
  esperando_pasajeros: 'Esperando pasajeros',
  confirmado: 'Confirmado',
  en_curso: 'En curso',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

export function InsigniaEstado({ estado }: { estado: EstadoViaje }) {
  const esperando = estado === 'esperando_pasajeros';
  const apagado = estado === 'terminado' || estado === 'cancelado';
  return (
    <View style={[s.insignia, { backgroundColor: esperando ? color.avisoSuave : apagado ? color.fondoGris : color.primarioSuave }]}>
      <Text style={[s.insigniaTexto, { color: esperando ? color.aviso : apagado ? color.textoSuave : color.primario }]}>
        {TEXTO_ESTADO[estado]}
      </Text>
    </View>
  );
}

export function FilaDato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <View style={s.filaDato}>
      <Text style={s.textoSuave}>{etiqueta}</Text>
      <Text style={[s.valorDato, destacado && { color: color.primario }]} selectable>{valor}</Text>
    </View>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={s.titulo}>{children}</Text>;
}

export function Subtitulo({ children, derecha }: { children: ReactNode; derecha?: ReactNode }) {
  return (
    <View style={[s.fila, { justifyContent: 'space-between', marginTop: espacio.l }]}>
      <Text style={s.subtitulo}>{children}</Text>
      {derecha}
    </View>
  );
}

export function Estado({ cargando, error, vacio, onReintentar }: {
  cargando?: boolean; error?: string | null; vacio?: string; onReintentar?: () => void;
}) {
  if (cargando) return <ActivityIndicator style={{ marginTop: espacio.xl }} color={color.primario} />;
  if (error) {
    return (
      <View style={{ alignItems: 'center', gap: espacio.m, marginTop: espacio.xl }}>
        <Text style={s.textoSuave}>{error}</Text>
        {onReintentar && <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />}
      </View>
    );
  }
  return vacio ? <Text style={[s.textoSuave, { textAlign: 'center', marginTop: espacio.xl }]}>{vacio}</Text> : null;
}

export const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  boton: { minHeight: 52, borderRadius: radio.medio, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espacio.l },
  botonPrimario: { backgroundColor: color.primario },
  botonSecundario: { backgroundColor: color.fondoGris },
  botonTexto: { fontSize: 17, fontWeight: '600' },
  tarjeta: { backgroundColor: color.fondo, borderRadius: radio.medio, borderWidth: 1, borderColor: color.borde, padding: espacio.l },
  etiqueta: { fontSize: 13, color: color.textoSuave, fontWeight: '500' },
  campo: {
    minHeight: TOQUE_MINIMO + 4, backgroundColor: color.fondoGris, borderRadius: radio.chico,
    paddingHorizontal: espacio.m, fontSize: 17, color: color.texto,
  },
  segmento: { flexDirection: 'row', backgroundColor: color.fondoGris, borderRadius: radio.chico, padding: 3 },
  segmentoOpcion: { flex: 1, minHeight: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentoActivo: { backgroundColor: color.fondo, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segmentoTexto: { fontSize: 15, color: color.textoSuave },
  insignia: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  insigniaTexto: { fontSize: 12, fontWeight: '600' },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: espacio.m, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde, gap: espacio.m },
  valorDato: { fontSize: 15, fontWeight: '600', color: color.texto, flexShrink: 1, textAlign: 'right' },
  titulo: { fontSize: 30, fontWeight: '700', color: color.texto },
  subtitulo: { fontSize: 17, fontWeight: '600', color: color.texto },
  textoSuave: { fontSize: 14, color: color.textoSuave },
  texto: { fontSize: 15, color: color.texto },
});
