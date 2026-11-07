// Carrusel de cinco imágenes
const slides = [...document.querySelectorAll('.slide')];

if (slides.length) {
  let current = 0;
  const dots = document.querySelector('.dots');

  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Mostrar imagen ${i + 1}`);
    d.addEventListener('click', () => show(i));
    dots.appendChild(d);
  });

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('activo', n === current));
    [...dots.children].forEach((d, n) => d.classList.toggle('active', n === current));
  }

  document.querySelector('.prev')?.addEventListener('click', () => show(current - 1));
  document.querySelector('.next')?.addEventListener('click', () => show(current + 1));
  show(0);
}

// Categorías: filtra servicios usando ?tipo=perros|gatos|aves|todos
const validCategories = ['todos', 'perros', 'gatos', 'aves'];

const serviceCatalog = [
  { name: 'Consulta veterinaria', categories: ['perros', 'gatos'], image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Vacunación', categories: ['perros', 'gatos'], image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4diKA-9lBxBqSxVmiiAilR2ytfxFj6ASZaQayhVdBnw&s=10' },
  { name: 'Desparasitación', categories: ['perros', 'gatos'], image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF98lZgph-kH7vEKyuAY5UJy6ZT9Kh1a1V2rdKC1-75g&s=10' },
  { name: 'Peluquería para mascotas', categories: ['perros', 'gatos'], image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZqyPp034KmE26mscuXiovmpPgkG8GzM1MVWhRfAYBoA&s=10' },
  { name: 'Esterilización', categories: ['perros', 'gatos'], image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80' },
  { name: 'Rayos X', categories: ['perros', 'gatos'], image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=600&q=80' },
  { name: 'Análisis de laboratorio', categories: ['gatos', 'aves'], image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80' },
  { name: 'Cirugía menor', categories: ['perros', 'gatos'], image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895977?auto=format&fit=crop&w=600&q=80' },
  { name: 'Control de dermatología', categories: ['perros', 'aves'], image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80' },
  { name: 'Hospitalización y cuidado intensivo', categories: ['perros', 'aves'], image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80' },
];

function normalizeCategoryList(value = '') {
  return String(value)
    .toLowerCase()
    .split(/\s+/)
    .filter((category) => validCategories.includes(category));
}

function bindCardClicks(container) {
  const cards = [...container.querySelectorAll('.service-card')];
  cards.forEach((card) => {
    card.addEventListener('click', () =>
      openService(card.dataset.service, card.querySelector('img')?.src, card)
    );
  });
}

function renderServiceGrid(selector, selectedCategory = 'todos') {
  const container = document.querySelector(selector);
  if (!container) return;

  const normalizedCategory = validCategories.includes(selectedCategory)
    ? selectedCategory
    : 'todos';

  const visibleServices = serviceCatalog.filter((service) => {
    const serviceCategories = normalizeCategoryList(service.categories.join(' '));
    return normalizedCategory === 'todos' || serviceCategories.includes(normalizedCategory);
  });

  container.innerHTML = visibleServices
    .map((service) => `
      <button class="service-card" type="button" data-category="${service.categories.join(' ')}" data-service="${service.name}">
        <span class="service-card__image">
          <img src="${service.image}" alt="${service.name}">
        </span>
        <span>${service.name}</span>
      </button>
    `)
    .join('');

  bindCardClicks(container);
}

function syncFilterButtons(selectedCategory = 'todos') {
  const normalizedCategory = validCategories.includes(selectedCategory)
    ? selectedCategory
    : 'todos';

  const filterButtons = [...document.querySelectorAll('.category-filter')];
  filterButtons.forEach((button) => {
    const buttonValue = (button.dataset.filter || 'todos').toLowerCase();
    const isActive = buttonValue === normalizedCategory;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function applyCategoryFilter(selectedCategory = 'todos') {
  const normalizedCategory = validCategories.includes(selectedCategory)
    ? selectedCategory
    : 'todos';

  renderServiceGrid('#servicesGrid', normalizedCategory);
  renderServiceGrid('#allServices', normalizedCategory);
  syncFilterButtons(normalizedCategory);

  const url = new URL(window.location.href);
  if (normalizedCategory === 'todos') {
    url.searchParams.delete('tipo');
  } else {
    url.searchParams.set('tipo', normalizedCategory);
  }
  history.replaceState({}, '', url);
}

const searchParams = new URLSearchParams(location.search);
const requestedCategory = (searchParams.get('tipo') || 'todos').toLowerCase();
const initialCategory = validCategories.includes(requestedCategory) ? requestedCategory : 'todos';
applyCategoryFilter(initialCategory);

const filterButtons = document.querySelectorAll('.category-filter');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = (button.dataset.filter || 'todos').toLowerCase();
    applyCategoryFilter(selected);
  });
});

// Servicios: abre el detalle también en la página de listado completo
const allServices = document.querySelector('#allServices');

if (allServices) {
  [...allServices.querySelectorAll('.service-card')].forEach((card) => {
    card.addEventListener('click', () =>
      openService(card.dataset.service, card.querySelector('img')?.src, card)
    );
  });
}

const serviceInfo = {
  'Consulta veterinaria': {
    category: 'Perros, gatos y aves',
    description: 'Evaluación general de la salud de tu mascota, revisión de signos clínicos y orientación sobre cuidados y prevención.',
    benefits: 'Diagnóstico inicial, seguimiento de salud y recomendaciones específicas para cada especie.',
    price: 'Bs. 80',
    duration: '20–30 minutos',
    idealFor: 'Mascotas con chequeos preventivos o molestias leves.',
    includes: 'Historia clínica, revisión general y recomendaciones de seguimiento.',
  },
  'Vacunación': {
    category: 'Perros, gatos y aves',
    description: 'Programación de vacunas según la especie, edad, historial y esquema recomendado por el veterinario.',
    benefits: 'Prevención de enfermedades graves y protección del sistema inmunitario.',
    price: 'Bs. 60',
    duration: '15–25 minutos',
    idealFor: 'Mascotas en crecimiento o con esquema incompleto.',
    includes: 'Valoración previa, aplicación de vacuna y carnet de control.',
  },
  'Desparasitación': {
    category: 'Perros, gatos y aves',
    description: 'Control de parásitos internos y externos con protocolo adaptado a la especie y el peso.',
    benefits: 'Reducir riesgos de infecciones, irritación y mala nutrición.',
    price: 'Bs. 40',
    duration: '10–20 minutos',
    idealFor: 'Animales con riesgo de pulgas, garrapatas o parásitos intestinales.',
    includes: 'Revisión de riesgo, medicación y recomendaciones de prevención.',
  },
  'Peluquería para mascotas': {
    category: 'Perros y gatos',
    description: 'Baño, cepillado, limpieza de oídos y corte de uñas para mantener la higiene y comodidad de tu mascota.',
    benefits: 'Mejora la higiene, reduce enredos y ayuda a identificar cambios en la piel.',
    price: 'Bs. 70',
    duration: '40–60 minutos',
    idealFor: 'Mascotas con pelaje largo, excesiva suciedad o necesidad de mantenimiento.',
    includes: 'Baño, cepillado, revisión superficial y corte de uñas.',
  },
  'Esterilización': {
    category: 'Perros y gatos',
    description: 'Procedimiento quirúrgico para prevenir camadas no planificadas y reducir ciertos riesgos de salud.',
    benefits: 'Mejora el control reproductivo y ayuda a prevenir enfermedades relacionadas.',
    price: 'Bs. 350',
    duration: '1–2 horas',
    idealFor: 'Mascotas mayores de 6 meses y sin contraindicación médica.',
    includes: 'Evaluación preoperatoria, cirugía, control postoperatorio y recomendaciones.',
  },
  'Rayos X': {
    category: 'Perros, gatos y aves',
    description: 'Estudios radiográficos para evaluar fracturas, anomalías internas, pulmones, articulaciones y abdomen.',
    benefits: 'Diagnóstico más preciso para lesiones y enfermedades ocultas.',
    price: 'Bs. 180',
    duration: '20–40 minutos',
    idealFor: 'Mascotas con dolor, traumatismos o signos clínicos sospechosos.',
    includes: 'Toma de radiografías y valoración por parte del veterinario.',
  },
  'Análisis de laboratorio': {
    category: 'Perros, gatos y aves',
    description: 'Pruebas de sangre, heces y otras muestras para detectar infecciones, anemia, enfermedad renal o metabólica.',
    benefits: 'Aporta datos objetivos para un diagnóstico confiable y tratamiento personalizado.',
    price: 'Bs. 150',
    duration: '30–45 minutos',
    idealFor: 'Mascotas con debilidad, pérdida de peso, diarrea, infecciones o controles periódicos.',
    includes: 'Toma de muestra, análisis y revisión de resultados.',
  },
  'Cirugía menor': {
    category: 'Perros, gatos y aves',
    description: 'Intervenciones quirúrgicas sencillas como limpieza de heridas, extracción de quistes o procedimientos ambulatorios.',
    benefits: 'Permite tratamiento rápido, seguro y con recuperación controlada.',
    price: 'Bs. 220',
    duration: '45–90 minutos',
    idealFor: 'Mascotas con lesiones, abscesos o procedimientos de poca complejidad.',
    includes: 'Valoración prequirúrgica, intervención y control postoperatorio.',
  },
  'Control de dermatología': {
    category: 'Perros y gatos',
    description: 'Atención para alergias cutáneas, sarna, irritaciones o problemas recurrentes en la piel y el pelaje.',
    benefits: 'Mejora la calidad de vida y reduce la incomodidad constante.',
    price: 'Bs. 95',
    duration: '20–35 minutos',
    idealFor: 'Mascotas con picazón, caspa, enrojecimiento o pérdida de pelo.',
    includes: 'Revisión cutánea, recomendaciones terapéuticas y seguimiento.',
  },
  'Hospitalización y cuidado intensivo': {
    category: 'Perros, gatos y aves',
    description: 'Supervisión continua para pacientes que requieren observación, líquidos, monitoreo o recuperación postoperatoria.',
    benefits: 'Asegura atención constante y control detallado durante la recuperación.',
    price: 'Bs. 280',
    duration: '1 día o más',
    idealFor: 'Mascotas con enfermedades moderadas, recuperación quirúrgica o vigilancia especial.',
    includes: 'Monitoreo clínico, medicación y cuidado profesional continuo.',
  },
};

// Ventana emergente de detalle de servicio
const serviceDetail = document.querySelector('#serviceDetail');
let lastFocusedElement = null;

function openService(name, imageUrl, trigger) {
  const panel = document.querySelector('#serviceDetail');
  const content = panel?.querySelector('.service-detail__content');
  if (!panel || !content) return;

  const info = serviceInfo[name] || serviceInfo['Consulta veterinaria'];
  lastFocusedElement = trigger || document.activeElement;

  const image = imageUrl
    ? `<div class="service-detail__image"><img src="${imageUrl}" alt="${name}"></div>`
    : '';

  content.innerHTML = `
    ${image}
    <h2 id="serviceDetailTitle">${name}</h2>
    <p><strong>Atención:</strong> ${info.category}</p>
    <p><strong>Descripción:</strong> ${info.description}</p>
    <p><strong>Beneficios:</strong> ${info.benefits}</p>
    <p><strong>Precio:</strong> ${info.price}</p>
    <p><strong>Duración:</strong> ${info.duration}</p>
    <p><strong>Ideal para:</strong> ${info.idealFor}</p>
    <p><strong>Incluye:</strong> ${info.includes}</p>
    <button type="button" id="backServices">Volver a servicios</button>
  `;

  content.querySelector('#backServices').addEventListener('click', closeService);

  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');
  lockPageScroll();

  const closeButton = panel.querySelector('.service-detail__close');
  (closeButton || panel.querySelector('.service-detail__panel') || panel).focus({ preventScroll: true });
}

function closeService() {
  const panel = document.querySelector('#serviceDetail');
  if (!panel || panel.classList.contains('hidden')) return;

  panel.classList.add('hidden');
  panel.setAttribute('aria-hidden', 'true');
  unlockPageScroll();

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus({ preventScroll: true });
  }
  lastFocusedElement = null;
}

function lockPageScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
  document.body.classList.add('modal-open');
}

function unlockPageScroll() {
  document.body.classList.remove('modal-open');
  document.body.style.paddingRight = '';
}

if (serviceDetail) {
  serviceDetail.querySelector('.service-detail__close')?.addEventListener('click', closeService);

  serviceDetail.addEventListener('click', (event) => {
    if (event.target === serviceDetail) closeService();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !serviceDetail.classList.contains('hidden')) {
      closeService();
    }
  });
}

// Mapa: ubicaciones ficticias de demostración alrededor de Cochabamba.
function setupMap(id) {
  const el = document.getElementById(id);
  if (!el || !window.L) return;

  const map = L.map(id).setView([-17.3935, -66.1570], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const demos = [
    [-17.3935, -66.1570, 'Clínica demostrativa A'],
    [-17.375, -66.165, 'Clínica demostrativa B'],
    [-17.410, -66.145, 'Clínica demostrativa C'],
  ];

  demos.forEach(([lat, lng, name]) =>
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${name}</strong><br>Ubicación ficticia para demostración`)
  );

  setTimeout(() => map.invalidateSize(), 250);
}

