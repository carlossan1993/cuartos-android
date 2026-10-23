# Proyectos offline · Etapa 13

Los proyectos se guardan en IndexedDB mediante Dexie 4, dentro del origen local de la app. En Android los datos pertenecen al contenedor Capacitor. No hay servidor, cuentas ni sincronización remota.

## Contrato y transacciones

- Base `cuartos-local`, versión 1, tabla `projects`, clave primaria `id`; registros `{ id, json }` con `schemaVersion: 1`. No se cambia ni migra el esquema en esta entrega.
- Crear valida el proyecto completo y usa `add`, que rechaza IDs repetidos. Cargar valida JSON e identidad. La lista omite registros ilegibles, anuncia el problema y los conserva intactos, incluidas versiones futuras.
- Las ediciones confirmadas (aberturas, acabados, muebles y preferencias) preparan un candidato en un store aislado. La transacción `replace` lee el registro, valida el anterior y compara su JSON exacto antes de escribir. Un registro eliminado, ilegible o modificado desde otra conexión se rechaza sin sobrescribirlo ni recrearlo.
- Solo después del commit se publica el candidato en Zustand. Una finalización tardía no reemplaza otro proyecto activo. El indicador distingue guardando, guardado y fallo del último cambio; un token impide que una operación anterior borre el estado de una nueva.
- Autosave semántico: confirmar un formulario, soltar un mueble o ejecutar giro/duplicado/borrado confirma una escritura. No se escribe por cada movimiento, tecla de navegación ni frame. Los borradores de formularios y arrastres no se guardan antes de confirmar.

## Lista y gestión

Al volver al inicio se lee la lista de nuevo; abrir recupera el proyecto íntegro de la base. Las tarjetas permiten renombrar, duplicar y eliminar, con textos ES/EN y acciones excluyentes durante una operación.

Renombrar conserva ID, creación, geometría, materiales, muebles y preferencias. Duplicar genera un proyecto independiente, nuevas fechas y nuevos IDs de proyecto, habitaciones, vértices, aberturas y muebles. Remapea referencias de habitación/pared y claves de acabados; conserva medidas, posiciones, catálogo, texturas, datos desconocidos compatibles, idioma y opciones de vista. La copia valida que ningún ID propio reutilice los del original. Una única transacción comprueba que la fuente sigue vigente y añade el nuevo registro; un fallo revierte toda la operación.

Eliminar requiere una confirmación que nombra el proyecto y explica la pérdida local. La transacción vuelve a comparar la copia leída antes de borrar. Cancelar no escribe. No se borra un proyecto que cambió después de mostrar la confirmación.

Los fallos de cuota/lectura/escritura conservan los registros y las entradas para reintentar. La copia candidata mantiene sus IDs durante el reintento. Reabrir un registro confirmado limpia el error transitorio de la operación anterior. Un conflicto ofrece recargar explícitamente la fuente, conservando el nombre escrito; la persona confirma otra vez sobre los datos actualizados. Nunca se sustituye un error por un guardado ficticio en memoria.

## Preferencias y reapertura

«Recordar opciones 2D» guarda cuadrícula, ajuste y zoom relativo; «Recordar cámara 3D» guarda posición y objetivo reales en coordenadas del proyecto. Ambas acciones usan `saveProjectChange`, combinan las preferencias con el diseño vigente y muestran éxito solamente tras confirmar la escritura. Navegar sigue sin escribir. El centro del plano, selección y vista abierta 3D son temporales porque no forman parte del contrato de preferencias guardadas. Detalles: [EDITOR_2D](EDITOR_2D.md) y [VIEWER_3D](VIEWER_3D.md).

Cerrar/reabrir recupera el último diseño confirmado: rectángulo, L, dos espacios, aberturas, acabados, muebles y preferencias. No se afirma recuperación de un borrador aún no confirmado. Exportación de respaldos corresponde a la etapa 14; desinstalar o borrar los datos de la app elimina los proyectos locales.

## Evidencia y límites

Doce casos unitarios nuevos verifican copias de las tres formas, referencias/materiales/compatibilidad, independencia, colisiones, transacciones entre conexiones, eliminación, datos ilegibles/futuros, estados antes/después del commit, finalizaciones tardías y preferencias. Total: 252 pruebas unitarias.

Seis E2E nuevos (teléfono ES/tablet EN) cubren renombrar/cambiar idioma, nombre inválido, copiar proyecto completo, cancelar/confirmar borrado, fallos de add/put/delete/get y reintentos, edición/eliminación desde otra conexión, reapertura y restauración real de la cámara y opciones 2D. Se bloquean solicitudes externas y se comprueba el JSON; total con regresiones: 46 E2E. Las pruebas de copia/eliminación usan transacciones reales de Chromium además de fake-indexeddb.

Capturas: [lista teléfono ES](screenshots/projects-list-phone.png), [lista tablet EN](screenshots/projects-list-tablet.png), [borrado tablet EN](screenshots/projects-delete-tablet.png), [conflicto teléfono ES](screenshots/projects-conflict-phone.png), [preferencias 3D tablet EN](screenshots/projects-view-tablet.png).

QA local con Chromium 153 temporal, fuera de las dependencias del proyecto. CI conserva el navegador fijado por Playwright; los resultados finales web/Android y APK se registran en el PR antes de integrar. La instalación/cierre/reapertura manual y la persistencia bajo presión de almacenamiento en Android físico siguen pendientes; el navegador no acredita pruebas físicas del WebView.

Referencia: [transacciones oficiales de Dexie](https://dexie.org/docs/Dexie/Dexie.transaction/).
