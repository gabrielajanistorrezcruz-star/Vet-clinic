require('dotenv').config();

const express = require('express');

if (typeof fetch !== 'function') {
  console.error('Vet Clinic requiere Node.js 18 o superior (fetch global no disponible).');
  process.exit(1);
}

const app = express();

const PORT = Number.parseInt(process.env.PORT || '3000', 10) || 3000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const LIMITS = {
  maxBody: '256kb',
  maxMessages: 24,
  maxContentLength: 4000,
  maxConversationLength: 24000,
  requestTimeoutMs: 90000,
  rateWindowMs: 60000,
  rateMaxRequests: 30,
};

const SYSTEM_PROMPT = `Eres el asistente informativo de Vet Clinic, una clínica veterinaria online. Estás especializado exclusivamente en perros, gatos y aves, y en su salud, alimentación, cuidados, higiene, vacunación, desparasitación, comportamiento y bienestar general.

Tu forma de responder:
- Responde siempre en español, con un lenguaje cálido, claro, respetuoso y fácil de entender.
- Sé breve y útil. Normalmente responde en 2 a 4 párrafos cortos, salvo que el usuario pida más detalle.
- Responde en texto plano, sin Markdown. No uses asteriscos, negritas, encabezados con #, tablas ni bloques de código. Para listas cortas, usa guiones.
- Cuando el usuario describa síntomas, primero identifica la especie. Si no la ha indicado, pregúntale qué tipo de mascota es.
- Pide la información que falte para orientar mejor: edad aproximada, raza, sexo, duración de los síntomas, frecuencia, cambios de comportamiento, alimentación y si ha habido contacto con otros animales o sustancias.
- Explica posibles causas de manera prudente, usando expresiones como "puede estar relacionado con", "conviene valorar" o "no es posible confirmarlo sin una revisión".
- Da orientación general y pasos de observación o cuidado que sean seguros.
- Recomienda acudir a una clínica veterinaria cuando sea necesario y explica brevemente por qué.
- Si la consulta no está relacionada con animales o cuidados veterinarios, indícalo amablemente y redirige la conversación a tu especialidad.

Seguridad veterinaria:
- No presentes diagnósticos como certezas y no sustituyas una consulta veterinaria profesional.
- No recetes medicamentos, no indiques dosis y no recomiendes tratamientos peligrosos ni remedios caseros arriesgados.
- Si no dispones de información suficiente, dilo con claridad y formula preguntas.
- Ante señales de emergencia, recomienda atención veterinaria inmediata. Son señales de emergencia, entre otras: dificultad para respirar, convulsiones, sangrado abundante, intoxicación, golpe de calor, incapacidad para orinar, vómitos persistentes, diarrea con sangre, decaimiento extremo, dolor intenso o traumatismo grave.
- Recuerda al usuario que la información es orientativa y no reemplaza la valoración de un veterinario.`;

/* ------------------------------------------------------------------ */
/* Seguridad y utilidades básicas                                      */
/* ------------------------------------------------------------------ */

app.disable('x-powered-by');

// CORS para desarrollo local: permite abrir el frontend con Live Server
// (u otro puerto estático) mientras el backend sigue escuchando en el 3000.
const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;
const EXTRA_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && (LOCAL_ORIGIN.test(origin) || EXTRA_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  // El navegador envía un preflight OPTIONS antes del POST con JSON.
  if (req.method === 'OPTIONS') return res.status(204).end();

  next();
});

app.use(express.json({ limit: LIMITS.maxBody }));

// Evita que se sirvan archivos internos del backend como contenido estático.
const BLOCKED_STATIC = /^\/(?:\.env(?:\.example)?|server\.js|package(?:-lock)?\.json|node_modules|~\$)(?:\/|$)/i;
app.use((req, res, next) => {
  if (BLOCKED_STATIC.test(req.path)) return res.status(404).end();
  if (req.path.split('/').some((segment) => segment.startsWith('~$'))) {
    return res.status(404).end();
  }
  next();
});

/* ------------------------------------------------------------------ */
/* Límite de solicitudes por IP                                        */
/* ------------------------------------------------------------------ */

const rateBuckets = new Map();

function getClientId(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const id = getClientId(req);
  const bucket = rateBuckets.get(id);

  if (!bucket || now - bucket.start >= LIMITS.rateWindowMs) {
    rateBuckets.set(id, { start: now, count: 1 });
    return next();
  }

  bucket.count += 1;
  if (bucket.count <= LIMITS.rateMaxRequests) return next();

  const retryAfter = Math.max(
    1,
    Math.ceil((LIMITS.rateWindowMs - (now - bucket.start)) / 1000)
  );

  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({
    error:
      'El asistente está recibiendo demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.',
  });
}

