# Rendimiento y calidad visual · Etapa 17

Issue [#31](https://github.com/carlossan1993/cuartos-android/issues/31). Integración condicionada a revisión técnica y CI web/Android verdes; el PR registra el resultado final y APK.

## Cambios medidos

El editor y el exportador PNG usan la entrada mínima de react-konva, registrando Circle, Ellipse, Line, Rect y Text; Stage/Layer/Group siguen disponibles. Se evitan filtros y formas que el plano no utiliza. No se añade otra copia del renderer ni una dependencia.

Tras validar y copiar el Project, el store reutiliza ramas JSON idénticas e inmutables. Una preferencia de vista deja estables habitaciones, aberturas y muebles. La comparación respeta **el orden exacto de las claves serializadas**, necesario para la comparación transaccional del próximo guardado; IDs, orden de listas y datos compatibles desconocidos se conservan. Abrir/importar sigue creando una sesión aislada. No hay cambios de esquema, política de conflictos ni historial.

Las geometrías de piso dependen del polígono; las de muebles, de sus partes locales y colores, sin incluir posición/giro. Los sólidos de esquina conservan sus arrays entre renders. La textura de piso tiene anisotropía limitada a 4 y a la capacidad del dispositivo; geometría y textura se liberan por separado cuando cambia su propia dependencia. Los materiales continúan bajo el ciclo de vida de R3F.

El renderer mantiene `frameloop="demand"`, antialias, preferencia de bajo consumo y DPR 3D entre 1 y 2. Las sombras PCF de 1024 px se actualizan al cambiar contenido o visibilidad de paredes/esquinas, sin repetir el pase de profundidad por un zoom que no cambia la vista abierta. `shadows="percentage"` selecciona explícitamente PCF; Three 0.186 ya no implementa PCFSoft y lo sustituía por PCF con aviso. No se reduce la resolución de las sombras. Se evita crear un Map por frame en la vista abierta.

Se conservan los presupuestos previos de 600 000 vértices de muebles y 4096 sólidos de pared, el fallo recuperable y la recuperación de contexto. No hay caché global ni referencias DOM/GPU en Project. Las asignaciones de buffers se observan **solo desde las pruebas**, sin diagnóstico ni telemetría en producción.

## Protocolo reproducible

1. `npm ci`, `npm run build` y `npm run check:bundles` en Node 24.19.0/npm 11.9.0. El manifest Vite recorre imports estáticos transitivos y cuenta cada JS/CSS una sola vez; los imports dinámicos se incorporan al abrir su pantalla. Gzip de cada JS con zlib por defecto. Las columnas 2D/3D son incrementales, no tamaños de un único chunk.
2. `npx playwright install --only-shell chromium`; `npx playwright test e2e/performance.spec.ts --workers=1`. La variante `CUARTOS_PERF_PHASE=before` desactiva únicamente las expectativas nuevas de cero asignaciones en cámara/preferencias; conserva las medidas y las comprobaciones de reposo/liberación.
3. Fixture creado con el asistente, completado mediante IDB de prueba y recargado: rectángulo 8 × 8 × 3 m; L con recorte 3 × 3 m; dos habitaciones de 8 × 8 × 3 m. Una puerta por habitación, acabados de madera/baldosa y las 16 piezas del catálogo con medidas/giro fijos. El JSON final debe conservar habitaciones, aberturas y muebles.
4. Teléfono ES 412 × 839, DPR 2.625; tablet EN 1024 × 768, DPR 1. Chromium local 153.0.8010.0 (Sparticuz, SwiftShader, sin GPU física); Playwright 1.58.2 fija UA emulada de Chrome 145. La UA en los JSON no identifica por sí sola el ejecutable. CI usa el Chromium 145 oficial de Playwright. No se mezclan sus tiempos como si fueran del mismo equipo.
5. Solo localhost; interceptar solicitudes desactiva caché HTTP y bloquea recursos externos. Medir desde el clic hasta canvas 2D visible / primer frame 3D listo. Asentar 350 ms, observar reposo 250 ms, zoom 200 ms y preferencia guardada 250 ms. Tres salidas 3D → 2D con espera de liberación hasta 5 s, reabrir entre ciclos.

Tiempos locales por caso (ms, una muestra, sin inferencia estadística):

| Dispositivo / escena | 2D antes → después | 3D antes → después |
| --- | --- | --- |
| Teléfono / rectángulo | 408 → 422 | 1105 → 1104 |
| Teléfono / L | 429 → 431 | 922 → 972 |
| Teléfono / dos espacios | 427 → 418 | 926 → 1028 |
| Tablet / rectángulo | 430 → 417 | 1085 → 1084 |
| Tablet / L | 429 → 435 | 1041 → 957 |
| Tablet / dos espacios | 427 → 412 | 1049 → 954 |

Cada JSON registra recursos reales y tamaños decodificados/codificados, tiempos y contadores WebGL. `liveBuffers=0` incluye eliminación explícita y pérdida de contexto por desmontaje; **no equivale a medir heap, memoria GPU total ni texturas vivas del controlador**. La liberación ya funcionaba antes; no se presenta como reparación de una fuga demostrada. Los tiempos son una ejecución por caso, sin percentiles ni conclusión de aceleración en hardware Android.

## Bundles y límites

Valores en bytes. Se mantiene visible el aviso Vite de chunks mayores de 500 kB; no se aumenta su umbral. El motor 3D permanece diferido: no se descarga en inicio ni al abrir solo el plano. Su tamaño se acota, sin dividir artificialmente archivos para ocultar el total.

| Carga JS | Antes minificado / gzip | Después minificado / gzip | Límite CI minificado / gzip |
| --- | --- | --- | --- |
| Inicio, cierre completo | 463 363 / 148 690 | 464 009 / 148 896 | 475 000 / 155 000 |
| Abrir 2D, adicional | 397 899 / 120 740 | 332 402 / 101 643 | 345 000 / 106 000 |
| Abrir 3D desde 2D, adicional | 953 258 / 251 214 | 953 977 / 251 497 | 975 000 / 260 000 |
| Total inicio + 2D + 3D | 1 814 520 / 520 644 | 1 750 388 / 502 036 | Suma de límites anteriores |

2D reduce 65 497 bytes minificados (16.5 %) y 19 097 gzip (15.8 %). Inicio aumenta 646 bytes; 3D aumenta 719 por las optimizaciones de ciclo de vida. CSS permanece en 16 191 / 10 703 / 3047 bytes por etapa. Los límites dejan margen reducido para cambios pequeños y fallan por regresión tanto minificada como gzip. Pruebas del contador cubren imports transitivos/cíclicos, recursos compartidos, exclusión dinámica y ambos tipos de exceso.

Datos: [bundles antes](performance/bundles-before.json), [después](performance/bundles-after.json). Los seis pares `performance-{before,after}-{phone,tablet}-{rectangle,l,connected}.json` en [performance](performance/) incluyen recursos y navegación completos.

## Recursos y calidad

En los seis casos, antes: un zoom creaba 4 buffers/subidas (840 bytes); recordar cámara recreaba 87–94 buffers y aproximadamente 564–568 kB de subidas. Después: **cero buffers/subidas nuevos** por zoom y por recordar cámara, sin recrear texturas. El zoom pasa de 43 a 23 llamadas de dibujo en rectángulo/L y de 49 a 27 en dos espacios al evitar el pase de sombras redundante. Las pruebas distinguen dibujos a framebuffer de sombras frente al canvas: un zoom sin cambio de paredes no genera pases de sombras, pero alternar vista abierta/completa sí los regenera en ambos sentidos. Los seis casos permanecen sin dibujos durante los 250 ms de reposo y vuelven a cero buffers vivos en cada salida, antes y después.

El plano conserva DPR entre 1 y 3, cambios de densidad/orientación y los PNG explícitos 1024 × 768 / 2048 × 1536. Las regresiones verifican píxeles, colores, independencia de zoom/selección y exportación; todos los tipos mínimos de Konva se usan en el editor y en ese mismo dibujo de exportación. La vista 3D conserva geometría real, tamaños, iluminación, cámara, vista abierta y recuperación WebGL. Se revisan capturas teléfono ES/tablet EN, L/dos espacios, sombras y contraste del azul #03038c, además de orientación mediante la suite existente.

Capturas comparables: [L teléfono antes](performance/performance-before-phone-l.png) / [después](performance/performance-after-phone-l.png); [dos espacios tablet antes](performance/performance-before-tablet-connected.png) / [después](performance/performance-after-tablet-connected.png). Son escenas de carga deliberadas con las 16 piezas, no propuestas de decoración.

Fuentes de implementación: [react-konva mínimo](https://github.com/konvajs/react-konva#minimal-bundle), [R3F render bajo demanda](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Canvas y sombras](https://r3f.docs.pmnd.rs/api/canvas), [liberación Three](https://threejs.org/manual/en/how-to-dispose-of-objects.html). Versiones exactas en package-lock; sin nuevas dependencias.

## Validación y pendientes

Lint/typecheck/build, 297 unitarias Vitest, dos pruebas Node del presupuesto y **78 E2E locales correctos**; los seis casos de rendimiento se repitieron en serie tras añadir la comprobación de pases de sombras (6/6). El PR registra cantidades/resultados finales, CI Android, cinco JVM y APK antes de integrar. La revisión técnica propia no se presenta como una revisión humana independiente.

- [ ] Perfetto/Android Studio en teléfono y tablet físicos: CPU, GPU, memoria, arranque frío/caliente, navegación prolongada, frames lentos, consumo y temperatura. Registrar modelo, Android/WebView, densidad, idioma, escena y duración.
- [ ] Revisar nitidez y sombras con GPU real en diferentes DPR y orientaciones; verificar presión de memoria y recuperación tras suspensión/muerte del proceso.
- [ ] Atrás/gesto, IME y TalkBack reales ES/EN; selector de archivos, proveedores externos y Share según [ANDROID_UX](ANDROID_UX.md) y [FILES](FILES.md).

No se afirma fluidez/FPS, ausencia de pixelación en todo dispositivo ni memoria nativa medidos con SwiftShader. La automatización y las capturas constituyen la entrega verificable de esta etapa; el perfilado físico sigue abierto para QA de etapa 18 antes de preparar Play.
