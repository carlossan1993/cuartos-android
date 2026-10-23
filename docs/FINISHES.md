# Acabados y colores · Etapa 8

El panel Acabados / Finishes muestra el piso y cada pared de la habitación seleccionada, con nombre de muestra, color HEX y una muestra visual. Editar permite elegir habitación y superficie: piso, una pared o todas las paredes. Cada pared conserva su ID dirigido estable; los rótulos P1 / W1 son de presentación.

## Biblioteca y edición

La biblioteca incluida en el bundle ofrece 12 muestras genéricas: blanco, marfil, arena, verde salvia, terracota, azul profundo `#03038c`, azul pizarra, carbón, roble, nogal, porcelanato y cemento. Los cuatro últimos son opciones de piso. No hay marcas comerciales, imágenes descargadas, fuentes remotas ni dependencias nuevas.

Se puede elegir un color con el selector nativo o escribir `#RRGGBB`; la validación admite seis dígitos hexadecimales y normaliza el color al guardar. El piso ofrece dibujo liso, tablones o baldosas. Una muestra muestra el borrador, identificado como aún sin guardar; el plano cambia al confirmar. Cambiar de superficie carga su material guardado, como explica el formulario. Cancelar no escribe y cambiar idioma conserva el borrador. Todas las paredes se reemplazan en una sola operación; si sus acabados difieren, se muestra un aviso antes de confirmar.

La edición de aberturas y acabados es excluyente. Durante la escritura se bloquean los controles de edición y la vuelta al resumen; un fallo conserva las entradas y el diseño previo y permite reintentar.

## Un modelo y representación 2D

Los materiales usan los campos existentes `SurfaceMaterial { color, textureId? }`, `floorMaterial` y `wallMaterials`. No se añade un modelo paralelo ni cambian `schemaVersion: 1` o IndexedDB versión 1. Los identificadores locales `floor-planks` y `floor-tiles` activan juntas vectoriales. Un identificador desconocido se conserva y se representa por su color, con aviso en el formulario.

El piso usa su color real incluso al seleccionar la habitación. Un contorno azul discontinuo independiente indica la selección. Las paredes se muestran mediante franjas de color con borde neutro; su ancho en pantalla es esquemático y no representa el espesor estructural. Los rótulos tienen fondo claro para mantener la lectura sobre acabados oscuros. Las aberturas conservan su posición y abren huecos en las franjas.

Las juntas del piso se calculan en metros y se recortan al polígono: tablones de 0,18 × 1,2 m con juntas alternadas y baldosas de 0,6 m. Son patrones esquemáticos, sin fotografía, relieve, brillo ni vetas realistas. No son un cálculo de cantidades de material. Se omiten los detalles si la separación cae por debajo de ocho píxeles o si exceden el presupuesto de 400 segmentos. Las muestras HTML son ilustrativas y no representan escala física.

## Guardado y evidencia

`roomWithFinish` reemplaza solo el material de la superficie indicada y valida la habitación completa. `saveFinishChange` y las aberturas comparten `saveProjectChange`: candidato aislado mediante acciones semánticas, transacción del repositorio con comprobación de copia anterior y publicación en Zustand después del commit. Fallos, conflictos, versiones futuras o registros ilegibles conservan las protecciones de la etapa 7. El autosave y la gestión completa continúan en etapa 13.

- 17 casos nuevos, 161 unitarias en total: biblioteca/HEX, pared estable al rotar el array de vértices, aplicación conjunta, validación, juntas con orígenes negativos y límites, patrón desconocido, reapertura sin perder otras habitaciones/aberturas/muebles, fallo de escritura y conflicto.
- Cuatro E2E nuevos (teléfono ES y tablet EN), 20 en total: muestra/cancelación, materiales guardados, píxeles del piso antes/después de seleccionar y píxel azul de una pared, controles excluyentes, errores HEX, idioma, fallo/reintento, todas las paredes y reapertura bloqueando activos remotos.
- Lint, typecheck y build web locales correctos. QA local con Chromium 153 temporal, fuera del proyecto; CI usa el navegador fijado por Playwright y verifica web/Android/APK antes de integrar.
- Plano: [teléfono ES](screenshots/finishes-phone.png) · [tablet EN](screenshots/finishes-tablet.png).
- Formulario: [teléfono ES](screenshots/finish-form-phone.png) · [tablet EN](screenshots/finish-form-tablet.png).

La instalación, selector de color nativo y gestos manuales en Android físico siguen pendientes. La compilación y las pruebas de navegador no se presentan como pruebas físicas. Muebles y vista 3D corresponden a sus próximas etapas.
