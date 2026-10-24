# QA bilingüe y regresión · Etapa 18

Issue [#33](https://github.com/carlossan1993/cuartos-android/issues/33). La implementación automatizada puede integrarse con revisión técnica y CI verdes; **la etapa no se cierra ni se habilita distribución en Play mientras falte la evidencia física indicada abajo**. La confirmación del propietario sobre el aspecto/funcionamiento de la APK anterior no acredita cada uno de estos casos.

## Matriz reproducible de navegador

La regresión detallada previa contiene 78 E2E (teléfono ES / tablet EN). Se conserva y se añade una matriz de 24 escenarios: tres formas × dos idiomas × dos tamaños × dos orientaciones. Cada escenario crea el diseño mediante UI, sin sembrar Project ni simular un puente nativo.

| Proyecto | Viewport CSS | DPR | Idioma | Formas por verificar |
| --- | --- | --- | --- | --- |
| phone-es-portrait | 412 × 839 | 2.625 | ES | Rectángulo, L, dos espacios |
| phone-es-landscape | 839 × 412 | 2.625 | ES | Rectángulo, L, dos espacios |
| phone-en-portrait | 412 × 839 | 2.625 | EN | Rectángulo, L, dos espacios |
| phone-en-landscape | 839 × 412 | 2.625 | EN | Rectángulo, L, dos espacios |
| tablet-es-portrait | 768 × 1024 | 1 | ES | Rectángulo, L, dos espacios |
| tablet-es-landscape | 1024 × 768 | 1 | ES | Rectángulo, L, dos espacios |
| tablet-en-portrait | 768 × 1024 | 1 | EN | Rectángulo, L, dos espacios |
| tablet-en-landscape | 1024 × 768 | 1 | EN | Rectángulo, L, dos espacios |

En cada combinación: puerta guardada, acabado azul #03038c, catálogo de 16 piezas y silla añadida; giro/deshacer/rehacer con comparación del diseño confirmado; 2D/3D/vista superior/vista abierta sin alterar datos; PNG 1024 × 768; JSON íntegro e importación como copia sin sobrescribir el original; recarga/reapertura sin historial de sesión. Se comprueban controles por nombre en el idioma, ausencia de errores JS/desbordamiento horizontal y capturas del plano y 3D.

El navegador permite localhost y bloquea recursos externos: demuestra independencia de servicios remotos, **no arranque web sin servidor**. El funcionamiento con Wi-Fi/datos desactivados se comprueba en el APK del emulador, donde los activos están empaquetados. No se añade un service worker ni un cambio de producción para satisfacer una prueba web.

## Cobertura detallada y límites

| Área | Evidencia automatizada | Límite / pendiente |
| --- | --- | --- |
| ES/EN | Recursos con mismas claves/no vacíos; nombres de acciones en las ocho combinaciones; selector persistido | Lectura y anuncios con TalkBack real |
| Creación y formas | Validaciones de dominio/asistente, medidas cm/m, L/dos espacios y 24 escenarios | Ergonomía y texto ampliado en equipos físicos |
| Aberturas/acabados/muebles | Suite detallada de editar/mover/girar/duplicar/borrar, 16 representaciones, geometría y validación; altas en matriz | Gestos prolongados reales y precisión táctil |
| Historial y guardado | CAS, fallos, commits retenidos, conflictos, sesiones y límites; undo/redo y copia JSON en matriz | Presión de almacenamiento real y muerte del proceso por memoria |
| 2D/3D/PNG | Píxeles/DPR/resoluciones, cámara, contexto perdido, presupuestos y liberación; capturas en ocho combinaciones | Calidad/fluidez y temperaturas en GPU física |
| Archivos | JSON/versiones futuras/corruptos, importación independiente, PNG y puente simulado en regresión; selector Android real en smoke | Guardar/leer con proveedores externos y Share real |
| Navegación/paneles | Prioridad/bloqueo/listeners, foco/Tab/inert, orientación y borradores; Atrás real del APK en smoke | Gesto Atrás, IME, TalkBack y teclado físico |
| Gestión offline | Renombrar/copiar/eliminar, conflictos y reapertura; APK sin Wi-Fi/datos y después de force-stop | Instalación/actualización y reapertura en teléfonos/tablets reales |

La matriz amplia no sustituye las pruebas detalladas; tampoco se afirma que cada caso de fallo se haya repetido en las ocho combinaciones. Las pruebas de compatibilidad conservan versiones futuras, IDs/materiales desconocidos y registros anteriores; no se migra ni reescribe el esquema 1.

## Smoke de APK en Android real emulado

Web y compilación Android se ejecutan en paralelo; ambos siguen siendo obligatorios antes de integrar. Job `android-smoke`, después del build Android: reutiliza **el mismo APK debug** de `cuartos-debug`, sin recompilarlo ni modificarlo. AVD desechable Pixel 7, Android API 35 Google APIs x86_64, KVM y GPU SwiftShader; paquete `com.carlossan1993.cuartos`. Playwright 1.58.2 se conecta al WebView de depuración de Capacitor mediante ADB. Es la API Android experimental ya incluida en la dependencia fijada; no hay librería de producción nueva, hook de prueba, puerto remoto de producción ni puente simulado.

Se exige un único serial `emulator-*` y `ro.kernel.qemu=1`, sin proyectos previos; no se borran datos ni se permite ejecutar este script en dispositivos físicos. Por cada forma en ES/EN (seis casos):

1. Activar modo avión y desactivar Wi-Fi/datos; esperar modo avión 1, Wi-Fi 0 y Android sin red predeterminada activa (`Active default network: none`) en cada lanzamiento; conservar el dump para revisión. `navigator.onLine` se registra como dato informativo: en este APK siguió en true con el AVD desconectado. Registrar también la preferencia de datos móviles, que no equivale al estado efectivo de radio por SIM. Lanzar la actividad, comprobar plataforma `android`, crear mediante UI puerta/acabado/mueble.
2. Abrir catálogo; si Android informa IME visible, comprobar que el primer Atrás oculta el teclado y conserva el panel. El siguiente Atrás cierra el catálogo; registrar `imeDismissed`. A continuación, entrar en 3D, girar a horizontal/vertical y capturar.
3. Enviar Home y reactivar la actividad; si el WebView perdió el contexto, usar el reintento ofrecido y registrar `contextRecovered`; Atrás vuelve de 3D a 2D y resumen conservando el Project.
4. Guardar JSON abre el selector real de documentos; capturarlo, cancelar con Atrás y comprobar aviso/datos intactos. No se selecciona destinatario ni se comparte un archivo.
5. Registrar PID; `am force-stop`, comprobar que desaparece, relanzar y registrar PID nuevo. Idioma y Project completos conservados, plano visible e historial vacío.

`report.json` registra estado global, casos, modelo/API/fingerprint/WebView, conectividad y PIDs. Un fallo mantiene salida distinta de cero y captura/logcat; no se convierte en éxito ni se omite automáticamente. Las capturas completas provienen de `screencap` vía ADB, incluyendo el selector del sistema. Este smoke no equivale a un perfilado ni a una prueba física; force-stop demuestra reapertura tras terminar el proceso, no presión de memoria ni restauración del formulario provisional.

## Ejecutar y consultar evidencia

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundles
npx playwright install --only-shell chromium
npm run test:e2e
npm run test:qa
```

Para smoke se requiere Linux con Android SDK, KVM y un entorno de AVD desechable; colocar el APK comprobado en `test-results/apk/app-debug.apk`, definir `ANDROID_HOME` del SDK y ejecutar `bash scripts/run-android-smoke.sh`. El selector se reconoce por una ventana DocumentsUI simultáneamente visible y en pantalla en el diagnóstico de Android API 35; cinco pruebas de comportamiento rechazan ventanas ocultas, estados mezclados y referencias de otros procesos. El script instala la imagen API 35, fija las ubicaciones Android de usuario/emulador/AVD a un directorio temporal propio, comprueba el registro del AVD antes de arrancarlo y lo apaga con tiempo de arranque acotado y fallo inmediato si el proceso termina; no ejecutar sobre un AVD con datos que se quieran conservar.

Validación local: lint/typecheck/build, presupuestos, enlaces y sintaxis shell correctos; 297 Vitest + dos Node y 24/24 casos nuevos (Chromium 153/SwiftShader, sin omisiones ni reintentos en la ejecución final). Las capturas teléfono EN horizontal/tablet ES vertical se revisaron. No se atribuye al navegador el smoke Android: su ejecución pertenece al job de CI.

Los resultados finales se registran en el PR antes de integrar: head/CI, conteos reales, captura revisada y APK. `web-evidence` conserva `regression.json`, `qa-matrix.json`, presupuestos, capturas y trazas fallidas; `android-reports` contiene lint/cinco JVM; `android-smoke-evidence`, resultados/capturas/logcat del emulador. Retención tres días. Las trazas Playwright se limpian en subdirectorios propios para no eliminar el informe de bundles generado antes de las pruebas.

Fuentes primarias: [Playwright Android](https://playwright.dev/docs/api/class-android), [WebView page](https://playwright.dev/docs/api/class-androidwebview), [aceleración del emulador](https://developer.android.com/studio/run/emulator-acceleration), [línea de comandos](https://developer.android.com/studio/run/emulator-commandline). Se registra la versión efectiva del WebView del AVD; no se atribuye a él la versión Chrome del navegador de CI.

## Registro físico pendiente y puerta de avance

No hay dispositivos Android físicos conectados en este entorno. Completar cada fila con modelo, Android/WebView, idioma/orientación, APK/commit, fecha, pasos, resultado observado y evidencia. Si no se ejecutó, registrar **pendiente**, nunca aprobado por deducción.

| ID | Prueba física | Estado |
| --- | --- | --- |
| P01 | Instalar/actualizar, arrancar sin red y reabrir diseño completo en teléfono y tablet | Pendiente |
| P02 | Atrás por botón/gesto y operación pendiente; IME abierto/cerrado, campos/acciones alcanzables | Pendiente |
| P03 | TalkBack ES/EN, orden/etiquetas/anuncios, teclado físico y escala de fuente/pantalla | Pendiente |
| P04 | Guardar JSON/PNG en proveedor elegido, importar desde proveedor y Share a app elegida | Pendiente |
| P05 | Suspensión, cierre/muerte del proceso, presión real de memoria/almacenamiento y recuperación sin corrupción | Pendiente |
| P06 | CPU/GPU/memoria, arranque frío/caliente, frames lentos, consumo/temperatura con las tres escenas de etapa 17 | Pendiente |
| P07 | Nitidez/contraste/sombras, orientación y gestos en diferentes densidades de teléfono/tablet | Pendiente |

Resultado por fila: aprobado con evidencia, fallo con Issue, pendiente o no aplicable justificado. Defectos que pierdan/sobrescriban datos, impidan uso básico, tengan riesgo de privacidad o bloqueen accesibilidad quedan abiertos como bloqueantes. Los demás se priorizan con evidencia. Por instrucción expresa del propietario del 24 de octubre de 2026 se permite preparar materiales/compilación de la etapa 19 con estos pendientes. No cerrar #33 ni distribuir en Play mientras la puerta física permanezca pendiente.

## Automatización integrada
[PR #34](https://github.com/carlossan1993/cuartos-android/pull/34), merge eff2d20e58ea2ff553fe69c6cc22d16f9ea5461c; [CI 40104110524](https://github.com/carlossan1993/cuartos-android/actions/runs/40104110524), head c475a168eba50b931aef0da2b5dd2bb2b43510d0: 302 Vitest + dos Node, 78 regresión + 24 matriz = 102 E2E, Android/JVM y seis flujos AVD correctos. En los seis casos imeDismissed=false y contextRecovered=false: no acreditar esas ramas como ejercidas nativamente. Esta evidencia no cierra P01–P07.