const rateCleanup = setInterval(() => {
  const now = Date.now();
  for (const [id, bucket] of rateBuckets) {
    if (now - bucket.start >= LIMITS.rateWindowMs) rateBuckets.delete(id);
  }
}, LIMITS.rateWindowMs);
rateCleanup.unref?.();

/* ------------------------------------------------------------------ */
/* Validación de mensajes                                              */
/* ------------------------------------------------------------------ */

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) {
    return { error: 'La solicitud debe incluir una lista de mensajes.' };
  }

  const cleaned = [];

  for (const raw of rawMessages) {
    if (!raw || typeof raw !== 'object') continue;
    if (raw.role !== 'user' && raw.role !== 'assistant') continue;
    if (typeof raw.content !== 'string') continue;

    const content = raw.content.trim();
    if (!content) continue;

    if (content.length > LIMITS.maxContentLength) {
      return {
        error: `Cada mensaje debe tener como máximo ${LIMITS.maxContentLength} caracteres.`,
      };
    }

    cleaned.push({ role: raw.role, content });
  }

  if (!cleaned.length) {
    return { error: 'Envía un mensaje para iniciar la conversación.' };
  }

  if (cleaned[cleaned.length - 1].role !== 'user') {
    return { error: 'El último mensaje debe ser del usuario.' };
  }

  let trimmed = cleaned.slice(-LIMITS.maxMessages);

  // El historial debe comenzar con un mensaje del usuario para mantener el contexto ordenado.
  while (trimmed.length > 1 && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);

  let total = trimmed.reduce((sum, message) => sum + message.content.length, 0);

  // Si la conversación es demasiado larga, descarta los intercambios más antiguos.
  while (trimmed.length > 1 && total > LIMITS.maxConversationLength) {
    total -= trimmed[0].content.length;
    trimmed = trimmed.slice(1);

    while (trimmed.length > 1 && trimmed[0].role !== 'user') {
      total -= trimmed[0].content.length;
      trimmed = trimmed.slice(1);
    }
  }

  if (total > LIMITS.maxConversationLength) {
    return { error: 'La conversación es demasiado larga. Inicia una consulta nueva.' };
  }

  return { messages: trimmed };
}

/* ------------------------------------------------------------------ */
/* Mensajes de error seguros para el cliente                           */
/* ------------------------------------------------------------------ */

function friendlyUpstreamError(status) {
  if (status === 401 || status === 403) {
    return 'No se pudo autenticar con el asistente. Revisa la configuración de la clave de OpenRouter.';
  }
  if (status === 402) {
    return 'El servicio de inteligencia artificial no tiene créditos disponibles. Revisa el saldo de tu cuenta de OpenRouter.';
  }
  if (status === 404) {
    return 'El modelo configurado no está disponible. Revisa la variable OPENROUTER_MODEL.';
  }
  if (status === 400) {
    return 'La solicitud al asistente no es válida. Revisa la configuración del modelo e inténtalo de nuevo.';
  }
  if (status === 408 || status === 504) {
    return 'El asistente tardó demasiado en responder. Inténtalo de nuevo.';
  }
  if (status === 429) {
    return 'El asistente está recibiendo demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.';
  }
  if (status >= 500) {
    return 'El asistente no está disponible en este momento. Inténtalo de nuevo en unos instantes.';
  }
  return 'No se pudo conectar con el asistente. Comprueba tu conexión e inténtalo de nuevo.';
}

function isPlaceholderKey(key) {
  return /^(?:tu_clave_aqui|pega_aqui_tu_clave)$/i.test(key);
}

/* ------------------------------------------------------------------ */
/* Ruta principal del chat                                             */
/* ------------------------------------------------------------------ */

