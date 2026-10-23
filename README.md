# Cuartos · Android

Aplicación para diseñar y decorar habitaciones con medidas reales, un plano 2D y una vista 3D sincronizada. Español e inglés, proyectos locales y funcionamiento sin conexión.

**Estado:** crear/guardar/reabrir habitaciones y abrir su plano 2D con cuadrícula, cotas, selección, pan y zoom táctil. ES/EN y funcionamiento local en Android. El plano permite añadir, editar y eliminar puertas/ventanas, validar sus medidas y guardarlas localmente. Incluye biblioteca local de acabados, colores personalizados y aplicación a piso o paredes. El catálogo incluye 16 muebles con arrastre, giro, duplicado, eliminación y ajuste a cuadrícula. El estado verificable de las entregas está en [STATUS](docs/STATUS.md).

## Fuente de verdad

El código, las decisiones y el historial se mantienen en GitHub. Los directorios temporales sirven para implementar y verificar cambios; no son una copia maestra. Cada etapa se entrega mediante Issue, rama, Pull Request y checks verdes.

La referencia de alcance es **Guia_App_Cuartos_v3.docx**, versión 3.0 de octubre de 2026, que sustituye las guías anteriores. La secuencia operativa está en [la hoja de ruta](docs/ROADMAP.md).

## Producto V1

- Habitaciones rectangulares, en L y dos espacios conectados.
- Puertas, ventanas, acabados y mobiliario genérico.
- Edición táctil en 2D y visualización 3D sobre un único modelo.
- Guardado local, deshacer/rehacer, importación y exportación.
- Android para teléfono y tablet, con interfaz completa ES/EN.

V1 no incorpora cuentas, backend, anuncios, pagos, IA, AR ni catálogos comerciales.

## Arquitectura aprobada

React + TypeScript + Vite; Zustand; Konva/react-konva; Three.js/React Three Fiber; Dexie/IndexedDB; i18next/react-i18next; Capacitor Android.

Node 24, dependencias con versiones fijadas y `package-lock.json`. Android: Capacitor 8, Java 21, minSdk 24 y compile/targetSdk 36. El nombre `Cuartos` y el applicationId `com.carlossan1993.cuartos` son de desarrollo y deberán ratificarse antes de la primera subida a Play.

## Compilar y comprobar

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run android:sync
cd android
./gradlew --no-daemon lintDebug testDebugUnitTest assembleDebug
```

GitHub Actions ejecuta esos controles en Ubuntu estándar y guarda `cuartos-debug` (APK de prueba) y `web-evidence` durante tres días. El APK debug sirve para pruebas; todavía no hay AAB release firmado. `testDebugUnitTest` no acredita pruebas de dispositivo ni dominio Android: todavía no hay lógica nativa propia que probar.

Los recursos de inicio, estilos, traducciones e iconos se incluyen en el paquete. No hay fuentes externas, analítica, cuentas ni servidor remoto. El Android de Capacitor conserva su permiso de Internet estándar; esta versión no hace solicitudes a servicios externos.

Evidencia de la pantalla inicial: [teléfono en inglés](docs/screenshots/home-phone.png) · [tablet en español](docs/screenshots/home-tablet.png). La ilustración es decorativa; no es todavía el editor interactivo.

Creación de habitación: [asistente](docs/screenshots/wizard-tablet.png) y [resumen guardado](docs/screenshots/room-tablet.png).

Plano interactivo: [teléfono ES](docs/screenshots/editor-phone.png) · [tablet EN](docs/screenshots/editor-tablet.png).

Puertas y ventanas: [teléfono ES](docs/screenshots/openings-phone.png) · [tablet EN](docs/screenshots/openings-tablet.png).

Acabados: [teléfono ES](docs/screenshots/finishes-phone.png) · [tablet EN](docs/screenshots/finishes-tablet.png).

Muebles 2D: [teléfono ES](docs/screenshots/furniture-phone.png) · [tablet EN](docs/screenshots/furniture-tablet.png).

## Trabajo y verificación

- [Cómo contribuir](CONTRIBUTING.md).
- [Instrucciones para agentes](AGENTS.md).
- [Arquitectura](docs/ARCHITECTURE.md).
- [Modelo de dominio y convenciones](docs/DOMAIN.md).
- [Guardado mínimo y creación de habitaciones](docs/STORAGE.md).
- [Editor 2D y gestos](docs/EDITOR_2D.md).
- [Puertas, ventanas y guardado de cambios](docs/OPENINGS.md).
- [Biblioteca de acabados y colores](docs/FINISHES.md).
- [Catálogo y edición de muebles 2D](docs/FURNITURE.md).
- [Decisiones iniciales](docs/decisions/0001-platform.md).
- [Estado y siguiente paso](docs/STATUS.md).
- [Configuración inicial de GitHub](docs/REPOSITORY_SETUP.md).

Verificación documental, sin instalar dependencias:

```sh
python3 scripts/check_docs.py
```

## Presupuesto y derechos

No se añaden herramientas, APIs, modelos, hosting ni servicios obligatorios de pago. La guía solo prevé como excepción el registro de Google Play Console; no se realizará ninguna compra desde este paquete.

No se ha elegido una licencia de distribución del código. La ausencia de `LICENSE` no concede una licencia de código abierto. La selección de licencia y la visibilidad del repositorio son decisiones independientes del uso de GitHub.
