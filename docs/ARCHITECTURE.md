# Arquitectura aprobada

## Plataforma

Android distribuido por Google Play; núcleo web incluido en el paquete mediante Capacitor. La app instalada no depende de un servidor para abrir y editar proyectos. No se utiliza Sites ni una web publicada como sustituto del entregable Android.

| Capa | Herramienta | Responsabilidad |
| --- | --- | --- |
| Interfaz | React / TypeScript | Navegación y controles táctiles |
| Compilación | Vite | Bundle local de producción |
| Estado | Zustand | Proyecto activo y acciones semánticas |
| Plano 2D | Konva / react-konva | Dibujo, selección y gestos |
| Vista 3D | Three.js / React Three Fiber | Escena derivada del mismo estado |
| Guardado | Dexie / IndexedDB | Proyectos y preferencias locales |
| Idiomas | i18next / react-i18next | ES/EN y cambio manual |
| Android | Capacitor Android | Contenedor y puentes nativos mínimos |
| Archivos | Capacitor Filesystem / Share | Portabilidad de proyectos y exportaciones |
| Calidad | Vitest / Playwright / Gradle | Dominio, flujos y Android |

## Modelo compartido

`Project` contiene metadatos, versión de esquema, espacios, aberturas, muebles y ajustes de vista. Los datos persistidos son serializables; no contienen objetos del renderizador.

- `Room`: polígono ortogonal, altura, espesor y acabados.
- `Opening`: tipo, pared de referencia, offset, ancho, altura y antepecho.
- `FurnitureItem`: catálogo, posición, rotación, dimensiones y materiales.
- `CatalogItem`: claves traducibles, dimensiones y representación procedural.
- `ViewSettings`: cuadrícula, snapping, zoom 2D y cámara 3D.

Unidades internas: metros. El plano usa X/Y; el render deriva X/Z de forma determinista. Las paredes se derivan del contorno. Sus identificadores deberán mantenerse estables cuando existan aberturas vinculadas.

## Límites de módulos

La geometría no importa React, Konva, Three.js ni componentes. El estado aplica acciones del dominio. El 2D y el 3D leen el mismo proyecto. El almacenamiento valida y versiona datos; no define una segunda fuente de verdad durante la edición.

La vista 3D se carga bajo demanda desde el editor 2D. `viewer3d/model.ts` deriva descriptores serializables; `viewer3d/geometry.ts` los convierte en geometrías Three.js transitorias y `Scene3D` administra cámara y recursos. `furniture/model3d.ts` deriva las piezas procedurales del FurnitureItem guardado; `viewer3d/furniture-geometry.ts` une sus primitivas en una geometría con colores de vértice por pieza. No existe escritura de cámara en esta etapa. Detalles: [VIEWER_3D](VIEWER_3D.md).

## Estructura objetivo

| Ruta | Uso |
| --- | --- |
| `src/app`, `src/components` | UI y navegación |
| `src/geometry`, `src/state` | Dominio, reglas y acciones |
| `src/editor2d`, `src/viewer3d` | Representaciones del proyecto |
| `src/furniture` | Catálogo y renderizadores |
| `src/i18n/locales` | Traducciones ES/EN |
| `src/storage`, `src/tests` | Persistencia y pruebas |
| `android` | Proyecto Gradle y wrapper versionados |
| `public` | Activos con licencia documentada |
| `privacy` | Textos legales antes del lanzamiento |

Las carpetas se crearán junto con código real; la etapa 0 no incluye archivos vacíos para aparentar funciones terminadas.

## Decisiones todavía abiertas

Nombre comercial, licencia de código y applicationId final. El identificador se fijará antes de la primera subida a Play. Versiones concretas de dependencias y SDK se comprobarán al incorporar el scaffold. No se añade firma release hasta disponer de una clave protegida.
