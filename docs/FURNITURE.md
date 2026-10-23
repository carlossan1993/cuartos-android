# Muebles 2D · Etapa 9

El plano incorpora 16 piezas genéricas locales: camas individual/doble, sofá, sillón, silla, mesa de comedor, escritorio, mesa de centro, velador, armario, estantería, mueble de TV, refrigerador, cocina, lavabo e inodoro. Cada pieza tiene ID de catálogo, categoría/nombre ES/EN, medidas fijas y descriptor procedural. Las miniaturas SVG y el dibujo Konva usan los mismos símbolos normalizados; no hay imágenes remotas, marcas comerciales ni dependencias nuevas.

## Añadir y editar

Abrir catálogo permite elegir habitación, filtrar categoría y seleccionar una pieza. La ficha muestra ancho × fondo × alto en metros. Confirmar busca una posición interior compatible y guarda antes de publicar en Zustand. La búsqueda es acotada; no es un optimizador de distribución. Cancelar no crea nada.

La lista y el plano permiten seleccionar. El número visible indica el orden de dibujo; la identidad persistente es el UUID. Las piezas superpuestas se seleccionan desde la más alta del orden de dibujo; la lista permite acceder a las que quedan debajo. Los muebles se dibujan después de las aberturas y, cuando existen, el nombre central de la habitación se consulta en el panel lateral para evitar texto oculto entre piezas.

El formulario ofrece habitación, centro X/Y en metros o centímetros y ángulo horario. El cambio de unidad desplaza el separador del texto, incluidos valores negativos, sin redondearlo. Se admite coma/punto decimal y se normaliza el ángulo a `[0, 360)`. La entrada se conserva al cambiar idioma o fallar al guardar. El botón Girar aplica 90°; Duplicar crea otro UUID, conserva medidas/materiales/ángulo e intenta un desplazamiento de 0,2 m. Si no cabe desplazada, puede coincidir con la original y queda identificada en la lista. Eliminar afecta solamente a la pieza seleccionada.

La superposición entre muebles y con el área de giro de las puertas está permitida en esta etapa. No hay comprobación de circulación, colisión física ni distribución automática. Los tamaños del catálogo son fijos; el modelo conserva las medidas almacenadas de piezas anteriores, incluso cuando difieren de las del catálogo actual. No se introduce un control de redimensionado.

## Arrastre, cámara y ajuste

Un dedo o ratón sobre un mueble inicia un movimiento provisional; se conserva el punto de agarre y se toleran cinco píxeles antes de mover. La cámara no se desplaza durante ese arrastre. Al soltar se valida y guarda una sola edición semántica. El diseño persistido no se escribe por cada evento del puntero.

La vista provisional usa una copia local transitoria de la pieza, sin modificar el Project activo ni el JSON. Un destino inválido se marca en rojo. Cancelación de puntero, pérdida de captura, Escape, blur, cambio de tamaño/orientación o navegación con rueda/zoom/encuadre descartan el provisional. Un segundo dedo cancela la edición y continúa el pinch/pan de cámara; levantar dedos no guarda el movimiento cancelado. Arrastrar el fondo sigue desplazando la cámara. Durante la edición de formularios se permite navegar, pero se bloquean cambios de selección que harían perder el borrador.

El control Ajuste / Snap indica el intervalo real `gridSize` en metros, separado de la cuadrícula visual adaptable. Cuantiza el centro a esa retícula al mover, introducir coordenadas o colocar una pieza. Desactivarlo conserva coordenadas sin ajuste. Es una preferencia temporal del editor; guardarla como preferencia se mantiene en etapa 13.

## Validación y persistencia

El servicio exige que la base girada completa y su centro estén dentro de la habitación, y que la altura quepa. Comprueba esquinas y cada intervalo de los lados dividido por los cruces del polígono, evitando que una base atraviese una concavidad con esquinas interiores. No limita la rotación a múltiplos de 90°.

Estas reglas se aplican en la frontera de edición de muebles. El codec de esquema 1 sigue permitiendo recuperar registros anteriores fuera de la habitación, sin invalidarlos retroactivamente. Se pueden seleccionar, corregir o eliminar. Un ID de catálogo desconocido usa un símbolo genérico y conserva dimensiones y materiales. No hay migración ni cambio de esquema/base.

`saveFurnitureChange` utiliza las acciones semánticas y `saveProjectChange`: candidato aislado, validación y transacción IndexedDB con comprobación de copia anterior, publicación solo después del commit. Fallos y conflictos no reemplazan la copia anterior. Un arrastre, giro, duplicado o eliminación que falla por almacenamiento conserva el cambio propuesto y ofrece reintento/cancelación; los formularios mantienen las entradas para corregir/reintentar. Una edición inválida no se guarda. Abandonar el editor con un reintento pendiente descarta solamente ese intento; el proyecto guardado sigue intacto.

## Evidencia y pendientes

- 19 casos nuevos, 180 unitarias en total: catálogo/símbolos, bases giradas, límites/altura, concavidad, hit-testing/orden, colocación, compatibilidad, arrastre sin salto, snapping a distintas escalas, texto firmado cm/m, CRUD guardado, fallo/reintento y conflicto.
- Cuatro E2E nuevos (teléfono ES y tablet EN), 24 en total con las regresiones: catálogo, arrastre con ratón, giro, copia, posición cm sin ajuste, idioma, validación, cancelación, escritura fallida, reapertura sin activos remotos y borrado; toque sin escritura, arrastre táctil provisional, cancelación, dos dedos, blur, Escape, orientación, reintento de arrastre y destino fuera de la habitación.
- Lint, typecheck, pruebas y build web locales correctos. QA local con Chromium 153 temporal fuera del proyecto; CI usa el navegador fijado por Playwright y verifica web/Android/APK antes de integrar.
- Plano: [teléfono ES](screenshots/furniture-phone.png) · [tablet EN](screenshots/furniture-tablet.png).
- Catálogo: [teléfono ES](screenshots/furniture-catalog-phone.png) · [tablet EN](screenshots/furniture-catalog-tablet.png).
- Posición: [teléfono ES](screenshots/furniture-position-phone.png) · [tablet EN](screenshots/furniture-position-tablet.png).

La instalación y los gestos manuales en Android físico siguen pendientes. Los eventos táctiles de Chromium y el APK compilado no los sustituyen. La vista 3D de habitación y las piezas procedurales 3D corresponden a las etapas 10 y 11; no se presentan como implementadas aquí.
