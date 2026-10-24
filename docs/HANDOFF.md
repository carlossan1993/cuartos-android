# Continuidad · Cuartos Android
Última actualización: 24 de octubre de 2026 (America/Guayaquil).

Decisión vigente: contacto csdigital.apps@gmail.com; privacidad ES/EN versión 2026-10-24.2 sin nombre personal/enlaces GitHub, publicada en Firebase Hosting del proyecto/sitio cuartos-42b27. URLs verificadas: https://cuartos-42b27.web.app/es.html y https://cuartos-42b27.web.app/en.html; HTTP 200, HTML idéntico al código fuente. No volver a pedir proyecto, correo o despliegue inicial.

## Punto de partida
Repositorio público: [carlossan1993/cuartos-android](https://github.com/carlossan1993/cuartos-android). Leer AGENTS.md, CONTRIBUTING.md, [STATUS](STATUS.md), [ROADMAP](ROADMAP.md), [PLAY_STORE](PLAY_STORE.md) y [QA](QA.md). No ejecutar etapa 20 en el chat que prepara este documento: el propietario continuará en otro.

- Etapas 0–17 integradas.
- Etapa 18: automatización integrada en [PR #34](https://github.com/carlossan1993/cuartos-android/pull/34), merge eff2d20e58ea2ff553fe69c6cc22d16f9ea5461c. CI [40104110524](https://github.com/carlossan1993/cuartos-android/actions/runs/40104110524): 302 Vitest + dos Node, 78 E2E detallados + 24 matriz, cinco JVM, seis flujos APK en AVD API 35 con radios desactivadas y reapertura/PID nuevo.
- [#33](https://github.com/carlossan1993/cuartos-android/issues/33) sigue abierta para P01–P07 físicos. IME visible, pérdida de contexto nativa y presión de memoria no quedaron demostrados por ese smoke. No convertir la aprobación general del propietario en registros de pruebas específicos.
- Etapa 19: preparación en [#35](https://github.com/carlossan1993/cuartos-android/issues/35), rama release/play-preparation. Consultar la Issue/PR enlazado para head exacto, checks, integración y artifacts finales. Este documento no puede incluir el hash del commit que lo contiene.
- El propietario autorizó expresamente adelantar esta preparación con QA física pendiente. La firma permanece condicionada a datos/URL y clave reales; distribución, además, a QA física; no se publicó en Play.

## Entregables de preparación
Ficha ES/EN en play/listing, propuesta de declaraciones en play/DATA_SAFETY.md, política offline y HTML para hosting a partir de src/privacy/content.json, capturas/gráficos generados por CI y AAB release sin firma inspeccionado. Procedimientos y límites en [PLAY_STORE](PLAY_STORE.md). Scripts y fuentes están en git y los artifacts son regenerables.

El smoke de etapa 19 añade comprobaciones de privacidad offline ES/EN y Atrás nativo; consultar el resultado real en #35/PR. La interfaz solo añade acceso a privacidad en el pie de inicio. Se conserva el modelo esquema 1, editor, guardado transaccional e historial. Azul principal #03038c, neutros/salvia y textos completos ES/EN.

## Datos que deben completarse antes de cerrar etapa 19
1. Correo público confirmado por el propietario: csdigital.apps@gmail.com. No volver a pedirlo. Política sin nombre personal ni enlace GitHub. Quedan ratificaciones de nombre/paquete/identidad de publicación y público objetivo.
2. Hosting resuelto: proyecto/sitio cuartos-42b27, target cuartos-privacy, public docs/privacy; URLs ES/EN verificadas sin login y registradas en PLAY_STORE.md. .firebaserc conserva el mapeo público; play/release.json contiene la URL española. Para cambios posteriores usar una sesión Firebase autorizada del propietario; no reutilizar proyectos de otras apps ni desplegar servicios adicionales.
3. Clave de carga custodiada y respaldada por el propietario; configurar entorno/secrets fuera de git y ejecutar manualmente Signed upload AAB después de cumplir preflight. No crear ni pegar claves en el chat. Firmar/verificar y registrar AAB/hash/huella/commit/run reales.
4. Completar QA física #33 antes de distribución.

## Siguiente chat
Primero verificar main e Issues #33/#35 y completar lo pendiente; no asumir etapa 19 cerrada. Después ejecutar etapa 20 (pruebas de Play): cuenta/Play App Signing, carga del AAB verificado, ficha y formularios reales, instalación desde Play y feedback. Verificar requisitos de cuenta/testing vigentes en ese momento; no arrastrar números de testers/plazos de otros proyectos. Etapa 21: lanzamiento V1 tras aceptación. No publicar automáticamente en producción.

Mensaje sugerido para iniciar:
> Continuemos Cuartos Android desde github.com/carlossan1993/cuartos-android. Lee AGENTS.md, docs/HANDOFF.md, docs/STATUS.md y las Issues #33/#35. La preparación de etapa 19 se hizo en el chat anterior; verifica su integración y pendientes reales antes de avanzar a etapa 20. Mantén GitHub como fuente de verdad, ES/EN, offline, costo cero y azul #03038c.

## Reglas de trabajo
Issue → rama → PR → revisión técnica → checks verdes → integración autorizada. Sin subagentes salvo petición. Sin backend, cuentas, anuncios, pagos, telemetría ni dependencias pagas. No subir keystores/contraseñas ni usar firma debug en Play. No atribuir revisión humana independiente o QA física sin evidencia. No hay datos productivos en las capturas de demostración.

Los anteriores artifacts debug duran tres días; los nuevos paquetes de preparación duran 90 y el AAB firmado manual, 14. El código permanece en GitHub. No duplicar el repositorio en Library. Si el entorno local no está disponible, trabajar mediante el conector GitHub y CI; no afirmar que main local esté sincronizada.
