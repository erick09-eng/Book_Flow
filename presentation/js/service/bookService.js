/* Catálogo de libros.
   Los datos vienen de la API de libros-programacion-gratis (midudev),
   embalados en ./libros-api.json (se genera a partir de
   https://github.com/midudev/libros-programacion-gratis).
   Si faltan campos, se usan valores por defecto para que el catálogo,
   los préstamos y los favoritos sigan funcionando. */
(() => {
  let cache = null;
  let ready = null;

  const resolveUrl = () => {
    const cfg = window.BOOKFLOW_CONFIG || {};
    return cfg.BOOKS_API?.baseUrl || '../js/service/libros-api.json';
  };

  const load = async () => {
    if (ready) return ready;
    ready = (async () => {
      try {
        const API_URL = resolveUrl();
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${API_URL}`);
        const data = await res.json();
        cache = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error al cargar los libros de la API:', error);
        cache = [];
      }
    })();
    return ready;
  };

  BookFlow.books = {
    // Espera a que los datos estén listos antes de seguir (usar en app.js)
    _load: load,

    all: () => cache || [],

    get: (id) => (cache || []).find((b) => b.id === Number(id)) || null,

    async searchExternal(query) {
      await load();
      if (!query) return [];
      const q = String(query).toLowerCase();
      return (cache || []).filter((b) =>
        [b.title, b.author, b.topic, b.genre, ...(b.tags || [])].join(' ').toLowerCase().includes(q)
      );
    },
  };
})();
