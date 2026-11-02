// Cuenta de cobro del conductor: datos de transferencia y link de pago opcional.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, Text } from 'react-native';
import { Boton, Campo, s } from '../componentes/basicos';
import { repo, type CuentaCobro } from '../datos';
import { rutValido } from '../lib/rut';
import { color, espacio } from '../tema';

const VACIA: CuentaCobro = { titular: '', rut: '', banco: '', tipoCuenta: 'Cuenta vista', numeroCuenta: '', email: null, linkPago: null };

export default function CuentaCobroPantalla() {
  const [c, setC] = useState<CuentaCobro>(VACIA);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    repo.miCuentaCobro().then((x) => x && setC(x)).catch(() => {});
  }, []);

  const campo = (k: keyof CuentaCobro) => (v: string) => setC({ ...c, [k]: v });

  async function guardar() {
    if (!c.titular.trim() || !c.banco.trim() || !c.numeroCuenta.trim()) {
      Alert.alert('Falta algo', 'Completa titular, banco y número de cuenta.');
      return;
    }
    if (!rutValido(c.rut)) {
      Alert.alert('RUT inválido', 'Revisa el RUT y su dígito verificador.');
      return;
    }
    if (c.linkPago && !/^https:\/\//.test(c.linkPago.trim())) {
      Alert.alert('Link inválido', 'El link de pago debe empezar con https://');
      return;
    }
    setGuardando(true);
    try {
      await repo.guardarCuentaCobro({ ...c, email: c.email?.trim() || null, linkPago: c.linkPago?.trim() || null });
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : '');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m }} keyboardShouldPersistTaps="handled">
        <Text style={s.textoSuave}>
          Tus pasajeros verán estos datos solo cuando se inscriban en tu viaje, para transferirte directo.
        </Text>
        <Campo etiqueta="Titular" value={c.titular} onChangeText={campo('titular')} autoCapitalize="words" />
        <Campo etiqueta="RUT" value={c.rut} onChangeText={campo('rut')} placeholder="12.345.678-9" autoCapitalize="characters" />
        <Campo etiqueta="Banco" value={c.banco} onChangeText={campo('banco')} placeholder="Ej: BancoEstado" />
        <Campo etiqueta="Tipo de cuenta" value={c.tipoCuenta} onChangeText={campo('tipoCuenta')} placeholder="Cuenta vista, corriente o RUT" />
        <Campo etiqueta="Número de cuenta" value={c.numeroCuenta} onChangeText={campo('numeroCuenta')} keyboardType="number-pad" />
        <Campo etiqueta="Email (opcional)" value={c.email ?? ''} onChangeText={campo('email')} keyboardType="email-address" autoCapitalize="none" />
        <Campo etiqueta="Link de pago (opcional)" value={c.linkPago ?? ''} onChangeText={campo('linkPago')} autoCapitalize="none"
          placeholder="https://" keyboardType="url" />
        <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
