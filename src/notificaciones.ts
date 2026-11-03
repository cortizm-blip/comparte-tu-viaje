// Notificaciones push: permisos, token de Expo y navegación al tocar un aviso.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { repo } from './datos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Obtiene el token de Expo y lo guarda. Solo pide permiso con "pedir" (en contexto: al inscribirse,
// publicar o seguir un viaje); al abrir la app solo registra si ya estaba concedido. En simulador no hace nada.
export async function registrarPush({ pedir = false } = {}): Promise<string | null> {
  if (!Device.isDevice) return null;
  const actual = await Notifications.getPermissionsAsync();
  if (!actual.granted && !pedir) return null;
  const permiso = actual.granted ? actual : await Notifications.requestPermissionsAsync();
  if (!permiso.granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await repo.guardarPushToken(token);
  return token;
}

// Al tocar una notificación abre el viaje correspondiente (en curso si el conductor viene llegando).
export function escucharToques(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const datos = r.notification.request.content.data as { viajeId?: string; tipo?: string };
    if (!datos?.viajeId) return;
    router.push(datos.tipo === 'conductor_llegando' ? `/viaje/${datos.viajeId}/en-curso` : `/viaje/${datos.viajeId}`);
  });
  return () => sub.remove();
}
