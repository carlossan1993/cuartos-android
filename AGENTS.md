# Instrucciones de trabajo · Cuartos

## Autoridad y alcance

- Aplicar la guía maestra v3 y la secuencia de [ROADMAP](docs/ROADMAP.md).
- Mantener GitHub como fuente de verdad. Trabajar en ramas; no enviar cambios funcionales directamente a `main`.
- Mantener cambios puntuales y reversibles. No sustituir archivos enteros sin necesidad.
- No marcar etapas cerradas sin su criterio de aceptación y evidencia en GitHub.
- No delegar en otros agentes salvo que el usuario lo solicite.

## Restricciones

- Aplicación Android con Capacitor, núcleo React/TypeScript/Vite.
- Sin backend, cuentas, telemetría, anuncios, pagos ni dependencias pagas en V1.
- Ningún secreto, keystore o contraseña en código, artefactos ni logs.
- No cambiar la visibilidad del repositorio, contratar servicios ni publicar en Play sin autorización aplicable.

## Implementación

- Un único modelo serializable para 2D y 3D; unidades internas en metros.
- Sin objetos Konva/Three.js ni referencias DOM en datos persistidos.
- `schemaVersion` obligatorio; validar importaciones antes de guardar.
- Textos visibles mediante i18n, con claves completas ES/EN en el mismo PR.
- Canvas con resolución apropiada para la densidad del dispositivo; exportación con resolución explícita.
- Incorporar librerías y workflows cuando sean necesarios; evitar trabajo y consumo duplicados.

## Evidencia

- Ejecutar los checks pertinentes a cada cambio y registrar sus resultados reales.
- Los checks documentales no acreditan compilación web, Android ni pruebas de interfaz.
- Para geometría, persistencia y migraciones, añadir pruebas de comportamiento significativo.
- Para UI, revisar teléfono/tablet y ES/EN; documentar cualquier verificación pendiente.
- Antes de merge, comprobar CI, criterio de aceptación y ausencia de cambios ajenos al objetivo.
