# Guardado local · Etapas 5, 7, 8 y 9

Los proyectos se guardan en IndexedDB mediante Dexie 4, dentro del origen local de la app. No hay servidor, cuentas ni sincronización remota. En Android el bundle y los datos se usan desde el contenedor Capacitor.

- Base `cuartos-local`, versión 1, tabla `projects` con clave primaria `id`.
- Cada registro contiene `{ id, json }`. El JSON usa el contrato `schemaVersion: 1` de [DOMAIN](DOMAIN.md); no se mantienen modelos alternativos para dibujo y almacenamiento.
- Crear valida el proyecto completo y usa `add`, que rechaza IDs repetidos. La interfaz anuncia guardado y publica el proyecto en Zustand solamente después de confirmar la escritura.
- Un error de almacenamiento conserva el formulario y el proyecto activo anterior. La persona puede corregir o reintentar; no hay un guardado ficticio en memoria como sustituto.
- Cargar valida el JSON y comprueba que el ID interno coincida con la clave. La lista omite registros ilegibles, muestra un aviso y los conserva intactos. No se borran automáticamente ni se migra silenciosamente un esquema de proyecto desconocido.
- Al volver al inicio se lee la lista de nuevo. Abrir una tarjeta recupera el proyecto de la base y lo publica con la acción `loadProject`. Las tarjetas son resúmenes de lectura, no estados editables independientes.

El asistente crea una habitación rectangular por proyecto con ancho, fondo y altura entre 0,1 y 100 m, nombres de hasta 120 caracteres y medidas interiores. Admite coma/punto decimal y metros/centímetros. Cambiar la unidad desplaza el separador en el texto sin redondearlo; el modelo conserva números en metros. La vista previa y el resumen son proporcionales y de solo lectura.

La base ofrece crear, listar y reabrir; el plano interactivo se incorporó en la etapa 6. En la etapa 7, `replace` valida el diseño candidato y ejecuta una transacción de lectura/escritura que comprueba identidad, fechas y coincidencia con el JSON anterior. Rechaza conflictos de otra pantalla, registros ilegibles/versiones desconocidas y proyectos eliminados. La edición de aberturas publica el resultado en Zustand después de confirmar la escritura; un fallo conserva formulario y datos anteriores. Una finalización tardía no cambia el proyecto activo si la persona abrió otro. La etapa 8 comparte este servicio transaccional entre aberturas y acabados, usando la acción semántica `updateRoom` para materiales. Solo se reemplaza la superficie elegida; geometría, aberturas, muebles y otras habitaciones se conservan. La etapa 9 usa el mismo servicio para altas, cambios, duplicados y borrados de muebles, con una escritura al confirmar o soltar el arrastre. El provisional nunca se publica en el store ni se escribe por cada evento. Detalles: [OPENINGS](OPENINGS.md), [FINISHES](FINISHES.md) y [FURNITURE](FURNITURE.md). Autosave de ediciones, duplicar/eliminar, migraciones de la base y recuperación ampliada corresponden a la etapa 13; exportaciones de respaldo a la 14. Desinstalar o borrar los datos de la app elimina los proyectos locales.

## Evidencia y límites

Las pruebas unitarias usan fake-indexeddb para verificar reapertura en otra conexión, colisiones, validación, conservación de registros inválidos y publicación después de guardar. Playwright prueba el motor IndexedDB de Chromium: creación/corrección, cambios de unidad e idioma, nueva sesión, varios proyectos, cancelación, errores de escritura/lectura y reintentos en teléfono/tablet. Las capturas y el APK se registran en el PR de la etapa.

El APK debe compilar en CI antes de integrar. La instalación/cierre/reapertura manual en un dispositivo Android físico sigue pendiente; las pruebas de navegador no se presentan como pruebas físicas del WebView.

Referencia de integración: [documentación oficial de Dexie y TypeScript](https://dexie.org/docs/Typescript).
