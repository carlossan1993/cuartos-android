# Preparación Play Store · Etapa 19
Issue [#35](https://github.com/carlossan1993/cuartos-android/issues/35). Se prepara por autorización expresa del propietario aunque QA física [#33](https://github.com/carlossan1993/cuartos-android/issues/33) siga abierta. Esto no acredita sus pruebas ni habilita distribución. No se inicia etapa 20 en este chat.

## Material preparado
- Ficha y notas ES/EN: [es-419](../play/listing/es-419.json), [en-US](../play/listing/en-US.json). Límites 30/80/4000 caracteres y notas 500 comprobados por `npm run play:check`.
- Identidad de trabajo conservada: Cuartos, com.carlossan1993.cuartos, versión 0.1.0 (1), minSdk 24, targetSdk 36. Ratificar antes de la primera subida; el identificador del paquete queda ligado a la app en Play.
- Política ES/EN: [fuente única](../src/privacy/content.json), accesible desde el pie del inicio mediante panel modal sin red. `npm run build` genera public/privacy/es.html y en.html para el paquete y para hosting estático. El smoke del APK abre el panel en ES/EN sin red y lo cierra mediante Atrás nativo comprobando que los proyectos no cambien. Contacto público confirmado: csdigital.apps@gmail.com, con enlace mailto en ES/EN. Por instrucción del propietario, la política no incluye nombre personal ni enlace a GitHub. Hosting elegido: Firebase, sin añadir SDK Firebase a la app.
- Declaraciones propuestas y revisión de SDK/permisos: [DATA_SAFETY](../play/DATA_SAFETY.md).
- Icono PNG de 32 bits (RGBA opaco), 512 × 512, a partir del símbolo existente, cuadrado sin premáscara ni mensajes promocionales; azul #03038c. Feature graphic 1024 × 500 ES/EN con una vista real del renderer, sin prometer funciones futuras.
- Dieciséis capturas: cuatro pantallas (plano, 3D, catálogo, resumen) × teléfono/tablet × ES/EN. Teléfono 1080 × 1920; tablet 1200 × 1920. PNG RGB opaco, sin marco de dispositivo, overlay promocional ni contenido externo.
- Las capturas proceden de la app en Chromium con viewport/DPR emulados. No son capturas de hardware Android ni acreditan QA física. Deben contrastarse con el build instalado desde Play en etapa 20; reemplazar si difieren.
- El paquete de CI `cuartos-play-listing` conserva gráficos, capturas, procedencia/commit, dimensiones, SHA-256, fichas y HTML durante 90 días. Fuentes y generación quedan en git: no depende de que ese artifact siga disponible.

## Reproducir
```sh
npm ci
npm run build
npm run play:check
npx playwright install --only-shell chromium
npm run play:assets
python3 scripts/normalize-play-images.py
node scripts/play-preview.mjs
npm run android:sync
cd android
./gradlew --no-daemon lintRelease testReleaseUnitTest bundleRelease
cd ..
python3 scripts/check-aab.py
```

`cuartos-release-unsigned` contiene el AAB **sin firma**, SHA-256 y diagnóstico: sirve para comprobar compilación/paquete y no es un archivo listo para subir a Play. Se comprueba WebView sin depuración, backup desactivado, API 36/24 y HTML incluido. Se esperan INTERNET y el permiso privado de receptores AndroidX, que se exige declarado con protectionLevel=signature; ningún otro permiso. La inspección del ZIP inventaría .so y falla si aparece alguna hasta auditar ELF/alineación de 16 KB. Si no hay .so, no se afirma haber ejecutado un emulador de 16 KB; WebView lo suministra Android.

## Publicar la política en Firebase
El propietario eligió Firebase Hosting, en el proyecto propio de Cuartos, igual que en sus otras apps. No usar GitHub Pages ni los proyectos de Colorimbo/Fourier Art. El ID de proyecto y el sitio de Cuartos todavía no están identificados ni hay publicación verificada.

La configuración [firebase.json](../firebase.json) publica únicamente docs/privacy mediante el target cuartos-privacy. No despliega la app web, Functions, Firestore, Auth ni otros servicios; la app Android conserva funcionamiento offline y no incorpora SDK Firebase. Se sirven páginas HTML estáticas ES/EN, sin scripts, formularios o recursos remotos, con caché breve y cabeceras de seguridad.

Desde una sesión Firebase CLI autorizada del propietario (por ejemplo Cloud Shell), y después de disponer del ID real de Cuartos y de su sitio Hosting:

```sh
# Situarse en el checkout actualizado de este repositorio.
# Revisar primero que el ID corresponde a Cuartos.
node scripts/privacy-pages.mjs docs/privacy
firebase hosting:sites:list --project ID_PROYECTO_CUARTOS
# Solo si aún no existe el sitio, crearlo con su ID elegido:
# firebase hosting:sites:create ID_SITIO_CUARTOS --project ID_PROYECTO_CUARTOS
firebase target:apply hosting cuartos-privacy ID_SITIO_CUARTOS --project ID_PROYECTO_CUARTOS
firebase deploy --only hosting:cuartos-privacy --project ID_PROYECTO_CUARTOS
```

Los nombres ID_PROYECTO_CUARTOS e ID_SITIO_CUARTOS son marcadores, no IDs reales ni proyectos creados. No ejecutar con ellos sin reemplazarlos. El mapeo del target se guarda en .firebaserc; una vez conocidos los IDs correctos se puede registrar ese mapeo público en git. No guardar credenciales.

Abrir las URLs HTTPS reales /es.html y /en.html del sitio publicado sin autenticación. Verificar título, versión 2026-10-24.2, correo, ausencia de nombre personal/enlaces GitHub y paridad con la app. Registrar la URL española efectiva en play/release.json solo tras comprobarla; no fabricar un dominio a partir de un nombre de proyecto supuesto.

Fuentes: [Hosting y CLI](https://firebase.google.com/docs/hosting/quickstart), [targets por sitio](https://firebase.google.com/docs/hosting/multisites). No contratar servicios ni activar facturación para esta preparación estática. La creación de un proyecto ya no implica que exista un sitio Hosting: comprobarlo antes de desplegar.

## Clave de carga y AAB firmado
La clave privada y sus contraseñas son del propietario. **No generarlas aquí ni incluirlas en el repositorio, logs, artifacts, Library o chat.** Este entorno no dispone de una clave de carga del propietario y no se inventa una. No usar la clave debug de Android para Play.

Si aún no existe clave, el propietario puede crearla en su equipo con Android Studio (Generate Signed Bundle / APK → Android App Bundle → Create new), conservar una copia privada y respaldada y usar Play App Signing para que Google gestione la clave de firma de distribución. La clave de carga y la clave de firma de Play cumplen funciones diferentes.

Una vez completados datos del propietario y URL pública se puede preparar la firma; QA física sigue bloqueando distribución:
1. Ratificar nombre/paquete/público, completar correo y URL en [release.json](../play/release.json), marcar las confirmaciones solo con evidencia real y verificar versión/code para la primera subida.
2. Crear el entorno GitHub `play-upload` con protección por revisión del propietario y restricción a main. Configurar en ese entorno los secrets ANDROID_UPLOAD_KEYSTORE_BASE64, ANDROID_UPLOAD_STORE_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS y ANDROID_UPLOAD_KEY_PASSWORD. Base64 no cifra una clave: debe guardarse como secret.
3. Configurar la variable pública ANDROID_UPLOAD_CERT_SHA256 con la huella SHA-256 del certificado esperado, obtenida de la copia custodiada. No contiene la clave privada.
4. Ejecutar manualmente [Signed upload AAB](../.github/workflows/release-aab.yml) desde main con la confirmación de preflight. El workflow no se ejecuta en PR, no genera claves ni sube a Play. El preflight de firma falla si faltan datos y consulta la URL para comprobar HTML público con la versión de privacidad incluida. La preparación de firma no distribuye la app; QA física sigue siendo necesaria antes de subir/distribuir.
5. La clave se decodifica solo en un temporal del runner, con permisos 600 y limpieza al salir; Gradle recibe contraseñas mediante entorno. Se verifica la huella esperada y la firma JAR con confianza explícita en el keystore. Solo se publica el AAB firmado, SHA-256 y reportes públicos, nunca el keystore.
6. Descargar el artifact firmado, comprobar SHA-256, registrar commit/run/huella pública y conservarlo. Configurar Play App Signing durante la primera subida en el siguiente chat.

La ruta manual está preparada, pero **no se afirma ejecutada** sin secretos y resultado real. La firma es condición de cierre pendiente; el AAB sin firma no la sustituye.

## Pendientes de cierre
- Contacto confirmado: csdigital.apps@gmail.com. Quedan por ratificar identidad de publicación/nombre/paquete y audiencia.
- HTML en URL pública HTTPS y comprobación sin login.
- Clave de carga bajo custodia del propietario y AAB firmado/verificado.
- P01–P07 de QA física, registrados en [QA](QA.md), antes de distribuir.
- Cargar y verificar formularios/materiales en Play no se realiza en este chat; corresponde a la continuación.

No marcar la etapa 19 completa mientras falten URL, ratificaciones o firma. La aceptación de la apariencia por el propietario permite integrar esta preparación reversible y no reemplaza esos hechos.

## Fuentes verificadas el 24 de octubre de 2026
- [Recursos gráficos y capturas](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
- [Ficha y límites](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).
- [Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en): nuevas apps/actualizaciones API 36 desde el 31 de agosto de 2026; volver a comprobar al enviar.
- [Firma y Play App Signing](https://developer.android.com/studio/publish/app-signing).
- [Tamaños de página de 16 KB](https://developer.android.com/guide/practices/page-sizes).
