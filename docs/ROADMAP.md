# Hoja de ruta · Guía maestra v3

Fuente: `Guia_App_Cuartos_v3.docx`, octubre de 2026. La etapa 0 prepara el repositorio; le siguen las etapas 1–21. Son 22 filas numeradas de 0 a 21.

Cada cierre requiere Issue, PR revisado y checks pertinentes verdes. Los estados se mantienen en [STATUS](STATUS.md); esta tabla define la secuencia y no acredita ejecución.

| Etapa | Entrega | Criterio de cierre |
| --- | --- | --- |
| 0 | Repositorio y gobierno | Repo, README, licencia si aplica, Issues/etiquetas y reglas de PR. PR base aprobado e integrado; `main` limpia y protegida por proceso. |
| 1 | Scaffold web + Android | React/TypeScript/Vite y Capacitor Android; build web y proyecto Android compilan en CI. |
| 2 | CI/CD mínimo | Lint, typecheck, pruebas, build web y APK debug en PR; APK disponible como artifact. |
| 3 | Internacionalización | i18next, ES/EN, detección y selector; pantalla base completa en ambos idiomas. |
| 4 | Modelo de dominio | Project/Room/Opening/Furniture, unidades, schemaVersion y store; crear, modificar y serializar sin UI compleja. |
| 5 | Creación de habitación | Wizard de nombre, rectángulo, medidas y altura; habitación correcta y persistente. |
| 6 | Editor 2D base | Grid, world/screen, pan, zoom, cotas y selección; plano nítido y táctil en teléfono/tablet. |
| 7 | Puertas y ventanas | Aberturas vinculadas a paredes, con validaciones que impidan posiciones o dimensiones inválidas. |
| 8 | Acabados | Colores de paredes, piso y biblioteca inicial; guardado y representación en 2D. |
| 9 | Muebles 2D | Catálogo de 15 o más piezas, drag, rotación, duplicado, borrado y snapping funcionales. |
| 10 | Motor 3D de habitación | Piso, paredes, aberturas, cámara e iluminación; geometría coincidente con el 2D. |
| 11 | Muebles 3D procedurales | Catálogo 3D; mover o rotar en 2D actualiza 3D sin duplicar el estado. |
| 12 | Formas L y dos espacios | Rectángulo, L y espacios conectados funcionan en 2D/3D. |
| 13 | Persistencia offline | Dexie, autosave, lista de proyectos, duplicar/eliminar; recuperación después de cerrar y reabrir. |
| 14 | Importar/exportar | JSON versionado, Filesystem/Share y PNG nítido; exportar e importar recupera el proyecto íntegro. |
| 15 | Undo/redo y robustez | Historial semántico, validaciones y recuperación; sin corrupción al deshacer/rehacer. |
| 16 | UX Android y responsive | Vertical/horizontal, drawers, touch, back y accesibilidad utilizables en teléfono/tablet. |
| 17 | Rendimiento y calidad visual | DPR, activos, carga diferida, sombras y bundles; escena estándar fluida y sin pixelación evidente. |
| 18 | QA bilingüe y regresión | Vitest, Playwright, Android smoke tests y revisión ES/EN; suite verde y checklist completo. |
| 19 | Preparación Play Store | Icono, capturas ES/EN, feature graphic, privacidad, Data Safety, ficha y AAB firmado listos. |
| 20 | Pruebas de Play | Build instalado desde Play y feedback crítico resuelto; requisitos de la cuenta verificados en ese momento. |
| 21 | Release V1 | Versionado, notas ES/EN y producción; app aprobada/publicada en Google Play. |

## Puertas de calidad

- No posponer ES/EN cuando se añaden pantallas reales.
- El guardado mínimo necesario para cerrar la etapa 5 precede a la gestión completa y el autosave de la etapa 13.
- Preparar controles mínimos de compilación en la etapa 1; completar CI en la 2.
- Verificar requisitos oficiales de Play al preparar el lanzamiento.
- No crear firma release, publicar ni marcar etapas cerradas sin evidencia real.
