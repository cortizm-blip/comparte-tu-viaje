// Pago al conductor: precio final por persona y datos bancarios para copiar y transferir, o link de pago.
// La app no toca el dinero; el pasajero avisa que transfirió y el conductor lo confirma.
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Estado, FilaDato, s, Subtitulo, Tarjeta } from '../../../componentes/basicos';
import { repo, type CuentaCobro } from '../../../datos';
import { formatoCLP, precioPorPersona } from '../../../lib/precio';
import { color, espacio } from '../../../tema';
import { useCarga } from '../../../useCarga';

// Texto listo para pegar en la app del banco.
function textoTransferencia(c: CuentaCobro, monto: number): string {
  return [
    c.titular, `RUT ${c.rut}`, c.banco, `${c.tipoCuenta} ${c.numeroCuenta}`, c.email, `Monto ${formatoCLP(monto, false)}`,
  ].filter(Boolean).join('\n');
}

export default function Pago() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const abajo = useSafeAreaInsets().bottom;
  const [enviando, setEnviando] = useState(false);
  const { datos, cargando, error, recargar } = useCarga(async () => {
    const [viaje, cuenta, estado] = await Promise.all([repo.obtenerViaje(id), repo.cuentaCobroDeViaje(id), repo.miPago(id)]);
    return { viaje, cuenta, estado };
  }, [id]);

  if (!datos?.viaje) return <Estado cargando={cargando} error={error} onReintentar={recargar} />;
  const { viaje, cuenta, estado } = datos;
  const monto = precioPorPersona(viaje.costoTotal, viaje.inscritos);
  const nombre = viaje.conductor.nombre.split(' ')[0];

  async function yaTransferi() {
    setEnviando(true);
    try {
      await repo.informarPago(viaje!.id);
      await recargar();
    } catch (e) {
      Alert.alert('No se pudo avisar', e instanceof Error ? e.message : '');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: 120 + abajo }}>
        <Tarjeta estilo={{ alignItems: 'center', gap: 4 }}>
          <Text style={s.textoSuave}>Precio final por persona · {viaje.inscritos} pasajeros</Text>
          <Text style={{ fontSize: 44, fontWeight: '800', color: color.texto }}>{formatoCLP(monto)}</Text>
          <Text style={s.textoSuave}>Costo total {formatoCLP(viaje.costoTotal)} repartido entre {viaje.inscritos}</Text>
        </Tarjeta>

        <Subtitulo>Transfiere directo a {nombre}</Subtitulo>
        {cuenta ? (
          <>
            <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
              <FilaDato etiqueta="Nombre" valor={cuenta.titular} />
              <FilaDato etiqueta="RUT" valor={cuenta.rut} />
              <FilaDato etiqueta="Banco" valor={cuenta.banco} />
              <FilaDato etiqueta="Cuenta" valor={`${cuenta.tipoCuenta} ${cuenta.numeroCuenta}`} />
              {cuenta.email && <FilaDato etiqueta="Email" valor={cuenta.email} />}
              <FilaDato etiqueta="Monto" valor={formatoCLP(monto, false)} destacado />
            </Tarjeta>
            <Boton titulo="Copiar datos" variante="secundario" icono={<Ionicons name="copy-outline" size={18} color={color.texto} />}
              onPress={async () => {
                await Clipboard.setStringAsync(textoTransferencia(cuenta, monto));
                Alert.alert('Datos copiados', 'Pégalos en la app de tu banco.');
              }} />
            {cuenta.linkPago && (
              <Boton titulo="Pagar con link de pago" variante="secundario" onPress={() => Linking.openURL(cuenta.linkPago!)} />
            )}
          </>
        ) : (
          <Text style={s.textoSuave}>El conductor no dejó datos de cobro. Coordina el pago directamente con {nombre}.</Text>
        )}
        <Text style={s.textoSuave}>La app no toca tu dinero: transfieres desde tu banco y {nombre} confirma que le llegó.</Text>
        {estado !== 'pendiente' && (
          <View style={[s.fila, { backgroundColor: color.primarioSuave, padding: espacio.m, borderRadius: 10 }]}>
            <Ionicons name={estado === 'confirmado' ? 'checkmark-circle' : 'time-outline'} size={20} color={color.primario} />
            <Text style={[s.texto, { flex: 1 }]}>
              {estado === 'confirmado' ? `${nombre} confirmó tu pago. ¡Gracias!` : `Avisaste que transferiste. ${nombre} lo confirmará.`}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: espacio.l, paddingBottom: abajo + espacio.s, backgroundColor: color.fondo }}>
        {estado === 'pendiente' ? (
          <Boton titulo="Ya transferí" onPress={yaTransferi} cargando={enviando} />
        ) : (
          <Boton titulo="Volver a mis viajes" variante="secundario" onPress={() => router.replace('/mis-viajes')} />
        )}
      </View>
    </View>
  );
}
