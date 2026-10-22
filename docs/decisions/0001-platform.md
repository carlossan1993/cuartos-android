# ADR 0001 · Plataforma, costo y flujo

Estado: decisiones transcritas de la guía maestra v3; implementación pendiente.

Fecha: 22 de octubre de 2026.

## Decisión

Construir una aplicación Android con React/TypeScript/Vite y Capacitor. Usar un modelo de dominio único para 2D y 3D, guardado local y traducciones ES/EN desde la primera pantalla real.

Mantener código, revisión, pruebas y builds en GitHub. No introducir backend, cuentas, seguimiento, pagos, anuncios ni servicios obligatorios de pago en V1.

## Motivo

La guía exige medidas reales, edición táctil, representación 3D legible, funcionamiento sin conexión, costo obligatorio de desarrollo cero y distribución en Google Play.

## Consecuencias

- GitHub es la fuente de verdad; un paquete provisional no equivale a un commit aceptado.
- El scaffold debe producir build web y compilar Android en CI.
- Los muebles iniciales serán procedurales y los activos tendrán licencia compatible.
- El fotorealismo, la IA, AR y el diseño de viviendas completas quedan fuera de V1.
- SDK, dependencias y requisitos de Play se verificarán en el momento de implementación/release.
