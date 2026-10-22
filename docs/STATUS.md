# Estado del proyecto

Actualizado: 22 de octubre de 2026, America/Guayaquil.

Repositorio público: [carlossan1993/cuartos-android](https://github.com/carlossan1993/cuartos-android).

## Etapa 0 · Repositorio y gobierno

Issue: [#1](https://github.com/carlossan1993/cuartos-android/issues/1).

- [x] Repositorio creado por el propietario, con `main` inicial.
- [x] Guía v3 leída; alcance Android/ES/EN/offline/costo cero transcrito.
- [x] Base documental, instrucciones y plantillas preparadas.
- [x] Validación local documental correcta.
- [x] PR base [#2](https://github.com/carlossan1993/cuartos-android/pull/2) revisado e integrado en `3914eae54bc9b6f9c28cf1ae5aded77860e7abf1`.
- [x] Actions documental verde: [ejecución 39831835126](https://github.com/carlossan1993/cuartos-android/actions/runs/39831835126).

Protección actual de `main`: **por proceso de PR**, no se afirma bloqueo técnico de pushes. Se usan las etiquetas predeterminadas; las etiquetas específicas de área son una propuesta opcional.

Etapa 0 cerrada. El repositorio mantiene las etiquetas predeterminadas; las etiquetas de área no bloquean el scaffold.

## Etapas 1–3 · Base Android, CI e idiomas

Issue: [#3](https://github.com/carlossan1993/cuartos-android/issues/3). Entrega: [PR #4](https://github.com/carlossan1993/cuartos-android/pull/4). El PR registra los checks finales y su integración; solo se considera cerrado tras CI verde y merge.

- React/TypeScript/Vite, Capacitor Android, Gradle wrapper y lockfile.
- Pantalla inicial responsive, recursos locales, selector ES/EN, detección del idioma y preferencia persistida.
- CI con lint, typecheck, pruebas de idioma, build web, E2E teléfono/tablet y build/lint Android.
- Validación local inicial: lint/typecheck/build correctos y siete pruebas de idioma correctas.
- E2E teléfono/tablet, cambio de idioma y reapertura sin activos remotos: correctos en [CI 39832735040](https://github.com/carlossan1993/cuartos-android/actions/runs/39832735040). Capturas revisadas en ambos idiomas.
- El SDK se instala/configura explícitamente mediante setup-android. Se eliminó del estilo base un atributo de navegación que exigía API 27; SystemBars configura los iconos claros/oscuros con compatibilidad nativa sin elevar minSdk 24.
- Las barras del sistema usan estilo oscuro sobre el fondo claro y manejo nativo de áreas seguras. La compilación final y el APK se verifican en los checks del PR #4 antes de integrar.

No hay AAB release ni publicación en Play. La instalación manual del APK en dispositivo queda pendiente.

## Etapa 4 · Modelo de dominio y azul principal

Issue: [#5](https://github.com/carlossan1993/cuartos-android/issues/5). Entrega: [PR #6](https://github.com/carlossan1993/cuartos-android/pull/6), que registra los checks finales y su integración.

- Tipos serializables Project, Room, Opening, FurnitureItem, CatalogItem y ViewSettings.
- Metros internos, conversión cm/m, correspondencia determinista X/Y → X/Z y referencias dirigidas de pared estables.
- Geometría ortogonal, validación del esquema 1 y codec JSON; sin migración silenciosa de versiones desconocidas.
- Store Zustand vanilla, snapshots inmutables, acciones atómicas y borrado en cascada de dependientes de una habitación.
- Azul `#03038c` incorporado a la interfaz y al icono Android. La estructura de pantalla aprobada se conserva.
- Validación local: typecheck/lint/build correctos y 65 pruebas de dominio/idioma correctas.
- E2E teléfono/tablet y paleta ES/EN revisados en [CI 39850806086](https://github.com/carlossan1993/cuartos-android/actions/runs/39850806086); capturas actualizadas en `docs/screenshots`. Los checks finales web/Android y el APK se registran en el PR antes de integrar.

Etapa 4 integrada en PR #6, commit `466cb249b8d88269149b1f3991d606f880971fb5`. CI final web/Android correcto: [39851172975](https://github.com/carlossan1993/cuartos-android/actions/runs/39851172975). Convenciones, límites y pendientes: [DOMAIN](DOMAIN.md).

## Etapa 5 · Crear y reabrir una habitación

Issue: [#7](https://github.com/carlossan1993/cuartos-android/issues/7). Se considera cerrada después de revisión técnica, CI verde y merge de su PR.

- Asistente en dos pasos: nombre de proyecto/habitación y medidas interiores de un rectángulo.
- Metros/centímetros, coma/punto decimal, errores ES/EN y conservación de entradas al corregir o retroceder.
- Vista previa y resumen proporcionales con ancho, fondo, altura y superficie reales. Sin gestos ni edición del plano todavía.
- Guardado mínimo Dexie/IndexedDB: crear, listar y reabrir; escritura confirmada antes de publicar en el store.
- Errores de lectura/escritura traducidos con reintento; registros inválidos conservados sin modificaciones.
- 94 pruebas unitarias correctas; typecheck, lint y build web correctos en local. Los E2E teléfono/tablet, capturas y APK Android se verifican en el PR antes de integrar.

Alcance y verificaciones manuales pendientes: [STORAGE](STORAGE.md). Autosave/gestión completa en etapa 13; editor interactivo en etapa 6.

## Siguiente implementación

Después de integrar la etapa 5: editor 2D base (etapa 6), con cuadrícula, cotas, selección, pan/zoom y manejo táctil.
