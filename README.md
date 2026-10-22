# Cuartos · Android

Aplicación para diseñar y decorar habitaciones con medidas reales, un plano 2D y una vista 3D sincronizada. Español e inglés, proyectos locales y funcionamiento sin conexión.

**Estado:** etapa 0 en revisión. Base de gobierno del repositorio; todavía no hay aplicación instalable. El estado verificable está en [STATUS](docs/STATUS.md).

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

Las dependencias y versiones se incorporarán con lockfile en la etapa 1. No se presenta un scaffold web como una app Android terminada.

## Trabajo y verificación

- [Cómo contribuir](CONTRIBUTING.md).
- [Instrucciones para agentes](AGENTS.md).
- [Arquitectura](docs/ARCHITECTURE.md).
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
