# Editor 2D base · Etapa 6

El resumen de un proyecto guardado permite abrir su plano. React Konva dibuja los polígonos del mismo `Project` activo en Zustand: no existe una copia editable del diseño en el canvas. El módulo del editor y sus estilos se cargan al abrirlo.

## Navegación y selección

- Arrastrar con ratón o un dedo desplaza la vista. Se toleran 5 píxeles de movimiento antes de convertir un toque en desplazamiento.
- Dos dedos amplían/desplazan alrededor de su punto medio. Al levantar un dedo puede continuarse con el restante sin salto ni selección accidental. Cancelar un gesto nunca equivale a tocar una habitación.
- La rueda amplía alrededor del cursor. Los botones amplían respecto del centro. El zoom se limita a 25–800 % del encuadre inicial; Encuadrar recupera todos los espacios.
- Tocar dentro del polígono o a 7 píxeles de una pared selecciona la habitación; tocar el vacío o usar Quitar selección la deselecciona. La tolerancia mantiene su tamaño en pantalla a cualquier zoom.
- La lista de habitaciones permite seleccionar sin interactuar con el canvas. Las medidas seleccionadas también se muestran como HTML accesible.
- Con el plano enfocado: flechas desplazan, `+`/`-` amplían/alejan, `0` o Home encuadran, Enter selecciona y Escape limpia la selección.

Desde la etapa 13, «Recordar opciones 2D» guarda cuadrícula, ajuste y zoom relativo para la próxima apertura, mediante el mismo guardado transaccional del diseño. La navegación por sí sola no escribe ni altera fechas. El desplazamiento y la selección son temporales; el esquema 1 no contiene un centro de cámara 2D. Reabrir centra el proyecto con el zoom recordado, limitado al intervalo admitido por el editor (25–800 %). [STORAGE](STORAGE.md) detalla estados y recuperación.

## Geometría y representación

Las transformaciones entre metros y píxeles CSS, el encuadre, zoom, pinch, resize, cuadrícula y selección están en módulos puros independientes de Konva/React. Cambiar orientación conserva el centro en coordenadas del proyecto y el zoom relativo al encuadre.

La cuadrícula usa intervalos 1/2/5, a partir de `gridSize`, y muestra su separación efectiva en metros. Se adapta al zoom para mantener un número acotado de líneas. Las cotas muestran ancho/fondo totales del contorno en metros; el área proviene de su polígono. Los redondeos se aplican solamente a los textos. El tamaño de rótulos, marcadores y trazos se expresa en píxeles CSS y se conserva al ampliar.

El canvas ocupa el contenedor observado con ResizeObserver. Su bitmap usa el DPR del dispositivo entre 1 y 3, actualizado con cambios de resolución/resize; el límite superior controla memoria. La densidad no cambia la escala geométrica ni la tolerancia de selección. Se usa una capa con `listening=false`: los eventos DOM se convierten a coordenadas del modelo y no dependen de un segundo grafo de hit-testing.

Desde la etapa 14, `PlanDrawing` es compartido con [exportación PNG](FILES.md). Se dibuja una escena independiente de 1024 × 768 y se exporta con pixelRatio explícito 1 o 2; el editor conserva su cámara/DPR y no se exportan selección, arrastres ni formularios provisionales. Un borde blanco bajo las líneas de puertas/ventanas mantiene su legibilidad también sobre el piso azul oscuro.

## Evidencia y límites

- 24 casos nuevos de transformaciones, encuadre, zoom limitado, grid y transiciones de gestos; total 118 pruebas unitarias.
- E2E con ratón/teclado y eventos táctiles de Chromium: selección, pan, pinch, cancelación, orientación, nitidez por DPR, cuadrícula y reapertura. Se compara el JSON guardado antes/después. Total 12 E2E junto a las regresiones de etapas anteriores.
- QA local en Chromium 153 mediante herramienta temporal fuera del proyecto. CI usa el Chromium fijado por Playwright; sus checks web/Android y APK deben pasar antes de integrar.
- Capturas: [teléfono ES](screenshots/editor-phone.png), [tablet EN](screenshots/editor-tablet.png), [teléfono horizontal ES](screenshots/editor-rotated-phone.png) y [tablet vertical EN](screenshots/editor-rotated-tablet.png).

La etapa 7 añade [puertas y ventanas](OPENINGS.md), rótulos de pared y selección de aberturas con tolerancia constante de 9 píxeles. La selección de una abertura tiene prioridad sobre la habitación. La etapa 8 añade [acabados y colores](FINISHES.md): piso y paredes conservan su material al seleccionar; un contorno independiente marca la habitación. La etapa 9 añade [muebles 2D](FURNITURE.md) y el arrastre provisional con cancelación/reintento. Se conserva la navegación sobre el fondo y con dos dedos. La etapa 10 añade acceso a la [habitación 3D](VIEWER_3D.md) desde el plano, disponible al terminar o cancelar una edición. La etapa 12 permite crear [L y dos espacios conectados](LAYOUTS.md). El plano omite paredes compartidas en el paso abierto y ubica los rótulos dentro de la concavidad. No hay controles para redimensionar/mover la geometría de una habitación ya creada. Sus etapas permanecen en [ROADMAP](ROADMAP.md). La instalación y los gestos manuales en Android físico siguen pendientes; los eventos táctiles automatizados no se presentan como pruebas físicas.

Referencias: [zoom respecto del cursor](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html), [pinch](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html), [densidad del canvas](https://konvajs.org/docs/posts/Canvas_Blurry.html).
