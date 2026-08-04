# Auditoría IDML — Afiche Hanta

Fecha: 2026-08-04

Archivo: `Afiche_Hanta_A3_imagenes_incrustadas.idml`

SHA-256: `CA9AA12E8624DC99C48B52B73C9EFC96BB480D97654DD267F5DDDAB1B27DF61E`

## Conclusión ejecutiva

El archivo demuestra que una IA puede reconstruir un afiche complejo como un IDML real, autocontenido, visualmente utilizable y editable en InDesign. No es una imagen plana: textos, marcos, colores e imágenes existen como objetos independientes y todas las referencias internas principales están completas.

La construcción, sin embargo, reproduce el afiche objeto por objeto. Es adecuada para terminar una pieza única, pero todavía no constituye un sistema editorial reutilizable: casi toda la tipografía está aplicada localmente, no hay grupos semánticos, sólo existe una capa, la página maestra no aporta estructura y los recursos raster tienen baja resolución efectiva para impresión exigente.

Este IDML es un excelente fixture positivo para el futuro exportador de Open CoDesign y, a la vez, una especificación de lo que debemos superar.

## Anatomía comprobada

- Paquete ZIP IDML válido de 2.502.141 bytes y 90 entradas.
- `mimetype` es la primera entrada, no está comprimida y declara `application/vnd.adobe.indesign-idml-package`.
- Documento DOMVersion 21.4.
- Una página A3 vertical: 841,89 × 1.190,55 pt, equivalente a 297 × 420 mm.
- Un spread, una página maestra y una capa (`Capa 1`).
- 47 stories, 47 marcos de texto y correspondencia uno a uno completa.
- 47 rectángulos, 31 imágenes colocadas, ningún grupo y ningún marco de texto maestro.
- Las 31 imágenes referenciadas existen dentro de `Links/`; no hay vínculos faltantes ni activos empaquetados sin uso.
- 21 colores, incluido un conjunto Hanta en CMYK, y un gradiente.
- Perfil CMYK del documento: Coated FOGRA39; perfil RGB: sRGB IEC61966-2.1.
- El texto usa idioma español de Castilla y permanece como contenido editable.

## Lo que funcionó especialmente bien

1. **Reconstrucción real, no incrustación plana.** Los textos están separados en stories y las imágenes viven en marcos gráficos independientes.
2. **Portabilidad.** Todos los activos utilizados viajan dentro del paquete y las referencias `file:Links/...` son coherentes.
3. **Integridad referencial.** Las 47 stories declaradas, sus archivos y los 47 `ParentStory` de los marcos coinciden sin duplicados ni ausencias.
4. **Color editorial.** La paleta principal fue materializada como muestras CMYK con nombres reconocibles (`HantaGreen`, `HantaRed`, `HantaYellow`, etc.).
5. **Geometría apropiada.** El tamaño de página corresponde exactamente a A3 y los objetos conservan coordenadas editables.
6. **Resultado pragmático.** Para una pieza única, la abundancia de marcos independientes permite corregir textos, sustituir imágenes y ajustar posiciones en InDesign.

## Límites y riesgos observados

### Estilos y mantenibilidad

- Las 47 stories usan `Basic Paragraph` y una combinación de formato local.
- Sólo existen los estilos básicos heredados de la plantilla: no hay estilos nominales para título, bajada, encabezados, cuerpos, llamados, tarjetas o pie.
- Se detectaron al menos 21 combinaciones locales de fuente, peso, tamaño, interlínea y color.
- Una modificación global exige seleccionar objetos o editar XML; no existe una autoridad tipográfica reutilizable.

### Estructura semántica

