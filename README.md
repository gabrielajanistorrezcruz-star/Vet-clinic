# Vet Clinic — sitio demostrativo

Proyecto de clínica veterinaria online basado en las tres referencias visuales proporcionadas. Incluye páginas de inicio, buscador IA, categorías, perfil, servicios y mapa.

## Estructura

- `index.html`: inicio, recomendación, imagen y carrusel de cinco imágenes.
- `buscador.html`: interfaz de conversación con streaming.
- `categorias.html`: mapa y cuatro tarjetas filtrables por categoría.
- `servicios.html`: listado de servicios y panel de detalles.
- `perfil.html`: formulario de perfil demostrativo.
- `mapa.html`: mapa Leaflet con marcadores ficticios.
- `style.css`: estilos y adaptación responsiva.
- `script.js`: carrusel, filtros, detalles, mapas y chat.
- `server.js`: proxy backend seguro para OpenRouter.
- `.env.example`: variables de entorno de ejemplo.

## Ejecutar localmente

1. Instala Node.js (versión LTS).
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm install`.
4. Copia `.env.example` a `.env`.
5. En `.env`, configura `OPENROUTER_API_KEY` con tu clave de OpenRouter. No publiques ese archivo.
6. Opcionalmente ajusta `OPENROUTER_MODEL`.
7. Ejecuta `npm start`.
8. Abre `http://localhost:3000`.

El mapa requiere conexión a internet para cargar Leaflet y los mosaicos de OpenStreetMap. Las ubicaciones del mapa están marcadas como demostrativas y no representan clínicas reales.

## Imágenes

Las imágenes de ejemplo se cargan desde Unsplash mediante sus URL en los atributos `src` de `index.html` y `categorias.html`. Para reemplazarlas, cambia esas rutas por archivos locales, por ejemplo `assets/mascota-1.jpg`. El carrusel contiene exactamente cinco imágenes.

## Seguridad y limitaciones

La clave de OpenRouter se utiliza únicamente en `server.js`, nunca en el navegador. El perfil es una demostración y no guarda datos de forma persistente. Los precios de servicios son ejemplos. El asistente brinda información general y no sustituye la consulta veterinaria.
