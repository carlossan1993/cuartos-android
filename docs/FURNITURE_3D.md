# Muebles procedurales 3D · Etapa 11

La vista 3D representa las 16 piezas del catálogo local a partir del mismo `FurnitureItem` del plano. La edición sigue en 2D: mover, girar, duplicar o borrar y confirmar el guardado se refleja al volver a abrir 3D. Navegar o reintentar WebGL no escribe en el proyecto, ni cambia sus fechas o esquema.

## Catálogo y representación

| Piezas | Elementos genéricos |
| --- | --- |
| Cama individual y doble | Bastidor, patas, cabecera, colchón, cobija y una/dos almohadas |
| Sofá y sillón | Base, respaldo, brazos, patas y tres/una plazas |
| Silla | Cuatro patas, asiento y respaldo |
| Mesa de comedor, escritorio y mesa de centro | Tablero y cuatro patas; escritorio con cajonera lateral |
| Velador y armario | Cuerpo, frentes separados y tiradores |
| Estantería y mueble de TV | Laterales, fondo y huecos reales entre estantes/divisores |
| Refrigerador y cocina | Puertas/tiradores; cubierta, cuatro quemadores y frente de horno |
| Lavabo e inodoro | Volúmenes esquemáticos, grifería/tanque y aros con abertura real |

Son formas locales reconocibles y esquemáticas. No incluyen marcas comerciales, herrajes detallados, mecanismos de apertura, simulación física ni fotorealismo. El catálogo del plano conserva sus miniaturas 2D; las 16 piezas pueden inspeccionarse en la escena 3D.

## Coordenadas y materiales

El descriptor normalizado ocupa X/Z de −0,5 a 0,5 y elevación Y de 0 a 1. Se escala con **las dimensiones guardadas**, aunque difieran del catálogo actual; el catálogo elige la forma y no reemplaza las medidas. La base se centra en `(position.x, 0, position.y)` y la rotación Three.js es el negativo del giro horario del plano. La parte frontal mira a +Z como +Y en los símbolos 2D.

`furniture/model3d.ts` devuelve solamente datos transitorios serializables. No escribe descriptores en el Project ni incorpora objetos Three.js/DOM en Zustand o IndexedDB. Un ID desconocido usa un volumen genérico con medidas, posición y giro originales. El encuadre incluye las bases giradas y alturas de todas las piezas, incluso registros anteriores fuera de la habitación. No los reubica ni invalida retroactivamente.

Las partes usan colores locales de madera, salvia, tapizado, metal y cerámica. `materialOverrides` aplica el color por rol: `body` para estructura/frentes principales; otros roles identifican patas, tapizado, colchón, almohadas, tiradores o detalles. Las claves se consultan solo en las partes que las declaran; roles e IDs de textura desconocidos se conservan sin cambios. Esta etapa representa colores, sin añadir texturas de muebles ni un editor de sus materiales. El azul `#03038c` también se respeta cuando está guardado.

## Renderizado y controles

Primitivas de detalle fijo: cajas, cilindros de 20 lados, elipsoides de 20 × 12 y aros extruidos con hueco. Se unen por pieza con colores de vértice en espacio lineal: una geometría y un material por mueble, sin un draw call por pata/almohada. Las geometrías intermedias se liberan al unir y la geometría final al desmontar; los materiales declarativos se eliminan con React Three Fiber.

La suma de geometría está acotada a **600 000 vértices de muebles** antes de crear buffers. Superar el presupuesto activa la recuperación compartida con regreso al plano, sin borrar ni ocultar parcialmente piezas guardadas. Este límite evita asignaciones descontroladas; no acredita rendimiento físico ni sustituye el perfilado. Las paredes conservan su presupuesto independiente de etapa 10.

Se mantiene carga diferida, render bajo demanda, cámara, vista abierta, DPR 1–2 y reintento ante pérdida de contexto. La lista desplegable por habitación ofrece cantidad, nombres, dimensiones y coordenadas/giro del plano como HTML ES/EN. No hay selección ni edición directa en 3D.

## Evidencia y pendientes

- 29 pruebas unitarias nuevas; total 222: dimensiones y contacto con piso de las 16 piezas, giros libres/rectos comparados con las esquinas 2D, rayos a través de espacios bajo mesas/entre estantes/aros, colores lineales por rol, compatibilidad/JSON, encuadre de registros anteriores y presupuesto agregado.
- Cuatro E2E nuevos entre teléfono ES y tablet EN; total 34 con regresiones. Edición real 2D, giro libre, duplicado/borrado, píxeles 3D antes/después, lista accesible, idioma, reapertura, 16 piezas en escena, medidas anteriores, ID desconocido fuera de la habitación, sin solicitudes externas y recuperación real de contexto con muebles.
- Habitación amueblada: [teléfono ES](screenshots/furniture3d-phone.png), [tablet EN](screenshots/furniture3d-tablet.png). Vista superior: [teléfono](screenshots/furniture3d-top-phone.png), [tablet](screenshots/furniture3d-top-tablet.png).
- Colección con las 16 piezas y una genérica anterior: [perspectiva en tablet](screenshots/furniture3d-collection-tablet.png); vista superior: [teléfono](screenshots/furniture3d-catalog-phone.png), [tablet](screenshots/furniture3d-catalog-tablet.png).
- QA local en Chromium 153 temporal fuera del proyecto; CI usa el navegador fijado por Playwright y WebGL por software solo en los tests. Compilación Android y APK se verifican en el PR antes del merge.

Sin dependencias nuevas, modelos descargados ni cambios del esquema 1. El módulo 3D separado sigue bajo demanda (~952 kB minificados / 253 kB gzip en esta etapa); se conserva el aviso de tamaño de Vite. Instalación, GPU/WebView, rendimiento y gestos manuales en Android físico continúan pendientes. Colisiones, circulación y redimensionado están fuera de esta entrega.

Referencias oficiales: [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [Shape y huecos](https://threejs.org/docs/pages/Shape.html), [objetos y liberación declarativa](https://r3f.docs.pmnd.rs/api/objects).
