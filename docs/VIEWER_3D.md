# Habitación 3D · Etapa 10

Desde el plano, «Ver habitación en 3D» abre una vista del mismo proyecto guardado. Volver a 2D conserva aberturas, acabados y muebles. La cámara, vista abierta y reintentos son temporales: no cambian JSON, fechas ni preferencias persistidas.

## Geometría y acabados

Un metro del modelo equivale a una unidad de escena: X/Y del plano se representa como X/Z y la altura ocupa Y. La escena se recentra horizontalmente para reducir pérdida de precisión con orígenes alejados. El piso conserva el polígono, tiene cara superior en cero y losa esquemática de 8 cm hacia abajo. El espesor de paredes crece hacia fuera del contorno interior.

Cada pared conserva su ID dirigido y material. Los cortes en los extremos de las aberturas dividen la pared; los tramos sólidos son el complemento de las elevaciones ocupadas. Son huecos reales con antepechos y dinteles, admiten ventanas encima de puertas y aberturas contiguas. Las geometrías de los tramos se unen por pared. Un presupuesto de 4096 tramos por habitación limita entradas patológicas y ofrece recuperación sin modificar datos.

La hoja de puerta abre 90° hacia dentro con la convención del símbolo 2D. Ventanas con lámina transparente esquemática; no se modelan herrajes ni carpintería detallada. Las esquinas convexas completan el espesor exterior. La losa y los encuentros entre habitaciones conectadas se ampliarán con su etapa correspondiente.

Piso y paredes leen los colores guardados, incluido `#03038c`. Tablones y baldosas usan CanvasTexture local con juntas métricas; un ID de textura desconocido mantiene el color y el dato original. No se descargan imágenes, fuentes ni modelos. Iluminación y sombras son esquemáticas, no una simulación fotométrica.

## Cámara y recuperación

- Un dedo o botón izquierdo: órbita. Dos dedos: zoom/pan. Rueda: zoom; botón derecho: pan.
- Botones para alejar/acercar, girar, vista superior y encuadre. En la región enfocada: flechas para girar/inclinar, WASD para pan, `+`/`-` para zoom, `0`/Home para encuadrar y T para vista superior.
- Vista abierta activa inicialmente: oculta las paredes que miran a la cámara y sus encuentros para inspeccionar el interior. Desactivarla muestra la envolvente completa. No borra paredes ni cambia el proyecto.
- Cambio de tamaño/orientación conserva objetivo y escala relativa al encuadre. DPR entre 1 y 2, actualizado ante cambios de resolución. Medidas y acabados también se presentan como HTML ES/EN.
- Fallo de WebGL o pérdida real de contexto muestra explicación, reintento con canvas nuevo y regreso al plano. Errores de geometría se contienen en el mismo límite de recuperación.

Three.js 0.186.1, React Three Fiber 9.8.2 y tipos Three.js 0.186.0, licencias MIT. OrbitControls proviene de Three.js, sin Drei. El motor requiere WebGL 2 disponible en el WebView. El módulo 3D (~946 kB minificados / 250 kB gzip) se solicita solamente al abrirlo; Vite informa su tamaño. No se elevó el umbral para ocultar el aviso. Render bajo demanda, sin animación continua ni damping; se eliminan controles, listeners, geometrías y texturas al desmontar. El coste real de GPU y memoria queda pendiente de perfilado en Android físico.

## Evidencia y límites

- 13 pruebas unitarias nuevas: volumen de pared menos huecos, rayos que atraviesan la abertura real, medidas/antepecho, apilamiento, IDs estables, esquinas, presupuesto, geometría de piso cóncavo, normales, coordenadas, encuadre y vista abierta. Total: 193.
- Seis E2E nuevas entre teléfono/tablet: carga diferida, píxeles renderizados, comandos/teclado/ratón, gestos de un/dos dedos, orientación/DPR, ES/EN, contexto perdido real con `WEBGL_lose_context`, WebGL no disponible y reintento. Comparan JSON antes/después y verifican el mueble conservado al volver al plano. Total con regresiones: 30.
- QA local con Chromium 153 temporal; CI usa el navegador fijado por Playwright. SwiftShader habilita WebGL por software únicamente en los tests; no cambia la aplicación Android.
- Capturas de vista abierta: [teléfono ES](screenshots/viewer3d-phone.png), [tablet EN](screenshots/viewer3d-tablet.png). Envolvente completa: [teléfono](screenshots/viewer3d-complete-phone.png), [tablet](screenshots/viewer3d-complete-tablet.png).
- CI web/Android y APK se registran en el PR antes de integrar. Instalación física, gestos manuales, compatibilidad de GPU/WebView y perfilado de rendimiento siguen pendientes. La emulación no acredita QA físico.

Los muebles permanecen en el proyecto y el plano; las piezas procedurales 3D se incorporan en la etapa 11. No hay edición 3D, fotorealismo, exportación, autosave de cámara ni cambios del esquema.

Referencias oficiales: [Canvas](https://r3f.docs.pmnd.rs/api/canvas), [render bajo demanda](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
