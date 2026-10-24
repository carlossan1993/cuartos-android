# UX Android y responsive · Etapa 16

Issue [#29](https://github.com/carlossan1993/cuartos-android/issues/29). La entrega se integra tras revisión técnica y CI web/Android verdes; el PR registra los resultados y el APK.

## Navegación Atrás

Se usa el plugin oficial [Capacitor App v8](https://capacitorjs.com/docs/apis/app), versión exacta **8.1.2**, MIT. No añade permisos, cuentas ni servicios. Un único listener Android enruta Atrás a las capas activas, independientemente del historial de URLs del WebView. No se registra `backbutton` de Cordova además del listener, para evitar procesar dos veces el mismo gesto.

Orden:
1. Durante una transacción del proyecto o una operación local pendiente (crear/importar, exportar o gestionar un proyecto), consumir Atrás sin navegar ni interrumpirla.
2. Cerrar el panel de aberturas/acabados/muebles activo, o cancelar un arrastre/gesto provisional en el plano. No confirmar el borrador ni escribir datos al cancelar.
3. En el asistente, volver del paso de medidas al de nombres conservando el borrador; desde el primero, cancelar. Cerrar la gestión de un proyecto antes de salir del inicio.
4. Volver de 3D a 2D, de 2D al resumen y del resumen a la lista. Volver al resumen conserva el historial; regresar a la lista cierra la sesión conforme a etapa 15.
5. Solo desde el inicio sin operaciones pendientes, llamar a `App.exitApp()` por un evento Atrás nativo. Escape en navegador no cierra la aplicación.

Los handlers se registran con prioridad y se retiran individualmente. La instalación asíncrona soporta desmontaje/StrictMode sin dejar listeners tardíos; no se usa `removeAllListeners`. Fallos de registro/salida o de un handler muestran aviso ES/EN con reintento y mantienen los botones de navegación de la pantalla. Las solicitudes reentrantes y salidas duplicadas pendientes se consumen.

Escape cierra los paneles y recorre las pantallas; con una selección del canvas, primero la quita como antes. Si hay un gesto provisional, Escape lo cancela. Atrás de Android no modifica el contenido del proyecto, preferencias guardadas, fechas ni cursor de undo/redo por navegar.

## Paneles y foco

Los formularios conservan su componente/estado al cambiar tamaño, orientación o idioma. Aberturas, acabados, catálogo y posición de muebles usan un `dialog` modal en un portal fuera del contenido de fondo. El fondo queda explícitamente `inert`/oculto para tecnologías de asistencia y se bloquea su scroll. El panel tiene título accesible, selector ES/EN propio y cierre visible; cerrar o guardar devuelve el foco al control que lo abrió o a su alternativa lógica.

Tab/Shift+Tab permanecen dentro del panel. La cabecera y las acciones de confirmar/cancelar permanecen visibles, con scroll único en el contenido. El campo enfocado se revela respetando el espacio de ambas barras. No se reconstruye el formulario para adaptar el layout; cambiar ES/EN tampoco descarta el texto introducido.

## Orientación y teclado

La actividad conserva los cambios de configuración existentes y añade `windowSoftInputMode="adjustResize"`. El layout consulta `visualViewport` y actualiza altura/posición utilizable del panel ante resize y desplazamiento del viewport. Se conservan los insets nativos de SystemBars, las áreas seguras y una altura útil del canvas en horizontal. La UI permite desplazarse verticalmente en pantallas de poca altura.

Botones, iconos, selects, etiquetas táctiles y summaries se ajustan a un mínimo de 48 px CSS en el WebView. Referencia: [objetivos táctiles Android de 48 dp](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views). No se equipara esta comprobación CSS con una medición física en todos los dispositivos. Se mantiene foco visible, azul `#03038c`, contraste de texto y resúmenes/listas accesibles además del canvas.

## Evidencia automatizada

Validación local: lint/typecheck/build y sincronización Android correctos, **294 unitarias web** (nueve nuevas) y **72 E2E** (seis nuevos). Los seis flujos de UX se repitieron tras la revisión final de foco. CI web/Android y las cinco pruebas JVM se comprueban en el PR.

- Pruebas unitarias del orden de capas, bloqueo local/global, retirada de listeners, reentrada y fallos; alta nativa diferida/desmontaje y salida solo al agotar la navegación.
- E2E ES/EN con puente App simulado: borrador del asistente, cancelación de panel/arrastre, commit retenido, navegación 3D/plano/resumen/lista y salida solo desde inicio. Atrás bloqueado durante creación, edición, exportación y renombrado. La simulación retrasa la notificación de commit, no las solicitudes IDB.
- Teléfono 393 × 851 y 851 × 393; tablet 768 × 1024 y 1024 × 768; casos compactos 320 × 640 y 640 × 320. Borrador y lenguaje conservados, input enfocado sin quedar bajo la barra de acciones, botones visibles, Tab/Shift+Tab y retorno de foco; sin desbordamiento horizontal y controles del catálogo de al menos 48 × 48 px CSS.
- Capturas: [panel teléfono vertical](screenshots/android-panel-phone-0.png), [horizontal](screenshots/android-panel-phone-1.png), [tablet vertical](screenshots/android-panel-tablet-0.png), [horizontal](screenshots/android-panel-tablet-1.png), [catálogo teléfono](screenshots/android-catalog-phone.png) y [tablet](screenshots/android-catalog-tablet.png).

Las pruebas de navegador con puente simulado validan el enrutamiento JavaScript; no acreditan gestos del sistema operativo ni ejecución física de IME/TalkBack. El PR registra CI final, compilación/lint Android y pruebas JVM; no se declara una prueba de emulador/dispositivo si no se hizo.

## Checklist físico pendiente

Registrar modelo, versión Android/WebView, idioma, fecha y resultado de cada prueba real:

- [ ] Instalar el APK e iniciar sin red; crear y reabrir un proyecto con aberturas, acabados y muebles.
- [ ] Atrás por botón y gesto del sistema: cerrar panel/gesto, regresar 3D → 2D → resumen → lista y salir desde el inicio.
- [ ] Pulsar Atrás durante guardado/importación/exportación/gestión; verificar que no interrumpe ni duplica operaciones.
- [ ] Girar teléfono y tablet en ambos sentidos con formularios y un arrastre provisional; conservar texto, cancelar gesto y no crear commits inesperados.
- [ ] Abrir/cerrar IME con diferentes campos y orientación; primer Atrás debe ocultar el teclado según el sistema, acciones y campo enfocado deben seguir alcanzables.
- [ ] TalkBack, foco de teclado físico, orden de lectura, nombres y anuncios ES/EN; no navegar por el fondo del panel ni perder el foco al cerrarlo.
- [ ] Reapertura tras muerte del proceso y presión de almacenamiento: conservar el último diseño confirmado; historial de sesión vacío, errores explícitos y reintento seguro.
- [ ] Selector de documentos, proveedores externos y Share reales (pendiente de etapa 14).

El propietario confirmó aspecto y funcionamiento de la APK anterior; no se atribuyen pruebas físicas específicas de esta entrega a esa confirmación. El rendimiento y la división de bundles corresponden a etapa 17; sigue visible la advertencia del módulo 3D (~953 kB minificado). No hay migración de Project ni cambios en geometría/persistencia/historial.
