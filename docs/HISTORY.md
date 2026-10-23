# Historial del diseño · Etapa 15

Issue [#27](https://github.com/carlossan1993/cuartos-android/issues/27). La revisión técnica, CI final y APK se registran en el PR antes de integrar.

## Alcance y duración

Deshacer/rehacer en el plano y en la vista 3D comparte el proyecto confirmado. Incluye altas, cambios y borrados de puertas/ventanas, acabados de piso/pared y muebles (posición, giro, duplicado y borrado). Un arrastre completo produce una sola entrada. El dominio también conserva correctamente una eliminación de habitación con sus dependientes, aunque la UI no ofrece esa edición todavía.

No se registran formularios provisionales, cancelaciones, validaciones fallidas, guardados fallidos ni confirmaciones sin cambios. Una confirmación idéntica no escribe ni cambia `updatedAt`. Las preferencias explícitas de vista se guardan por separado: no añaden una acción ni descartan rehacer; deshacer diseño conserva la cámara/cuadrícula/ajuste guardados más recientes. La selección y la navegación temporal no forman parte del historial.

El historial vive solo en memoria durante la sesión del proyecto. Cambiar entre resumen, 2D y 3D lo conserva. Cerrar, cargar de nuevo (incluso el mismo ID), importar o crear otro proyecto lo vacía; tampoco sobrevive a una recarga de la app o a la muerte del proceso. Los archivos JSON no contienen historial. El borrado confirmado de un proyecto de la lista conserva su comportamiento irreversible y no se recupera con Deshacer.

## Límites

Como máximo **50 acciones** y **8 MiB de contenido de cadenas UTF-16** (`2 × length` de los JSON antes/después retenidos), más una cantidad acotada de metadatos. No se promete que el heap total sea 8 MiB. Se elimina la entrada más antigua hasta cumplir ambos límites. Una acción que exceda por sí sola el presupuesto vacía lo anterior y actúa como barrera: nunca se salta una acción no retenida. La ayuda del historial informa de su alcance y de cuándo se descartaron acciones antiguas.

Editar después de deshacer descarta la rama de rehacer únicamente cuando el nuevo cambio de diseño se guarda con éxito. Los fallos y los no-op conservan la rama.

## Guardado y recuperación

`saveProjectChange` y `saveHistoryChange` comparten un bloqueo por store/sesión. Preparan y validan una copia aislada antes de llamar al repositorio. Este compara el registro anterior dentro de la misma transacción IndexedDB que lo actualiza. Solo después del commit se publica el `Project` inmutable y se cambia el cursor, conjuntamente. Los IDs, referencias dirigidas de pared, medidas, colores, rotaciones y datos compatibles de catálogo/textura desconocidos se restauran sin regenerarlos. La identidad y fecha de creación no cambian; la fecha de modificación se calcula con un reloj monotónico respecto al registro vigente.

Un fallo conserva exactamente el diseño activo, fechas, entradas y cursor. Puede reintentarse con Deshacer/Rehacer. Los conflictos, registros eliminados, ilegibles o de versiones futuras nunca se sobrescriben ni recrean. El aviso ofrece **Recargar diseño y vaciar historial**: lee explícitamente el registro guardado; solo si es válido sustituye el diseño y limpia el historial. Un fallo de recarga mantiene la copia local. Las finalizaciones tardías llevan un token y una generación de sesión, y no publican datos ni liberan el bloqueo de una sesión nueva.

## Interfaz y atajos

Controles ES/EN con botones nativos, estados deshabilitados, grupo etiquetado, `aria-keyshortcuts`, avisos de estado/error y contador. Atajos: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z y Ctrl+Y. No se interceptan entradas de texto, selects, formularios, contenido editable, composición de texto, repetición de teclas ni gestos de puntero en curso. Los formularios y cambios de muebles pendientes requieren terminarse o cancelarse antes de usar el historial. Un guardado en curso bloquea nuevas transacciones y navegación del diseño.

## Evidencia

- 285 pruebas unitarias web correctas en local (18 nuevas), lint/typecheck/build correctos. Regresión local completa: 66 E2E correctos (ocho nuevos); flujos de historial repetidos tras la revisión final. CI web/Android y cinco pruebas JVM se verifican en el PR.
- Pruebas de ciclos completos sobre rectángulo/L/dos espacios, IDs y cascadas; datos compatibles desconocidos; rama/no-op/preferencias; fallo/reintento, concurrencia, commit diferido, conflicto/eliminado/ilegible/futuro, cambio de sesión y reloj; límites de cantidad y memoria.
- E2E en teléfono ES/tablet EN: ciclos en 2D/3D y JSON exportado, rama nueva, inputs/formularios inválidos, arrastre como una acción, Ctrl/Cmd y rehacer, fallos de undo/redo, recarga explícita y reapertura sin historial.
- Capturas: [plano teléfono ES](screenshots/history-plan-phone.png), [plano tablet EN](screenshots/history-plan-tablet.png), [3D teléfono ES](screenshots/history-3d-phone.png), [3D tablet EN](screenshots/history-3d-tablet.png), [fallo teléfono ES](screenshots/history-error-phone.png) y [fallo tablet EN](screenshots/history-error-tablet.png).

No hay cambio de esquema, migración, dependencia nueva ni servicios externos. La compilación/lint/pruebas JVM de Android se comprueban en CI. La prueba física del APK, presión real de almacenamiento, TalkBack, teclados Android y muerte del proceso sigue pendiente; las pruebas de navegador no la sustituyen. La UX general de Android, orientación y botón Atrás corresponde a etapa 16. El módulo 3D conserva su advertencia de tamaño para el trabajo de rendimiento de etapa 17.
