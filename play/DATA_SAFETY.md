# Declaraciones propuestas · Odamus
Revisión del código V1 y fuentes oficiales: 24 de octubre de 2026. Son respuestas preparadas para contrastar con el formulario vigente, no declaraciones enviadas a Play. El responsable debe revisar todas las versiones/tracks que estén activos en ese momento.

| Pregunta / apartado | Respuesta propuesta y fundamento |
| --- | --- |
| ¿Recopila o comparte datos de los tipos requeridos? | No, según el comportamiento actual: proyectos y preferencias permanecen en el dispositivo; no hay servidor, analítica, anuncios ni SDK de seguimiento. |
| Tipos de datos: ubicación, personales, financieros, salud, mensajes, fotos/vídeos, audio, archivos/documentos, calendario, contactos, actividad, navegación, información/rendimiento, dispositivo/otros IDs | No seleccionar datos como recopilados por el desarrollador solo por existir localmente. Importar un JSON elegido no lo transmite fuera del equipo. Revisar cambios de SDK y el AAB final antes de enviar. |
| Archivos/Share | Exportación elegida por el usuario a un proveedor o destinatario. La excepción de compartir por acción explícita puede aplicar según la definición oficial; el servicio receptor sigue su propia política. No afirmar que los archivos nunca puedan salir del dispositivo. |
| Cifrado en tránsito | No afirmar que los proyectos se transmiten cifrados: la app no los transmite al desarrollador. Si el formulario no muestra esta pregunta al declarar que no recopila, no inventar una respuesta. |
| Eliminación de cuentas | No hay creación de cuentas ni inicio de sesión. No se necesita fabricar un enlace de eliminación de cuenta. Los proyectos locales se eliminan en la lista o borrando datos/desinstalando; archivos exportados se eliminan por separado. |
| Identificadores y publicidad | Sin AD_ID, Android ID, ID de anuncios, App Set ID ni SDK publicitario en el código de la app. Los UUID de proyectos/muebles son locales y no se transmiten. |
| Acceso a la app | Todas las funciones disponibles sin credenciales; no proporcionar cuenta ficticia para revisión. |
| Anuncios / compras | No contiene anuncios ni compras dentro de la app. Sin monetización V1. |
| Categoría | Propuesta: Casa y hogar / House & Home; confirmar en la consola. |
| Público objetivo | Confirmado por el propietario: adolescentes y adultos, 13+. Franjas previstas: 13–15, 16–17 y 18 años o más; sin enfoque infantil. No equivale al resultado del cuestionario IARC. |
| Clasificación de contenido | Completar el cuestionario con funciones reales. No prometer una clasificación antes de que la consola la determine. |
| Salud, finanzas y noticias | No son la función de esta app. Responder al formulario vigente según corresponda. |
| Política | Texto ES/EN incluido offline; HTML generado con la misma fuente. Firebase Hosting del proyecto/sitio cuartos-42b27. URLs públicas HTTPS verificadas el 24 de octubre de 2026: https://cuartos-42b27.web.app/es.html y https://cuartos-42b27.web.app/en.html. Coinciden con la política offline; no hay SDK Firebase en la app. |
| Contacto | csdigital.apps@gmail.com, confirmado por el propietario para política y ficha de Play. Sin nombre personal ni enlace GitHub en la política. El enlace mailto abre el cliente de correo; la app no envía mensajes automáticamente. |

## Alcance de la revisión técnica
- Dependencias directas fijadas en package.json: React, almacenamiento local Dexie/Zustand, render Konva/Three, i18next y Capacitor App/Filesystem/Share. Sin SDK de anuncios/analítica.
- Fuentes: src/storage, src/files/native-files.ts, src/files/file-delivery.ts, src/privacy/content.json y AndroidManifest.xml. El permiso INTERNET estándar se conserva, sin llamadas automáticas a servicios externos desde la app.
- La política explica la caché de exportación: limpieza oportunista de carpetas mayores de 24 horas, no una promesa de eliminación exacta.
- La política no promete cifrado propio del almacenamiento local. Android controla el sandbox y sus protecciones del dispositivo.
- El contacto se realiza mediante el cliente de correo por decisión del usuario; el desarrollador recibe solo el mensaje que este envíe. La política describe ese uso para soporte y la posibilidad de solicitar eliminación. Firebase aloja exclusivamente la página pública de privacidad; no se añade un SDK, backend o analítica a la app.
- CI inspecciona permisos del manifiesto release fusionado, debuggable, backup y bibliotecas nativas del AAB. Se esperan INTERNET y el permiso privado de AndroidX com.carlossan1993.cuartos.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, cuya declaración debe tener protectionLevel=signature; no da acceso a datos personales ni requiere consentimiento runtime. Cualquier otro permiso o biblioteca .so nueva bloquea la verificación hasta revisarla.
- Este análisis respalda un borrador, no una certificación legal ni una aprobación de Google. Si cambian SDK, comunicaciones o funciones, revisar política y declaraciones.

## Fuentes primarias
- [Definiciones de recopilación, tratamiento local y excepciones de compartir](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- [Política de datos de usuario y privacidad](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- [Ficha, límites y correo público de soporte](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).

Fuente del permiso interno: [manifiesto AndroidX Core](https://android.googlesource.com/platform/prebuilts/sdk/+/dbc89592d1bcb88ed9718f2b8d4f117ebb74547f/current/androidx/manifests/androidx.core_core/AndroidManifest.xml). La inspección no retira esta protección para obtener un check verde.