- No hay grupos. Una tarjeta, bloque preventivo o sección visual no existe como unidad seleccionable.
- Todo vive en una sola capa. No se separan fondo, contenido, iconografía, alertas, encabezado o pie.
- La página maestra está aplicada, pero no contiene marcos reutilizables.
- Las stories no están enlazadas. Esto es aceptable para un afiche, pero impide redistribuir texto automáticamente si cambia la extensión del contenido.
- Los saltos de línea están incorporados manualmente para reproducir la composición; cambios de texto pueden producir desbordes o ritmos inesperados.

### Tipografías

- El contenido utiliza principalmente Arial y, en un caso, Times New Roman.
- `Resources/Fonts.xml` conserva fuentes de la plantilla —Minion Pro, Myriad Pro y Kozuka Mincho— en vez de describir con claridad sólo las fuentes realmente utilizadas.
- Tres variantes de Myriad aparecen como `Substituted`, aunque no forman parte de la tipografía observada en las stories. Es residuo de plantilla y ruido para preflight.
- El exportador OCD deberá generar recursos tipográficos coherentes y fallar explícitamente cuando una fuente requerida no esté disponible.

### Imágenes y preprensa

- Las 31 imágenes son PNG RGB, con dimensiones aproximadas entre 85 y 415 píxeles.
- InDesign registra 72 ppp efectivos en todas las colocaciones. Es suficiente para iconografía pequeña o una prueba, pero no es un estándar seguro para impresión A3 de calidad.
- El documento es CMYK, pero los activos permanecen RGB. La conversión final queda delegada al flujo de salida de InDesign.
- Para producción se debe preferir SVG/PDF vectorial en iconos y logotipos, o raster a 250–300 ppp efectivos según tamaño final.

### Residuos de plantilla

- El nombre interno es `Sin título-3`.
- Se conservaron idiomas, fuentes, estilos y recursos que no pertenecen al afiche.
- Esto no impide abrir el documento, pero aumenta ruido, dificulta auditoría y puede ocultar sustituciones reales.

## Lecciones para el exportador IDML de Open CoDesign

El MVP no necesita modelar todo InDesign. Puede partir de una plantilla IDML mínima y construir de forma determinista:

1. Documento, páginas, spreads, sangrado y perfiles.
2. Muestras de color y gradientes con IDs estables.
3. Fuentes y estilos nominales antes de crear contenido.
4. Stories y marcos de texto conectados por IDs verificables.
5. Marcos gráficos y activos empaquetados dentro de `Links/`.
6. Grupos y capas derivados de secciones/componentes de OCD.
7. Página maestra para elementos repetidos.
8. `designmap.xml` y referencias internas generados al final desde el grafo real.

La IA debe decidir semántica y composición; el escritor IDML debe ser determinista. No conviene pedirle al modelo que escriba libremente todos los XML en cada exportación. La salida de IA debería alimentar una escena validada y el adaptador debería materializarla usando plantillas y reglas estables.

## Criterios de aceptación propuestos

- Abre en InDesign sin reparación, advertencias estructurales ni archivo recuperado.
- Todos los textos y activos son editables.
- Cero vínculos faltantes y cero IDs huérfanos.
- Cero fuentes sustituidas no autorizadas.
- Estilos reutilizables para todas las categorías tipográficas y de objeto repetidas.
- Secciones agrupadas y capas con nombres semánticos.
- Activos con resolución efectiva suficiente o equivalentes vectoriales.
- Paleta y perfiles de color explícitos.
- Cambio global de color o tipografía realizable modificando un estilo/muestra.
- Reexportación a PDF de impresión sin alterar la composición.

## Próximo spike recomendado

Usar este afiche como prueba dorada y construir un escritor mínimo que reproduzca sólo tres zonas:

1. encabezado con título, imagen y logotipo;
2. una fila de tarjetas de riesgo;
3. un bloque preventivo con icono, título y texto.

El spike debe crear estilos, grupos y capas que este archivo no posee, empaquetar tres activos, abrir sin reparación y permitir un cambio global de paleta. Si funciona, se amplía al resto del afiche y luego se conecta con la escena de Open CoDesign.
