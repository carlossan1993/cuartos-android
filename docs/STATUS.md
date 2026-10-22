# Estado del proyecto

Actualizado: 22 de octubre de 2026, America/Guayaquil.

Repositorio público: [carlossan1993/cuartos-android](https://github.com/carlossan1993/cuartos-android).

## Etapa actual: 0 · Repositorio y gobierno

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

Issue: [#3](https://github.com/carlossan1993/cuartos-android/issues/3). Implementación en revisión.

- React/TypeScript/Vite, Capacitor Android, Gradle wrapper y lockfile.
- Pantalla inicial responsive, recursos locales, selector ES/EN, detección del idioma y preferencia persistida.
- CI con lint, typecheck, pruebas de idioma, build web, E2E teléfono/tablet y build/lint Android.
- Validación local inicial: lint/typecheck/build correctos y siete pruebas de idioma correctas.
- E2E teléfono/tablet, cambio de idioma y reapertura sin activos remotos: correctos en [CI 39832735040](https://github.com/carlossan1993/cuartos-android/actions/runs/39832735040). Capturas revisadas en ambos idiomas.
- El primer job Android detectó que `sdkmanager` no estaba en PATH; el workflow ahora instala/configura explícitamente las herramientas SDK antes de compilar. Pendiente verificar el nuevo job.

No hay editor de habitaciones ni proyectos guardados todavía. No hay AAB release ni publicación en Play. La instalación manual del APK en dispositivo queda pendiente.

## Siguiente implementación

Cerrar las etapas 1–3 con checks verdes y el APK debug; continuar después con el modelo de dominio (etapa 4) y el asistente de creación de habitaciones (etapa 5).
