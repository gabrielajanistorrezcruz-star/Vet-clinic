# Vet Clinic — sitio demostrativo

Proyecto de clínica veterinaria online basado en las tres referencias visuales proporcionadas. Incluye páginas de inicio, buscador IA, categorías, perfil, servicios y mapa.

## Estructura

- `index.html`: inicio, recomendación, imagen y carrusel de cinco imágenes.
- `buscador.html`: interfaz de conversación con streaming.
- `categorias.html`: mapa y tarjetas de servicios filtrables por categoría.
- `servicios.html`: listado de servicios y panel de detalles.
- `perfil.html`: formulario de perfil demostrativo.
- `mapa.html`: mapa Leaflet con marcadores ficticios.
- `style.css`: estilos y adaptación responsiva.
- `script.js`: carrusel, filtros, detalles, mapas y chat.
- `server.js`: backend Express y proxy seguro para OpenRouter.
- `.env.example`: variables de entorno de ejemplo.
- `.gitignore`: evita subir `.env` y `node_modules`.

## Requisitos

- Node.js 18 o superior (el backend usa `fetch` global).
- Una cuenta y una API Key de [OpenRouter](https://openrouter.ai/).

## Ejecutar localmente

1. Abre una terminal dentro de esta carpeta.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Copia `.env.example` a `.env`:

   ```bash
   copy .env.example .env
   ```

   En macOS/Linux:

   ```bash
   cp .env.example .env
   ```

4. Edita `.env` y configura tu clave y el modelo:

   ```env
   OPENROUTER_API_KEY=tu_clave_real_de_openrouter
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

   `openai/gpt-4o-mini` es un modelo disponible en OpenRouter. Puedes cambiarlo por cualquier otro modelo disponible en tu cuenta sin modificar el código.

5. Inicia el servidor:

   ```bash
   npm start
   ```

6. Abre `http://localhost:3000` o directamente `http://localhost:3000/buscador.html`.

### Usar Live Server (puerto 5500)

Live Server solo sirve archivos estáticos: no ejecuta `server.js` ni acepta `POST`. Por eso, si abres el frontend con Live Server y el código llama a `/api/chat`, la petición va a `http://127.0.0.1:5500/api/chat` y el servidor estático responde **405 Method Not Allowed**.

Solución:

1. Mantén el backend Express ejecutándose en otra terminal con `npm start`.
2. Abre la página con Live Server. El frontend detecta que no está servida por el backend y envía la petición a `http://<mismo-host>:3000/api/chat`.
3. El backend permite CORS desde `localhost` y `127.0.0.1` en cualquier puerto local.

También puedes servir todo desde Express y evitar CORS por completo: `http://localhost:3000/buscador.html`.

Si cambias el puerto del backend, define el destino antes de cargar `script.js`:

```html
<script>
  window.VET_CLINIC_API_BASE = 'http://localhost:4000';
</script>
<script src="script.js"></script>
```

No abras `buscador.html` con doble clic (`file://`): el navegador bloquea las peticiones al backend. Usa `http://` (Live Server o Express).

El mapa requiere conexión a internet para cargar Leaflet y los mosaicos de OpenStreetMap. Las ubicaciones del mapa están marcadas como demostrativas y no representan clínicas reales.

## Cómo funciona el Buscador IA

- El frontend envía la conversación a `POST /api/chat` mediante `fetch`. Si la página se sirve con Live Server, la petición se dirige automáticamente al backend del puerto 3000.
- El backend valida los mensajes, añade un `system prompt` veterinario y llama a OpenRouter con `stream: true`.
- OpenRouter responde con Server-Sent Events (SSE). El backend reenvía cada fragmento al navegador y el frontend lo muestra progresivamente.
- El historial se conserva durante la sesión y se envía con cada nueva consulta. Se limita a los últimos 20 mensajes para controlar el tamaño de la solicitud.
- El botón **Enviar** se desactiva mientras hay una solicitud pendiente, y el campo admite envío con **Enter**.
- Los mensajes vacíos no se envían. Cada mensaje tiene un límite de 4000 caracteres.
- Si OpenRouter devuelve un error, el buscador muestra un mensaje comprensible y permite volver a intentarlo.

### Seguridad

- La API Key permanece únicamente en `.env` y se usa solo en `server.js`. Nunca se envía al navegador.
- El backend no devuelve detalles internos de OpenRouter al usuario; solo mensajes de error seguros. Los detalles técnicos se registran en la consola del servidor.
- Se aplica un límite de 30 solicitudes por minuto por IP.
- El cuerpo de las solicitudes está limitado a 256 KB y la conversación a 24 000 caracteres.
- Los archivos internos (`.env`, `server.js`, `package.json`, `node_modules`) no se sirven como contenido estático.

### Comprobar el funcionamiento

1. Inicia el backend con `npm start`.
2. Abre `http://localhost:3000/buscador.html`.
3. Envía un mensaje como: «Mi perro cojea desde ayer».
4. Comprueba que la respuesta aparece progresivamente.
5. Responde con «Tiene 4 años y es un labrador» y verifica que la IA recuerda el contexto anterior.
6. Prueba a pulsar **Enter** y comprueba que no se envían mensajes vacíos.
7. Detén el servidor e intenta enviar un mensaje: debe aparecer un aviso de conexión.
8. Si falta la API Key, el buscador mostrará un aviso de configuración. Añádela en `.env`, reinicia el servidor y vuelve a probar.

## Imágenes

Las imágenes de ejemplo se cargan desde Unsplash y otras URLs externas mediante sus atributos `src` en `index.html` y `categorias.html`. Para reemplazarlas, cambia esas rutas por archivos locales dentro de `assets/`.

Imágenes locales incluidas:

- `assets/atencion-veterinaria.png`: tercer slide del carrusel de `index.html` («Atención veterinaria»).
- `assets/cirugia-menor.png`: tarjeta «Cirugía menor» de `categorias.html`.

El carrusel contiene exactamente cinco imágenes.

## Seguridad y limitaciones

La clave de OpenRouter se utiliza únicamente en `server.js`, nunca en el navegador. El perfil es una demostración y no guarda datos de forma persistente. Los precios de servicios son ejemplos. El asistente brinda información general y no sustituye la consulta veterinaria.
