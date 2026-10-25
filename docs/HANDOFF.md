# Continuidad · Cuartos Android
Última actualización: 25 de octubre de 2026 (America/Guayaquil).

Registro de privacidad anterior a Odamus (ver identidad vigente abajo): contacto csdigital.apps@gmail.com; privacidad ES/EN versión 2026-10-24.2 sin nombre personal/enlaces GitHub, publicada en Firebase Hosting del proyecto/sitio cuartos-42b27. URLs verificadas: https://cuartos-42b27.web.app/es.html y https://cuartos-42b27.web.app/en.html; HTTP 200, HTML idéntico al código fuente. No volver a pedir proyecto, correo o despliegue inicial.

## Identidad vigente: Odamus
El propietario confirmó Odamus y aprobó el icono isométrico azul (Issue #42). Nombre público ES/EN, launcher, splash, cabecera y materiales de Play se actualizan en esta entrega. Original en assets/branding/odamus-master.png; variante de Play 512 px; cabecera 192 px; Android 432 px con foreground adaptativo protegido.
Se conservan com.carlossan1993.cuartos, repositorio, Firebase cuartos-42b27, base local, formato de archivos y clave de carga existentes. No regenerar clave ni cambiar applicationId.
La política fuente pasa a 2026-10-25.1, Odamus. **Pendiente republicarla en el Hosting existente** desde main tras integrar, y verificar ES/EN antes de firmar. El preflight de firma exige nombre/versión actuales en la URL pública.
El AAB de ejecución 40202306579 incluye botones alineados pero aún dice Cuartos y usa icono anterior: no usarlo como AAB Odamus. Regenerar AAB desde main actualizado después de publicar la política. No se publica en Play desde este cambio. QA física #33 sigue pendiente.

## Punto de partida
Repositorio público: [carlossan1993/cuartos-android](https://github.com/carlossan1993/cuartos-android). Leer AGENTS.md, CONTRIBUTING.md, [STATUS](STATUS.md), [ROADMAP](ROADMAP.md), [PLAY_STORE](PLAY_STORE.md) y [QA](QA.md). No ejecutar etapa 20 en el chat que prepara este documento: el propietario continuará en otro.

- Etapas 0–17 integradas.
- Etapa 18: automatización integrada en [PR #34](https://github.com/carlossan1993/cuartos-android/pull/34), merge eff2d20e58ea2ff553fe69c6cc22d16f9ea5461c. CI [40104110524](https://github.com/carlossan1993/cuartos-android/actions/runs/40104110524): 302 Vitest + dos Node, 78 E2E detallados + 24 matriz, cinco JVM, seis flujos APK en AVD API 35 con radios desactivadas y reapertura/PID nuevo.
- [#33](https://github.com/carlossan1993/cuartos-android/issues/33) sigue abierta para P01–P07 físicos. IME visible, pérdida de contexto nativa y presión de memoria no quedaron demostrados por ese smoke. No convertir la aprobación general del propietario en registros de pruebas específicos.
- Etapa 19 cerrada en [#35](https://github.com/carlossan1993/cuartos-android/issues/35): materiales integrados en #36/#37/#38 y AAB firmado real en [ejecución 40131418704](https://github.com/carlossan1993/cuartos-android/actions/runs/40131418704), fuente 40fd03bc45bb493a7e9b4b997ef30f1dbfd710ad. Consultar #35 para la integración documental final; esta no modifica el binario firmado.
- El propietario autorizó adelantar la preparación con QA física pendiente. Datos/URL/clave reales y firma comprobados; readyForSigning=true, readyForUpload=false por physicalQaComplete=false. No se publicó en Play ni se inició etapa 20.

## Corrección posterior al cierre: botones del inicio
El propietario pidió alinear crear/importar antes de pasar a otro chat. Se agrupan en home-actions con dos columnas iguales y separación de 8 px, eliminando márgenes independientes. La Issue/PR de esta corrección registra validación e integración. El AAB firmado de la ejecución 40131418704 conserva el código anterior: **no incluye este ajuste**. Para llevar el ajuste a Play se debe ejecutar de nuevo Signed upload AAB desde el main actualizado, con la misma clave/secrets existentes y aprobación de play-upload. No regenerar clave ni presentar el AAB anterior como actualizado. QA física #33 sigue pendiente y no se inicia etapa 20 aquí.

## Entregables de preparación
Ficha ES/EN en play/listing, propuesta de declaraciones en play/DATA_SAFETY.md, política offline y HTML para hosting a partir de src/privacy/content.json, capturas/gráficos generados por CI y AAB release firmado/verificado. El artifact firmado es cuartos-upload-signed (ID 12574699065), disponible hasta el 7 de noviembre de 2026, 15:51 America/Guayaquil. No se afirma descarga del AAB por el propietario; indicar que conserve el ZIP antes de su expiración. Procedimientos y límites en [PLAY_STORE](PLAY_STORE.md). Scripts y fuentes están en git y los artifacts son regenerables.

El smoke de etapa 19 añade comprobaciones de privacidad offline ES/EN y Atrás nativo; consultar el resultado real en #35/PR. La interfaz solo añade acceso a privacidad en el pie de inicio. Se conserva el modelo esquema 1, editor, guardado transaccional e historial. Azul principal #03038c, neutros/salvia y textos completos ES/EN.

## Datos resueltos y pendientes para la continuación
1. Correo público confirmado por el propietario: csdigital.apps@gmail.com. No volver a pedirlo. Política sin nombre personal ni enlace GitHub. Se conserva Cuartos/com.carlossan1993.cuartos del proyecto aceptado y el propietario confirmó público 13+ (13–15, 16–17 y 18+). La identidad legal de la cuenta de Play se revisa en consola antes de enviar; no se inventó ni se completó aquí.
2. Hosting resuelto: proyecto/sitio cuartos-42b27, target cuartos-privacy, public docs/privacy; URLs ES/EN verificadas sin login y registradas en PLAY_STORE.md. .firebaserc conserva el mapeo público; play/release.json contiene la URL española. Para cambios posteriores usar una sesión Firebase autorizada del propietario; no reutilizar proyectos de otras apps ni desplegar servicios adicionales.
3. Firma resuelta: el propietario creó y respaldó la clave en Cloud Shell; alias cuartos-upload, PKCS12, RSA 3072, CN=Cuartos. Secrets y variable pública en play-upload, aprobación del entorno y workflow correctos. No volver a generar la clave ni solicitar el archivo/contraseña. AAB de 3487034 bytes, SHA-256 8401634ea8f2c09d938853bed45aff5855bbbdf08d54ebd8a6f6e4c904ce6cbd; certificado público SHA-256 ddff97854355aece66cec911f0871bef1435b9d0a4a0b6c3ba4fc6346654c6be. Job 120983741604: Gradle release, huella, firma JAR estricta e inspección correctos. Hash/tamaño y certificado del artifact descargado contrastados independientemente; detalle en PLAY_STORE.md. Cerrar la sesión gh de Cloud Shell al terminar; no borrar clave/backups.
4. Completar QA física #33 antes de distribución.

## Siguiente chat
Primero verificar main e Issues #33/#35, conservar el artifact firmado y completar P01–P07 físicos de #33. La preparación de etapa 19 está cerrada; no volver a pedir contacto, Hosting, audiencia o generación de clave. Después ejecutar etapa 20 (pruebas de Play): cuenta/Play App Signing, carga del AAB verificado, ficha y formularios reales, instalación desde Play y feedback. Verificar requisitos de cuenta/testing vigentes en ese momento; no arrastrar números de testers/plazos de otros proyectos. Etapa 21: lanzamiento V1 tras aceptación. No publicar automáticamente en producción.

Mensaje sugerido para iniciar:
> Continuemos Cuartos Android desde github.com/carlossan1993/cuartos-android. Lee AGENTS.md, docs/HANDOFF.md, docs/STATUS.md y las Issues #33/#35. La etapa 19 se cerró con AAB firmado/verificado en la ejecución 40131418704; verifica su evidencia e integración. QA física #33 sigue pendiente antes de etapa 20. Mantén GitHub como fuente de verdad, ES/EN, offline, costo cero y azul #03038c.

## Reglas de trabajo
Issue → rama → PR → revisión técnica → checks verdes → integración autorizada. Sin subagentes salvo petición. Sin backend, cuentas, anuncios, pagos, telemetría ni dependencias pagas. No subir keystores/contraseñas ni usar firma debug en Play. No atribuir revisión humana independiente o QA física sin evidencia. No hay datos productivos en las capturas de demostración.

Los anteriores artifacts debug duran tres días; los nuevos paquetes de preparación duran 90 y el AAB firmado manual, 14. El código permanece en GitHub. No duplicar el repositorio en Library. Si el entorno local no está disponible, trabajar mediante el conector GitHub y CI; no afirmar que main local esté sincronizada.
