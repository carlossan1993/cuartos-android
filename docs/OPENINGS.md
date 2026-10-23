# Puertas y ventanas · Etapa 7

El editor 2D permite añadir, seleccionar, editar y eliminar aberturas. El formulario ofrece tipo, habitación, pared, distancia desde el inicio, ancho, alto y altura al piso para ventanas. Las puertas parten del piso. Admite metros/centímetros, coma/punto decimal y cambio de unidad sin redondear las entradas. Cambiar idioma conserva el borrador.

La pared se elige por su ID dirigido estable `roomId:startVertexId:endVertexId`, nunca por el índice. P1–P4 / W1–W4 son rótulos de presentación. El pequeño mapa destaca la pared en naranja e indica el inicio cero y el sentido de medición.

## Modelo y dibujo

El mismo `Project` serializable alimenta formulario, store, guardado y dibujo. La geometría de la abertura se calcula con la dirección de la pared y la normal interior del polígono; no se guardan objetos del renderer. No cambia `schemaVersion: 1` ni el esquema de IndexedDB.

Las puertas muestran hoja y arco a 90° hacia el interior, con bisagra convencional al inicio del segmento. Esta etapa no ofrece elegir mano, giro ni ángulo de apertura. Las ventanas muestran doble trazo. Tocar la abertura, su hoja o arco permite seleccionarla antes que la habitación, con tolerancia de 9 píxeles CSS independiente del zoom; también hay una lista HTML accesible.

La elevación de una ventana se consulta en sus propiedades: el plano es una proyección horizontal. Una ventana sobre una puerta puede coincidir en la proyección si sus intervalos de altura no se superponen. No se promete una vista de elevación ni geometría 3D todavía.

## Validación y guardado

El formulario prepara un candidato y llama al validador completo del dominio. Ancho/alto deben ser positivos; distancia/antepecho no negativos; el segmento y su altura deben caber en la pared/habitación. Se rechazan intersecciones de ancho y altura en la misma pared, permitiendo contacto por el borde o separación vertical. Se conserva el límite de 256 aberturas por proyecto.

Al confirmar o eliminar, un servicio usa las acciones semánticas del store en una copia aislada. El repositorio valida el JSON candidato y, en una transacción, verifica que la copia guardada siga siendo legible y coincida con la anterior. Una escritura de otra pantalla produce un error de conflicto; un registro eliminado no se recrea y una versión futura/ilegible no se reemplaza. La persona recibe instrucciones ES/EN para reabrir o reintentar.

Solo al confirmar la escritura se publica el resultado en Zustand. Fallos de validación o almacenamiento dejan intactos el proyecto anterior y las entradas; reintentar no duplica la abertura. Cancelar no escribe. Durante una escritura se bloquean las acciones de edición y la vuelta al resumen. Este guardado explícito no completa el autosave, gestión de proyectos ni recuperación ampliada previstos en etapa 13.

## Evidencia y límites

- 26 casos nuevos: conversión/validación, geometría en cuatro paredes, IDs estables, tolerancia de selección, CRUD guardado, escritura fallida, concurrencia real en transacciones fake-indexeddb, registros ilegibles/futuros y finalización tardía. Total: 144 pruebas unitarias.
- Cuatro E2E nuevos (dos flujos en teléfono ES y tablet EN): crear en cm, seleccionar en canvas, editar, cancelar, reabrir sin memoria previa y eliminar; límites, superposición y fallos reales del método IndexedDB de escritura con reintento. Total: 16 E2E con regresiones anteriores.
- Lint, typecheck y build web locales correctos. QA local con Chromium 153 como herramienta temporal; CI usa el Chromium fijado por Playwright y comprueba web, Android y APK antes de integrar.
- Plano: [teléfono ES](screenshots/openings-phone.png) · [tablet EN](screenshots/openings-tablet.png).
- Formulario: [teléfono ES](screenshots/opening-form-phone.png) · [tablet EN](screenshots/opening-form-tablet.png).

La instalación, cierre/reapertura y gestos manuales en Android físico siguen pendientes. Las pruebas de navegador y la compilación del APK no sustituyen esa comprobación.
