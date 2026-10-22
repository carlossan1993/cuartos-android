# Flujo de cambios

1. Crear una Issue con objetivo, etapa, alcance y criterio verificable.
2. Crear una rama desde `main`: `feature/*`, `fix/*`, `chore/*` o `release/*`.
3. Implementar el cambio mínimo que cumple la Issue.
4. Abrir PR con vínculo a la Issue, explicación y evidencia.
5. Resolver fallos y revisar técnicamente el diff; registrar la evidencia sin presentarla como revisión humana independiente.
6. Integrar después de la revisión técnica y los checks verdes, dentro de la autorización de trabajo vigente. Cerrar la Issue y actualizar el estado.

Para un repositorio de un solo responsable no se exige una segunda cuenta ni un servicio de revisión de pago. La autorización del propietario para desarrollar permite integrar PRs reversibles con revisión técnica y checks verdes, salvo que solicite aprobación manual o una regla técnica la exija. El agente presenta evidencia y no inventa una aprobación humana.

## Contrato de cada PR

- Un objetivo concreto; sin refactorizaciones ajenas.
- Criterios de aceptación marcados solo si se comprobaron.
- ES/EN incluidos cuando hay textos nuevos.
- Pruebas de dominio cuando cambia geometría, serialización o persistencia.
- Evidencia visual cuando cambia la interfaz.
- Checks de CI verdes y riesgos o verificaciones manuales pendientes explícitos.

## Inicio del repositorio

El commit mínimo de inicialización permite crear `main`. La base de gobierno se incorpora en `chore/repository-foundation` y se revisa como primer PR. No se da por completada la etapa 0 hasta que ese PR esté revisado, integrado y verificado.

## Validación por etapas

En la etapa 0 solo existe validación documental. Las etapas 1–2 incorporan compilación web/Android, lint, typecheck y pruebas. Los siguientes PR amplían los controles según la función implementada; no se usan resultados de una etapa como evidencia de otra.
