# Odamus 0.1.1 (2) · Giro provisional

Seguimiento: [#46](https://github.com/carlossan1993/cuartos-android/issues/46). Actualización solicitada por el propietario durante la prueba cerrada.

## Comportamiento

Tocar o seleccionar un mueble muestra dos botones sobre el plano, con áreas táctiles de 48 px y giros de −90°/+90°. Los botones conservan su posición entre giros y quedan dentro del área visible al navegar. El ángulo usa la orientación absoluta del mueble, normalizada a [0, 360).

Los giros son una copia temporal. Se permiten ángulos intermedios fuera de la habitación, señalados en rojo, sin modificar el proyecto activo ni IndexedDB. Tocar otro mueble o el fondo termina la operación: el destino válido se confirma mediante el servicio transaccional existente como una sola edición de historial; un destino inválido restaura la orientación inicial con aviso. La superposición entre muebles sigue permitida por el contrato existente.

Un giro completo o girar y regresar al ángulo original no escribe ni añade historial. Escape, Atrás nativo, pérdida de foco de ventana y cambio de tamaño/orientación descartan el provisional. Pan/pinch y rueda mantienen el giro temporal, sin escribir. Los botones exteriores finalizan antes de ejecutar su acción; un fallo de guardado conserva el original y permite reintentar el ángulo final. El control anterior «Girar 90°» continúa validando cada operación inmediatamente.

## Compatibilidad y prueba de actualización

Se conserva `com.odamus.app`, el origen Capacitor por defecto, la base `cuartos-local` versión 1, tabla `projects`, JSON `schemaVersion: 1` y la ruta de firma existente. No se añade limpieza de datos, migración ni cambio de catálogo/modelo. Gradle, metadatos Play y versión npm pasan de 0.1.0 (1) a 0.1.1 (2). El inspector del AAB comprueba la versión contra `play/release.json`.

Prueba que debe realizar el propietario en el teléfono:

1. En Odamus 0.1.0 (1), guardar un proyecto reconocible con muebles, colores y posiciones; cerrar y reabrir para comprobar que ya quedó guardado. Puede exportar JSON como respaldo.
2. Subir el AAB **firmado** 0.1.1 (2) a la misma ficha/canal de prueba cerrada de Play. Usar el workflow manual existente y la misma clave; la aprobación del entorno `play-upload` sigue a cargo del propietario. No usar el AAB sin firma de CI.
3. En el mismo teléfono y perfil Android, instalar mediante **Actualizar**, sin desinstalar, borrar datos ni cambiar de paquete. Una instalación paralela o con firma debug no valida esta prueba.
4. Abrir el proyecto anterior y comparar nombre, habitaciones, medidas, aberturas, acabados, muebles, posiciones/ángulos y vistas 2D/3D. Editar, cerrar y reabrir otra vez.
5. Con un mueble al lado de una pared, probar dos toques para 180° atravesando un ángulo provisional inválido; tocar el fondo para guardar. Probar un solo toque y salir: debe restaurar el original. Probar ambos sentidos y Deshacer/Rehacer.

No se acredita una actualización Android real ni la conservación en el teléfono hasta que se complete esta prueba. La reapertura en navegador y las pruebas automatizadas de IndexedDB no sustituyen una actualización instalada desde Play. QA física general #33 conserva su estado previo.

## Verificación

Casos de lógica en `src/tests/rotation.test.ts`: cruce intermedio inválido en ambos sentidos, giro completo/reversa, rechazo sin escritura, guardado final, Undo y reapertura.

Casos de interfaz en `e2e/rotation.spec.ts`, teléfono ES con taps táctiles y tablet EN con ratón: vista provisional sin escritura, confirmación al seleccionar otro mueble/fondo, recuperación de orientación, vuelta completa, Escape/blur/orientación, fallo/reintento, acción exterior antes de 3D y reapertura del proyecto.

La evidencia final de ejecución y revisión se registra en el PR antes de integrar. Las capturas de Chromium son evidencia web; no se presentan como capturas de un teléfono físico.

Revisión local: 306 Vitest + dos pruebas Node, lint sin advertencias, typecheck/build y preflight Play correctos. Diez E2E dirigidos (giro y regresión 2D/3D, ES/EN) correctos. En este entorno la descarga del navegador fijado de Playwright falló; se utilizó Chromium 153 temporal, fuera del proyecto y sin cambiar dependencias. CI ejecuta el navegador fijado y las comprobaciones Android antes de integrar.

Capturas revisadas: [ángulo intermedio teléfono ES](screenshots/rotation-intermediate-phone.png), [ángulo final teléfono ES](screenshots/rotation-final-phone.png), [ángulo intermedio tablet EN](screenshots/rotation-intermediate-tablet.png), [ángulo final tablet EN](screenshots/rotation-final-tablet.png).
