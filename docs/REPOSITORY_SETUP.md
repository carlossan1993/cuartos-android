# Configuración del repositorio

Repositorio definitivo: `carlossan1993/cuartos-android` (público). Este nombre no fija el nombre comercial ni el applicationId.

## Inicio

1. Repositorio público creado por el propietario para aprovechar Actions con ejecutores estándar gratuitos.
2. Inicializar `main` con un commit mínimo. No añadir una licencia de distribución por defecto.
3. Crear la Issue de etapa 0; crear `chore/repository-foundation` desde `main`.
4. Incorporar esta base, abrir el PR y verificar `Foundation / docs`.
5. Revisar técnicamente e integrar según la autorización de la sesión. Actualizar [STATUS](STATUS.md) con enlaces reales a Issue, PR y ejecución.

## Etiquetas propuestas

| Etiqueta | Uso |
| --- | --- |
| `type:feature` | Función nueva |
| `type:bug` | Error reproducible |
| `type:chore` | Configuración y mantenimiento |
| `area:android` | Contenedor, Gradle y dispositivo |
| `area:editor` | 2D y 3D |
| `area:i18n` | Español e inglés |
| `area:storage` | Guardado y portabilidad |

Las etiquetas deberán existir antes de asignarlas. Las plantillas no dependen de etiquetas inexistentes.

## Gobierno de main

Todos los cambios posteriores al commit mínimo pasan por PR. No se fuerza ni se borra `main`. Cuando el plan y la visibilidad permitan protección técnica, configurarla sin contratar servicios: PR requerido, checks aplicables y bloqueo de force push/borrado. No afirmar que una protección está activa sin comprobarla. Si no está disponible, documentar que la protección es por proceso y no un bloqueo técnico.

## Uso de Actions

La validación de la etapa 0 tiene permisos de solo lectura, tiempo máximo corto y cancelación de ejecuciones reemplazadas. No contiene secretos, cron ni compilaciones Android repetitivas. Usar exclusivamente ejecutores estándar y retención breve de APKs para controlar almacenamiento. No crear suscripciones ni aumentar límites de gasto.

La CI funcional y Android se incorpora con las etapas 1–2. Un check documental verde no demuestra que la app compile.
