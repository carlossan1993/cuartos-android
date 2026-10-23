# Estado del proyecto

Actualizado: 23 de octubre de 2026, America/Guayaquil.

Repositorio público: [carlossan1993/cuartos-android](https://github.com/carlossan1993/cuartos-android).

## Etapa 0 · Repositorio y gobierno

Issue: [#1](https://github.com/carlossan1993/cuartos-android/issues/1).

- [x] Repositorio creado por el propietario, con `main` inicial.
- [x] Guía v3 leída; alcance Android/ES/EN/offline/costo cero transcrito.
- [x] Base documental, instrucciones y plantillas preparadas.
- [x] Validación local documental correcta.
- [x] PR base [#2](https://github.com/carlossan1993/cuartos-android/pull/2) revisado e integrado en `3914eae54bc9b6f9c28cf1ae5aded77860e7abf1`.
- [x] Actions documental verde: [ejecución 39831835126](https://github.com/carlossan1993/cuartos-android/actions/runs/39831835126).

Protección actual de `main`: **por proceso de PR**, no se afirma bloqueo técnico de pushes. Se usan las etiquetas predeterminadas; las etiquetas específicas de área son una propuesta opcional.

Etapa 0 cerrada. El repositorio mantiene las etiquetas predeterminadas; las etiquetas de área no bloquean el scaffold.

## Etapas 1–3 · Base Android, CI e idiomas

Issue: [#3](https://github.com/carlossan1993/cuartos-android/issues/3). Entrega: [PR #4](https://github.com/carlossan1993/cuartos-android/pull/4). El PR registra los checks finales y su integración; solo se considera cerrado tras CI verde y merge.

- React/TypeScript/Vite, Capacitor Android, Gradle wrapper y lockfile.
- Pantalla inicial responsive, recursos locales, selector ES/EN, detección del idioma y preferencia persistida.
- CI con lint, typecheck, pruebas de idioma, build web, E2E teléfono/tablet y build/lint Android.
- Validación local inicial: lint/typecheck/build correctos y siete pruebas de idioma correctas.
- E2E teléfono/tablet, cambio de idioma y reapertura sin activos remotos: correctos en [CI 39832735040](https://github.com/carlossan1993/cuartos-android/actions/runs/39832735040). Capturas revisadas en ambos idiomas.
- El SDK se instala/configura explícitamente mediante setup-android. Se eliminó del estilo base un atributo de navegación que exigía API 27; SystemBars configura los iconos claros/oscuros con compatibilidad nativa sin elevar minSdk 24.
- Las barras del sistema usan estilo oscuro sobre el fondo claro y manejo nativo de áreas seguras. La compilación final y el APK se verifican en los checks del PR #4 antes de integrar.

No hay AAB release ni publicación en Play. La instalación manual del APK en dispositivo queda pendiente.

## Etapa 4 · Modelo de dominio y azul principal

Issue: [#5](https://github.com/carlossan1993/cuartos-android/issues/5). Entrega: [PR #6](https://github.com/carlossan1993/cuartos-android/pull/6), que registra los checks finales y su integración.

- Tipos serializables Project, Room, Opening, FurnitureItem, CatalogItem y ViewSettings.
- Metros internos, conversión cm/m, correspondencia determinista X/Y → X/Z y referencias dirigidas de pared estables.
- Geometría ortogonal, validación del esquema 1 y codec JSON; sin migración silenciosa de versiones desconocidas.
- Store Zustand vanilla, snapshots inmutables, acciones atómicas y borrado en cascada de dependientes de una habitación.
- Azul `#03038c` incorporado a la interfaz y al icono Android. La estructura de pantalla aprobada se conserva.
- Validación local: typecheck/lint/build correctos y 65 pruebas de dominio/idioma correctas.
- E2E teléfono/tablet y paleta ES/EN revisados en [CI 39850806086](https://github.com/carlossan1993/cuartos-android/actions/runs/39850806086); capturas actualizadas en `docs/screenshots`. Los checks finales web/Android y el APK se registran en el PR antes de integrar.

Etapa 4 integrada en PR #6, commit `466cb249b8d88269149b1f3991d606f880971fb5`. CI final web/Android correcto: [39851172975](https://github.com/carlossan1993/cuartos-android/actions/runs/39851172975). Convenciones, límites y pendientes: [DOMAIN](DOMAIN.md).

## Etapa 5 · Crear y reabrir una habitación

Issue: [#7](https://github.com/carlossan1993/cuartos-android/issues/7). Entrega: [PR #8](https://github.com/carlossan1993/cuartos-android/pull/8). Se considera cerrada después de revisión técnica, CI verde y merge del PR.

- Asistente en dos pasos: nombre de proyecto/habitación y medidas interiores de un rectángulo.
- Metros/centímetros, coma/punto decimal, errores ES/EN y conservación de entradas al corregir o retroceder.
- Vista previa y resumen proporcionales con ancho, fondo, altura y superficie reales. Sin gestos ni edición del plano todavía.
- Guardado mínimo Dexie/IndexedDB: crear, listar y reabrir; escritura confirmada antes de publicar en el store.
- Errores de lectura/escritura traducidos con reintento; registros inválidos conservados sin modificaciones.
- 94 pruebas unitarias y ocho E2E teléfono/tablet correctos en local; typecheck, lint y build web correctos. Se revisaron las capturas ES/EN de inicio, asistente, resumen y lista de proyectos.
- Evidencia visual: asistente en [teléfono EN](screenshots/wizard-phone.png) y [tablet ES](screenshots/wizard-tablet.png); resumen en [teléfono EN](screenshots/room-phone.png) y [tablet ES](screenshots/room-tablet.png). Las capturas de inicio también están actualizadas.
- QA local con Chromium 153 obtenido como herramienta temporal fuera de las dependencias del proyecto. CI conserva el Chromium fijado por Playwright. La [primera ejecución](https://github.com/carlossan1993/cuartos-android/actions/runs/39854810292) pasó código/pruebas/build y agotó el tiempo en descargas apt de fuentes/dependencias de Ubuntu. Se limita la instalación al navegador headless; los checks finales web/Android y APK se registran en el PR antes de integrar.

Alcance y verificaciones manuales pendientes: [STORAGE](STORAGE.md). Autosave/gestión completa en etapa 13; editor interactivo en etapa 6.

Etapa 5 integrada en PR #8, commit `ea96d5c796158bd199289d7f35869b580f6ecdb0`. [CI final 39856555640](https://github.com/carlossan1993/cuartos-android/actions/runs/39856555640) web/Android correcto, con 94 pruebas unitarias, ocho E2E y APK debug.

## Etapa 6 · Plano 2D interactivo

Issue: [#9](https://github.com/carlossan1993/cuartos-android/issues/9). La entrega se considera cerrada tras revisión técnica, checks verdes y merge de su PR.

- Apertura del plano desde el resumen del proyecto guardado, con módulo Konva cargado bajo demanda.
- Cuadrícula adaptable, cotas en metros, selección por geometría y consulta accesible de medidas.
- Pan con ratón/un dedo, zoom con rueda/botones, pinch de dos dedos, teclado y control para encuadrar.
- Orientación responsive y canvas con DPR adecuado, acotado a 3; etiquetas con tamaño constante al ampliar.
- Transformaciones y gestos puros probados; 118 pruebas unitarias y 12 E2E locales. Capturas ES/EN en teléfono/tablet revisadas y guardadas en `docs/screenshots/editor-*`.
- El JSON guardado conserva sus medidas, materiales y fechas después de navegar/seleccionar. Cámara/cuadrícula/selección temporales; gestión de preferencias en etapa 13.

Los checks finales web/Android y el APK se registran en el PR antes de integrar. Detalles, evidencia y verificaciones manuales pendientes: [EDITOR_2D](EDITOR_2D.md).

Etapa 6 integrada en [PR #10](https://github.com/carlossan1993/cuartos-android/pull/10), commit `b43b011478f09fe315318f9fe6ad5a532cf3e524`. [CI final 39865317821](https://github.com/carlossan1993/cuartos-android/actions/runs/39865317821) web/Android correcto, con 118 pruebas unitarias, 12 E2E y APK debug.

## Etapa 7 · Puertas y ventanas

Issue: [#11](https://github.com/carlossan1993/cuartos-android/issues/11). La entrega se considera cerrada tras revisión técnica, checks verdes y merge de su PR; estos resultados se registran en GitHub antes de integrar.

- Añadir, seleccionar, editar y eliminar puertas/ventanas mediante controles ES/EN y selección directa en el plano.
- Habitación, pared dirigida estable, posición, ancho, alto y altura al piso; metros/centímetros con conversión exacta del texto.
- Mapa de pared con cero y sentido de medida. Puerta con hoja/arco interior de 90° y ventana con doble trazo, desde las dimensiones reales del modelo.
- Validación compartida: límites de pared/altura, puertas al piso y superposición por posición y elevación. Correcciones conservan las entradas.
- Guardado explícito de cada cambio mediante transacción IndexedDB: comprobar copia anterior, confirmar escritura y después publicar en Zustand. Conflictos, copias ilegibles o proyectos eliminados se conservan sin sobrescribir ni recrear.
- 144 pruebas unitarias y 16 E2E correctos en local; typecheck, lint y build web correctos. Capturas de plano y formulario ES/EN revisadas en teléfono/tablet.
- Evidencia y límites: [OPENINGS](OPENINGS.md). La instalación manual en Android físico sigue pendiente. Los checks finales web/Android y el APK quedan registrados en el PR antes del merge.

Etapa 7 integrada en [PR #12](https://github.com/carlossan1993/cuartos-android/pull/12), commit `5ea07cf2aaf773b5adba9f267e08aacdec65cab6`. [CI final 39875774534](https://github.com/carlossan1993/cuartos-android/actions/runs/39875774534) web/Android correcto: 144 unitarias, 16 E2E y APK debug.

## Etapa 8 · Acabados

Issue: [#13](https://github.com/carlossan1993/cuartos-android/issues/13). La entrega se considera cerrada después de revisión técnica, checks verdes y merge de su PR; los resultados finales y el APK se registran en GitHub antes de integrar.

- Biblioteca local de 12 muestras genéricas: ocho colores, roble, nogal, porcelanato y cemento. Azul profundo exacto `#03038c`, selector de color y entrada HEX.
- Aplicar al piso, a una pared por ID estable o a todas las paredes de la habitación. Muestra del borrador, cancelación sin escritura y resumen accesible de acabados guardados.
- Piso con color real y juntas esquemáticas de tablones/baldosas; paredes como franjas de color. Selección con contorno independiente que conserva el color del piso; rótulos legibles sobre tonos oscuros.
- Guardado transaccional compartido con aberturas, sin cambiar esquema/base ni añadir dependencias. Formularios excluyentes evitan editar aberturas y acabados simultáneamente.
- 161 unitarias y 20 E2E locales correctos, incluidas regresiones. Verificación de píxeles reales del canvas, cancelación/reintento, idioma y reapertura sin activos remotos. Lint, typecheck y build web correctos.
- Capturas de plano y formulario ES/EN en teléfono/tablet revisadas. Detalles, representación y límites: [FINISHES](FINISHES.md). Comprobación manual en Android físico pendiente.

Etapa 8 integrada en [PR #14](https://github.com/carlossan1993/cuartos-android/pull/14), commit `64e34bd71c2ae31cd5872dad13333cdc717ed54c`. [CI final 39896986799](https://github.com/carlossan1993/cuartos-android/actions/runs/39896986799) web/Android correcto: 161 unitarias, 20 E2E y APK debug.

## Etapa 9 · Muebles 2D

Issue: [#15](https://github.com/carlossan1993/cuartos-android/issues/15). La entrega se considera cerrada tras revisión técnica, CI verde y merge de su PR. Los checks finales y el APK se registran en GitHub antes de integrar.

- Catálogo local de 16 piezas genéricas con medidas fijas, categorías y textos ES/EN. Miniaturas y plano comparten símbolos procedurales 2D.
- Añadir/seleccionar, mover con ratón o un dedo, giro de 90° o ángulo libre, centro X/Y en m/cm, duplicar y borrar. Ajuste de centro a la retícula con control del intervalo explícito.
- Base girada y altura dentro de la habitación; selección por geometría y orden de dibujo. Compatibilidad con instancias antiguas/IDs de catálogo desconocidos, sin cambio de esquema.
- Arrastre provisional sin escrituras por evento; soltar confirma una transacción. Cancelar, Escape, blur, dos dedos y orientación conservan el diseño anterior. Fallos ofrecen reintento y conservan entradas/cambio propuesto.
- Formularios excluyentes y selección bloqueada durante su edición; navegación de cámara disponible. Acabados, aberturas y otras habitaciones se conservan.
- 180 unitarias y 24 E2E comprobados localmente, incluidas regresiones y los nuevos flujos repetidos tras ajustes finales. Lint/typecheck/build correctos. Capturas de plano, catálogo y posición revisadas en teléfono ES/tablet EN.

Reglas y límites de superposición, compatibilidad y QA físico pendiente: [FURNITURE](FURNITURE.md).

Etapa 9 integrada en [PR #16](https://github.com/carlossan1993/cuartos-android/pull/16), commit `ed752e681bef31f337fbc951da40f1cf2d2d4bd5`. [CI final 39900597584](https://github.com/carlossan1993/cuartos-android/actions/runs/39900597584) web/Android correcto: 180 unitarias, 24 E2E y APK debug.

## Etapa 10 · Habitación 3D

Issue: [#17](https://github.com/carlossan1993/cuartos-android/issues/17). La entrega se considera cerrada después de revisión técnica, checks verdes y merge; la evidencia final se registra en GitHub antes de integrar.

- Motor Three.js/React Three Fiber cargado al abrir 3D desde el plano; mismo proyecto serializable, sin escrituras al navegar.
- Piso poligonal con espesor, paredes hacia el exterior de las medidas interiores y huecos reales para puertas/ventanas, incluidos antepechos y dinteles. Hoja de puerta abierta y vidrio esquemático.
- Colores por pared y texturas de piso locales; vista abierta automática o paredes completas, iluminación y sombras.
- Órbita, zoom, pan, vista superior y encuadre por botones, teclado, ratón y gestos. Orientación/DPR adaptables, render bajo demanda y recuperación ante pérdida de contexto WebGL.
- 193 pruebas unitarias y 30 E2E locales correctos, incluidas regresiones. Lint, typecheck y build web correctos. Capturas revisadas en teléfono ES/tablet EN.
- Dependencias MIT con versiones exactas; módulo 3D separado (~946 kB minificados / 250 kB gzip), sin descargas de activos externos. Perfilado y comprobación física Android pendientes.

Representación, evidencia y límites: [VIEWER_3D](VIEWER_3D.md). Los muebles se conservan en el proyecto y plano; su representación 3D corresponde a la etapa 11.

Etapa 10 integrada en [PR #18](https://github.com/carlossan1993/cuartos-android/pull/18), commit `36dfa9404b9b919d989e562741aa7d3df16096f3`. [CI final 39903969315](https://github.com/carlossan1993/cuartos-android/actions/runs/39903969315) web/Android correcto: 193 unitarias, 30 E2E y APK debug.

## Etapa 11 · Muebles procedurales 3D

Issue: [#19](https://github.com/carlossan1993/cuartos-android/issues/19). Se considera cerrada tras revisión técnica, CI verde e integración; los checks finales y el APK se registran en GitHub antes del merge.

- Las 16 piezas del catálogo se representan mediante geometría local: camas, asientos, mesas, almacenamiento, electrodomésticos y sanitarios. Sin activos remotos ni dependencias nuevas.
- Medidas guardadas, centro de base y giro horario del mismo FurnitureItem, sin estado paralelo ni migración. Mover/girar/duplicar/borrar en 2D se refleja al volver a 3D.
- Colores por rol y datos desconocidos conservados; IDs de catálogo desconocidos usan una pieza genérica con dimensiones reales. El encuadre incluye muebles anteriores fuera de la habitación o más altos.
- Una geometría/material por pieza con colores de vértice; liberación al salir, presupuesto de 600 000 vértices antes de asignar geometrías y recuperación WebGL compartida.
- Lista desplegable por habitación con nombres ES/EN, cantidad, dimensiones, centro y giro. Edición en el plano; cámara y orientación conservan su comportamiento.
- 222 pruebas unitarias y 34 E2E locales correctos, incluidas regresiones. Lint/typecheck/build correctos. Capturas de habitación, vista superior y colección revisadas en teléfono ES/tablet EN. Los checks finales web/Android y APK se registran en el PR. Verificación física y perfilado Android pendientes.

Detalles y evidencia: [FURNITURE_3D](FURNITURE_3D.md).

Etapa 11 integrada en [PR #20](https://github.com/carlossan1993/cuartos-android/pull/20), commit `23899dcbe1f071bec98b77156cf595e9c03571a6`. [CI final 39906614229](https://github.com/carlossan1993/cuartos-android/actions/runs/39906614229) web/Android correcto: 222 unitarias, 34 E2E y APK debug.

## Etapa 12 · Formas L y dos espacios

Issue: [#21](https://github.com/carlossan1993/cuartos-android/issues/21). Se considera cerrada tras revisión técnica, CI verde e integración; los checks finales y APK se registran en GitHub antes del merge.

- Asistente ES/EN con rectángulo, L de seis vértices y dos espacios rectangulares contiguos. Recorte inferior derecho configurable; medidas/nombres independientes del segundo espacio y ubicación derecha/debajo, con altura común.
- Metros/centímetros exactos, validación del recorte y conservación del borrador al corregir, retroceder, cambiar idioma o fallar el guardado. Vista previa y resumen muestran el contorno real y las dos habitaciones.
- La coincidencia de bordes opuestos deriva un paso abierto de piso a techo en el tramo común. Sin pared ni puerta divisoria; sin duplicar un estado de conexión ni cambiar el esquema 1.
- 2D/3D omiten los tramos compartidos y sus pilares de esquina; mantienen las paredes exteriores restantes, acabados por habitación y muebles. Etiquetas dentro de la concavidad y distinción entre selección y pared física.
- Puertas/ventanas nuevas no pueden invadir el paso abierto. Paredes completamente abiertas no se ofrecen para aberturas/acabados; materiales e IDs guardados se conservan. Lectura de registros anteriores sin reescrituras.
- 240 unitarias y 40 E2E locales correctos; lint/typecheck/build correctos. Los checks finales web/Android y APK se registran en el PR. Capturas de asistente, plano, vista 3D y superior en teléfono/tablet. Instalación, GPU, gestos y perfilado Android físicos pendientes.

Alcance y evidencia: [LAYOUTS](LAYOUTS.md).

Etapa 12 integrada en [PR #22](https://github.com/carlossan1993/cuartos-android/pull/22), commit `729d1e8ac2158ccc149194b1444d8a3615d239ca`. [CI final 39910023280](https://github.com/carlossan1993/cuartos-android/actions/runs/39910023280) web/Android correcto: 240 unitarias, 40 E2E y APK debug.

## Etapa 13 · Proyectos offline

Issue: [#23](https://github.com/carlossan1993/cuartos-android/issues/23). Entrega: [PR #24](https://github.com/carlossan1993/cuartos-android/pull/24). La entrega se considera cerrada tras revisión técnica, CI verde e integración. El PR registra los resultados finales y APK antes del merge.

- Lista con renombrar, duplicar y eliminar con confirmación ES/EN. Copias independientes con nuevos IDs y referencias completas para todas las formas, aberturas, acabados y muebles.
- Autosave de cambios semánticos confirmados e indicador guardando/guardado/fallo después del commit. Ninguna escritura por frame, movimiento de cámara o borrador provisional.
- Guardado explícito y restauración de cuadrícula, ajuste y zoom 2D, y cámara 3D. Navegación temporal sin escrituras; mismo esquema 1 y sin dependencias nuevas.
- Comparación transaccional antes de renombrar/copiar/eliminar. Fallos conservan datos y entradas; conflicto ofrece recarga explícita; registros eliminados, corruptos o futuros nunca se recrean/sobrescriben.
- 252 unitarias y 46 E2E locales; lint/typecheck/build y revisión visual ES/EN en teléfono/tablet. La evidencia final web/Android queda en el PR. QA físico de instalación/reapertura y presión de almacenamiento Android pendiente.

Contrato, recuperación y capturas: [STORAGE](STORAGE.md).

Etapa 13 integrada en PR #24, commit `53697b48ba905589bcbf6f3b677cc3818fc94d18`. [CI final 39981744452](https://github.com/carlossan1993/cuartos-android/actions/runs/39981744452) web/Android correcto: 252 unitarias, 46 E2E y APK debug.

## Etapa 14 · Archivos portables

Issue: [#25](https://github.com/carlossan1993/cuartos-android/issues/25). La entrega se cierra tras revisión técnica, checks web/Android verdes e integración. El PR registra evidencia final y APK antes del merge.

- Exportar el proyecto confirmado a JSON UTF-8 del esquema 1. Importación validada, vista previa/nombre y copia independiente; nunca sobrescribe el original ni convierte versiones futuras.
- Exportar el plano completo a PNG de 1024 × 768 o 2048 × 1536, mediante el mismo dibujo del editor. Cotas, acabados, muebles, aberturas, título y nombres/áreas; encuadre propio sin selección ni borradores. Sin dependencia del viewport, zoom o DPR.
- Filesystem 8.1.5 y Share 8.0.3, MIT y versiones fijadas. Android permite guardar en una ubicación elegida mediante el selector del sistema, o abrir la hoja de compartir. Sin permisos generales de almacenamiento. FileProvider limitado a las exportaciones de caché.
- Cancelación, fallo de lectura/escritura/imagen y reintento diferenciados; datos y fechas del proyecto conservados. Sin servicios remotos ni cambio de esquema.
- 267 unitarias web y 58 E2E locales; revisión visual ES/EN en teléfono/tablet y PNG reales. Cinco pruebas JVM para la política de archivos del puente Android se ejecutan en CI. Los resultados finales de CI y APK se registran en el PR. Selector/Share físicos y comportamiento con proveedores externos pendientes.

Contrato y límites: [FILES](FILES.md).

Etapa 14 integrada en [PR #26](https://github.com/carlossan1993/cuartos-android/pull/26), commit `5ad049157aeb87935ae709d9b111e67b2a974757`. [CI final 40036351086](https://github.com/carlossan1993/cuartos-android/actions/runs/40036351086) web/Android correcto: 267 unitarias web, 58 E2E, cinco JVM y APK debug. El propietario confirmó que la APK se ve bien y funciona; no se atribuyen pruebas físicas específicas sin su registro.

## Etapa 15 · Historial seguro del diseño

Issue: [#27](https://github.com/carlossan1993/cuartos-android/issues/27). La entrega se cierra tras revisión técnica, checks web/Android verdes e integración; el PR registra resultados finales y APK antes del merge.

- Deshacer/rehacer aberturas, acabados y muebles desde 2D/3D, con un único Project confirmado y sin objetos de renderer. Un arrastre confirmado es una acción.
- Validación y comparación transaccional antes de publicar diseño/cursor. Fallos conservan diseño, fechas e historial; bloqueo de transacciones simultáneas y protección de sesiones frente a finalizaciones tardías.
- Rama nueva tras undo solo al guardar con éxito; no-op sin escritura/fecha nueva. Preferencias de vista independientes y datos compatibles desconocidos conservados.
- Historial por sesión, hasta 50 acciones/8 MiB de cadenas, sin persistir ni exportar; no recupera proyectos eliminados. Recarga explícita ante conflictos sin sobrescribir datos externos.
- Controles/avisos ES/EN y atajos Ctrl/Cmd+Z, Shift+Z y Ctrl+Y respetan inputs, formularios y gestos. 285 unitarias web y 66 E2E locales correctos; lint/typecheck/build y revisión visual ES/EN en teléfono/tablet. Los resultados finales web/Android, cinco JVM y APK se registran en el PR.

Contrato, límites y pendientes: [HISTORY](HISTORY.md). QA físico Android pendiente.

## Siguiente implementación

Después de integrar la etapa 15: UX Android, orientación, touch, botón Atrás y accesibilidad responsive (etapa 16).