setupMap('clinicMap');
setupMap('miniMap');

// Chat con backend seguro y respuesta en streaming
const chatForm = document.querySelector('#chatForm');

if (chatForm) {
  const input = document.querySelector('#chatInput');
  const messages = document.querySelector('#chatMessages');
  let history = [];

  function bubble(role, text) {
    const b = document.createElement('div');
    b.className = `chat-bubble ${role}`;
    b.textContent = text;
    messages.appendChild(b);
    messages.scrollTop = messages.scrollHeight;
    return b;
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const prompt = input.value.trim();
    if (!prompt) return;

    messages.querySelector('.chat-placeholder')?.remove();
    bubble('user', prompt);
    history.push({ role: 'user', content: prompt });
    input.value = '';
    input.disabled = true;

    const reply = bubble('assistant', 'Pensando…');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: 'No se pudo conectar con el asistente.' }));
        throw new Error(err.error || 'Error de conexión');
      }

      if (!response.body) throw new Error('El servidor no devolvió una respuesta de streaming.');

      reply.textContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        reply.textContent = full;
        messages.scrollTop = messages.scrollHeight;
      }

      history.push({ role: 'assistant', content: full || 'No se recibió una respuesta.' });
      if (!full) reply.textContent = 'No se recibió una respuesta.';
    } catch (err) {
      reply.textContent = `Error: ${err.message}. Verifica que el servidor esté ejecutándose y que OpenRouter esté configurado.`;
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

// Perfil demostrativo
const save = document.querySelector('#saveProfile');

if (save)
  save.addEventListener('click', () => {
    const msg = document.querySelector('#profileMessage');
    if (msg) msg.textContent = 'Perfil de demostración actualizado (los datos no se guardan en una cuenta).';
  });
