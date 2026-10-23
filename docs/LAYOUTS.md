# Formas en L y espacios conectados · Etapa 12

El asistente mantiene dos pasos: nombres/forma y medidas. Se elige entre rectángulo, habitación en L y dos espacios conectados. No se redimensionan ni trasladan habitaciones existentes en esta etapa.

## Medidas y creación

- **Rectángulo:** conserva la creación anterior con ancho, fondo y altura.
- **L:** ancho/fondo son las medidas totales; el ancho/fondo del recorte definen el vacío de la esquina inferior derecha del plano. El contorno tiene seis vértices con IDs y seis materiales de pared estables. Superficie = ancho × fondo − recorte ancho × recorte fondo.
- **Dos espacios:** dos rectángulos con nombres y dimensiones independientes, altura común y el segundo a la derecha o debajo. A la derecha se alinean sus bordes superiores; debajo se alinean los bordes izquierdos. Sus interiores no se solapan. El tramo común se abre completamente; su ancho es el menor de los fondos o anchos correspondientes.

Cada medida admite 0,1–100 m y m/cm con coma/punto. El recorte debe dejar al menos 0,1 m en cada brazo, además de ser positivo y menor que la medida total. Se conservan entradas de las formas no seleccionadas, al retroceder, cambiar unidad/idioma y corregir errores. Un fallo de IndexedDB conserva el formulario; solo se publica en Zustand después de confirmar la escritura.

La vista previa representa polígonos reales, numerados por espacio; el resumen presenta nombres, medidas y áreas de todas las habitaciones. La lista inicial también identifica ambos nombres. En una L, las cotas exteriores son ancho/fondo totales; las medidas del recorte se fijan en el asistente.

## Paso abierto y modelo compartido

`geometry/layout.ts` compara aristas colineales de habitaciones distintas, con interiores en lados opuestos y solapamiento de longitud mayor que la tolerancia. Contactos de esquina y habitaciones separadas no crean conexión. La coincidencia se deriva de los polígonos guardados; no hay una segunda geometría ni una entidad persistida adicional.

Los tramos comunes son un **paso abierto de piso a techo**, sin hoja de puerta, dintel ni pared divisoria. La interfaz describe esta regla y muestra los nombres y el ancho del paso. No es una puerta ajustable ni una distribución con tabique y un hueco más estrecho. Esas configuraciones no se incorporan aquí.

El plano omite el trazo grueso de pared en el tramo abierto; una línea tenue de selección puede marcar el límite entre habitaciones. Conserva las cotas por habitación. Los rótulos de espacio usan una celda interior del polígono y los de pared apuntan hacia dentro, evitando el vacío de una L.

El 3D resta el tramo común de los sólidos de ambas paredes y elimina columnas de esquina que invadirían el otro espacio. El resto exterior de una pared parcialmente compartida permanece sólido. Los pisos coinciden por su borde sin superponerse; colores y texturas se conservan por habitación. Cámara/encuadre, vista abierta, medidas accesibles, muebles y recuperación WebGL continúan compartidos.

`schemaVersion: 1` permanece intacto. No se reescriben proyectos anteriores ni se cambian IDs por números de pared. La lectura estructural sigue admitiendo registros anteriores; no se añade una invalidación retroactiva global de habitaciones. La creación nueva garantiza posiciones contiguas sin solapamiento mediante sus constructores.

## Aberturas, acabados y muebles

Las operaciones nuevas de añadir/modificar una abertura verifican en el formulario y el store que su intervalo no invada un paso abierto. Se permite el tramo exterior restante de una pared parcialmente compartida; el offset se sigue midiendo desde el inicio original de la arista dirigida. Una pared completamente abierta aparece deshabilitada en el selector; los números de las demás paredes no cambian.

Acabados por piso/pared y muebles pertenecen a su Room. Los selectores/listas de acabados omiten o deshabilitan paredes completamente abiertas; sus materiales guardados se conservan para mantener el contrato completo del modelo. Aplicar a todas las paredes conserva la estructura del mapa de materiales. Los muebles deben caber completamente en su propia habitación, incluso al girar en una L; no se permite una base que atraviese su recorte ni que quede repartida entre ambos espacios.

## Evidencia y pendientes

- 18 pruebas nuevas; total **240 unitarias**. Contorno/área e IDs de la L, suelo real sin triángulos en el recorte, entradas inválidas/unidades, etiquetas y bases dentro de la concavidad, conexión horizontal/vertical, paredes exteriores restantes, contactos/gaps, winding/orígenes, rayos a través del paso en tres elevaciones, ausencia de pilares interiores, rechazo atómico de aberturas y guardado/reapertura.
- Seis E2E nuevos; total **40** con las regresiones. Teléfono ES/tablet EN: L en cm, error de recorte, idioma/retroceso, fallo/reintento de guardado, muebles en concavidad, abertura interior de la L, conexiones derecha/debajo, acabado independiente, paso protegido, JSON intacto al alternar vistas y reapertura sin activos externos.
- L: [asistente teléfono](screenshots/layout-l-wizard-phone.png), [asistente tablet](screenshots/layout-l-wizard-tablet.png), [plano tablet](screenshots/layout-l-plan-tablet.png), [3D teléfono](screenshots/layout-l-3d-phone.png), [3D tablet](screenshots/layout-l-3d-tablet.png), [superior con paredes completas](screenshots/layout-l-complete-tablet.png).
- Dos espacios: [asistente tablet](screenshots/layout-right-wizard-tablet.png), [plano tablet](screenshots/layout-right-plan-tablet.png), [3D teléfono](screenshots/layout-right-3d-phone.png), [3D tablet](screenshots/layout-right-3d-tablet.png). Segunda orientación: [3D tablet](screenshots/layout-below-3d-tablet.png), [superior teléfono](screenshots/layout-below-top-phone.png).
- QA local en Chromium 153 temporal fuera del proyecto; CI usa Playwright fijado y WebGL por software solo en los tests. Web/Android/APK se verifican y registran en el PR antes de integrar.

Sin dependencias nuevas, backend ni activos remotos. Instalación, compatibilidad GPU/WebView, gestos manuales y perfilado en Android físico siguen pendientes. No hay formas libres, varias plantas, más de dos habitaciones, desplazamiento de habitaciones existentes ni tabiques configurables. Autosave/gestión ampliada continúan en etapa 13.
