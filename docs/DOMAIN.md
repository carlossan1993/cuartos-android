# Modelo de dominio · schemaVersion 1

La etapa 4 incorpora datos, geometría, codec JSON y acciones de edición independientes de la interfaz. No incorpora todavía el asistente visual, catálogo ni editores 2D/3D.

## Contrato compartido

| Dato | Convención |
| --- | --- |
| Medidas | Metros; conversión explícita desde/hacia centímetros, sin redondear datos persistidos |
| Plano | X/Y; la posición de muebles representa el centro de su base |
| Mundo 3D | X/Z para el piso; Y para elevación |
| Rotación | Grados en sentido horario en el plano; rango `[0, 360)` |
| Pared | Arista dirigida entre dos vértices identificados; ID `roomId:startId:endId` |
| Abertura | Offset desde el inicio de esa arista; altura de antepecho desde el piso |
| Materiales | Color `#RRGGBB`, textura opcional identificada localmente; cada pared tiene material |
| Fechas | ISO UTC canónico; `updatedAt` no retrocede aunque cambie el reloj |
| Idioma | `languageMetadata.createdWith` documenta el idioma de creación; cambiar la interfaz no altera el diseño |

Los IDs de paredes no dependen del índice del array: mover vértices o cambiar el vértice inicial conserva las referencias. Invertir o cambiar la topología que elimina paredes referenciadas se rechaza; no se reasigna silenciosamente una puerta a otra pared.

## Estado y edición

`createProjectStore` utiliza Zustand vanilla. Expone lectura, suscripción y acciones semánticas para crear/cargar/cerrar, renombrar, añadir/modificar/eliminar habitaciones, aberturas y muebles, cambiar la vista e importar/exportar el modelo.

Cada acción valida y copia el resultado antes de publicarlo. Los snapshots son inmutables en tipos y se congelan recursivamente. Un fallo de validación deja intacto el snapshot anterior. Eliminar una habitación elimina sus muebles/aberturas; modificarla no escala automáticamente sus muebles.

El store público no expone `setState`. Dos renderizadores pueden suscribirse al mismo snapshot sin mantener copias independientes. La etapa 5 conecta el asistente y el resumen a este store; la creación se publica después de guardar correctamente.

## Validación y portabilidad

El codec acepta exclusivamente el esquema 1; versiones desconocidas se rechazan sin intentar una migración destructiva. Todavía no hay versiones antiguas publicadas que migrar. La validación cubre campos conocidos, datos finitos, IDs únicos, fechas, polígonos ortogonales simples, materiales y referencias entre entidades.

Las aberturas deben caber en su pared y altura, las puertas comienzan en el piso y los rectángulos de aberturas no pueden superponerse en una misma pared. Ventanas sobre puertas y aberturas contiguas son válidas si no se solapan. Los controles visuales de estas reglas corresponden a la etapa 7.

Los muebles conservan sus dimensiones y materiales aunque su `catalogId` no tenga un renderizador instalado. La etapa 9 incorpora límites de huella girada y altura en la frontera de edición de muebles, conservando la lectura de registros anteriores de esquema 1. El catálogo usa medidas fijas; las instancias recuperadas mantienen sus propias medidas. No hay bloqueo de superposición entre piezas ni con el giro de puertas, ni controles de redimensionado. Detalles: [FURNITURE](FURNITURE.md).

Límites de validación V1: dos habitaciones, 4–64 vértices por contorno, 256 aberturas, 2.000 muebles, 256 partes de material por objeto y JSON de hasta 2 MiB en UTF-8. Coordenadas entre −10.000 y 10.000 m y medidas positivas acotadas a 10.000 m. Son límites defensivos, no dimensiones recomendadas. No se incorporan casas completas ni varias plantas.

`serializeProject`/`deserializeProject` operan en memoria. La etapa 5 los conecta a [Dexie para el guardado mínimo](STORAGE.md). La etapa 13 amplía el guardado semántico, las copias independientes y la gestión offline. Las copias de archivos nativos y los controles de importar/exportar corresponden a la etapa 14.

## Dirección de color

Por indicación del propietario, el azul `#03038c` es el acento principal: títulos, marca, icono, selector, foco y partes de la ilustración. Se conservan fondos neutros, salvia secundaria y un detalle cálido. El objetivo es contraste y presencia de color, sin una paleta completamente pastel.

## Distribuciones · Etapa 12

La L usa un polígono ortogonal de seis vértices. Dos espacios conectados son dos Room con bordes coincidentes y sus interiores a lados opuestos. Ese tramo común se representa abierto de piso a techo; no introduce una entidad de conexión ni cambia el esquema 1. El codec estructural conserva proyectos anteriores. La frontera de edición de aberturas rechaza puertas/ventanas nuevas que invadan el paso abierto; el borrado o la corrección de registros anteriores siguen disponibles. Detalles y límites: [LAYOUTS](LAYOUTS.md).
