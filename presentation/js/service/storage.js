/* Persistencia: todo se guarda en localStorage, así sobrevive al cerrar el navegador. */
window.BookFlow = window.BookFlow || {};
(() => {
  const P = 'bookflow:';
  BookFlow.storage = {
    get(k, d) { try { const v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem(P + k); } catch {} },
  };
  BookFlow.ok = (data) => ({ ok: true, data });
  BookFlow.fail = (error) => ({ ok: false, error });
})();