app.post('/api/chat', rateLimit, async (req, res) => {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();

  if (!apiKey || isPlaceholderKey(apiKey)) {
    return res.status(503).json({
      error:
        'El asistente no está configurado. Añade tu clave de OpenRouter en el archivo .env y reinicia el servidor.',
    });
  }

  const validation = sanitizeMessages(req.body?.messages);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const model = (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();
  const controller = new AbortController();
  let clientGone = false;
  let timedOut = false;
  let heartbeat = null;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, LIMITS.requestTimeoutMs);

  const onClientGone = () => {
    if (!res.writableEnded) {
      clientGone = true;
      controller.abort();
    }
  };

  req.on('aborted', onClientGone);
  res.on('close', onClientGone);

  const writeEvent = (event, payload) => {
    if (clientGone || res.writableEnded) return;
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  };

  const safeEnd = () => {
    try {
      if (!res.writableEnded) res.end();
    } catch {
      /* El cliente ya cerró la conexión. */
    }
  };

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || `http://localhost:${PORT}`,
        'X-Title': 'Vet Clinic',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...validation.messages],
        stream: true,
        temperature: 0.4,
        max_tokens: 900,
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error(`[OpenRouter] HTTP ${upstream.status}: ${detail.slice(0, 400)}`);
      return res.status(upstream.status).json({
        error: friendlyUpstreamError(upstream.status),
      });
    }

    if (!upstream.body) {
      return res.status(502).json({
        error: 'El asistente no devolvió una respuesta válida. Inténtalo de nuevo.',
      });
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    writeEvent('ready', { ok: true });

    heartbeat = setInterval(() => {
      if (!clientGone && !res.writableEnded) res.write(': ping\n\n');
    }, 15000);
    heartbeat.unref?.();

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

    // Algunos proveedores pueden responder JSON aunque se solicite streaming.
    if (contentType.includes('application/json')) {
      const payload = await upstream.json().catch(() => null);
      const content = payload?.choices?.[0]?.message?.content;

      if (typeof content === 'string' && content.trim()) {
        writeEvent('delta', { content });
      } else {
        writeEvent('error', {
          error: 'El asistente no devolvió ninguna respuesta. Inténtalo de nuevo.',
        });
      }

      writeEvent('done', '[DONE]');
      safeEnd();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedContent = false;
    let streamFinished = false;
    let streamError = '';

    while (!streamFinished) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (!data) continue;

        if (data === '[DONE]') {
          streamFinished = true;
          break;
        }

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Algunos proveedores envían comentarios o líneas keep-alive no JSON.
          continue;
        }

        if (parsed?.error) {
          streamError =
            'El asistente no pudo completar la respuesta. Inténtalo de nuevo.';
          console.error('[OpenRouter] Error durante el streaming:', parsed.error);
          streamFinished = true;
          break;
        }

        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          receivedContent = true;
          writeEvent('delta', { content: delta });
        }
      }
    }

    buffer += decoder.decode();

    if (streamError) {
      writeEvent('error', { error: streamError });
    } else if (!receivedContent) {
      writeEvent('error', {
        error: 'El asistente no devolvió ninguna respuesta. Inténtalo de nuevo.',
      });
    }

    writeEvent('done', '[DONE]');
    safeEnd();
  } catch (error) {
    if (timedOut) {
      console.error('[OpenRouter] Tiempo de espera agotado.');
      if (!res.headersSent) {
        return res.status(504).json({
          error: 'El asistente tardó demasiado en responder. Inténtalo de nuevo.',
        });
      }

      writeEvent('error', {
        error: 'El asistente tardó demasiado en responder. Inténtalo de nuevo.',
      });
      writeEvent('done', '[DONE]');
      safeEnd();
      return;
    }

    if (clientGone || error?.name === 'AbortError') {
      safeEnd();
      return;
    }

    console.error('[OpenRouter] Error de conexión:', error?.message || error);

    if (!res.headersSent) {
      return res.status(502).json({
        error:
          'No se pudo conectar con el asistente. Comprueba tu conexión e inténtalo de nuevo.',
      });
    }

    writeEvent('error', {
      error: 'La conexión con el asistente se interrumpió. Inténtalo de nuevo.',
    });
    writeEvent('done', '[DONE]');
    safeEnd();
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    clearTimeout(timeout);
    controller.abort();
    req.off?.('aborted', onClientGone);
    res.off?.('close', onClientGone);
  }
});

/* ------------------------------------------------------------------ */
/* Archivos estáticos y manejo de errores                              */
/* ------------------------------------------------------------------ */

app.use(
  express.static(__dirname, {
    dotfiles: 'ignore',
    index: 'index.html',
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El mensaje es demasiado largo.' });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'La solicitud no es válida.' });
  }

  console.error('[Servidor]', err);
  return res.status(500).json({
    error: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Vet Clinic disponible en http://localhost:${PORT}`);

  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key || isPlaceholderKey(key)) {
    console.warn(
      'Aviso: OPENROUTER_API_KEY no está configurada. El buscador IA mostrará un aviso hasta que añadas tu clave en .env.'
    );
  }
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
