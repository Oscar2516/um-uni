# Modernización UNI – Unidad de Modernización

Sitio web estático de la Unidad de Modernización de la Universidad Nacional de Ingeniería.
Se publica con **GitHub Pages** desde la carpeta `docs/`. Las cifras y tablas se leen de un Google Sheets.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/template.html` | Plantilla única (diseño, menú, búsqueda, lectura de Sheets) |
| `config.json` | ID del Google Sheets, nombres de pestañas, imágenes y enlaces del menú (opcional) |
| `Imagenes/` | Imágenes originales (logos, fachada, banners por sección) |
| `build.ps1` | Genera el sitio en `docs/` y optimiza las imágenes |
| `docs/` | Sitio generado y publicado (HTML + `img/`) |
| `plantillas_sheets/` | CSV de ejemplo para cada pestaña del Google Sheets |

## Actualizar el sitio

1. Cambia datos en el Google Sheets → se reflejan solos, sin tocar el repositorio.
2. Cambia diseño, imágenes o `config.json` → ejecuta:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build.ps1
   git add -A
   git commit -m "Actualiza sitio"
   git push
   ```

## Google Sheets

Debe estar compartido como **"Cualquier persona con el enlace – Lector"** y tener estas pestañas:
`Resumen`, `Proyectos`, `Normativa`, `Procesos`, `Simplificacion`, `Organizacion`, `Innovacion`, `ServiciosDigitales`.
Los encabezados de ejemplo están en `plantillas_sheets/`.

## Publicar en GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, carpeta `/docs` → Save**.
La página quedará en `https://<usuario>.github.io/<repositorio>/`.

## Páginas

`index.html` (inicio), `normativa.html`, `procesos.html`, `simplificacion.html`, `organizacion.html`, `innovacion.html`, `servicios-digitales.html`.
