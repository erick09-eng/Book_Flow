/* BookFlow - Interfaz. Usa los servicios de /services (users, loans, favorites, books). */
/* Si los servicios no cargaron (rutas mal o app.js viejo), avisa en pantalla en vez de dejar la página en blanco */
if (!window.BookFlow || !BookFlow.users || !BookFlow.loans || !BookFlow.favorites || !BookFlow.books) {
  document.body.insertAdjacentHTML('afterbegin', '<p style="padding:1rem;background:#7f1d1d;color:#fecaca;font-family:sans-serif">BookFlow: no se cargaron los servicios. Abre la consola (F12) y revisa que existan las rutas ../js/service/ (storage.js, bookService.js, loanService.js, favoriteService.js, userService.js) y que app.js sea el nuevo.</p>');
  throw new Error('BookFlow: servicios no cargados');
}

(() => {
  const { users, loans, favorites, books } = BookFlow;
  const page = location.pathname.split('/').pop() || 'index.html';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (iso) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const fd = (f) => Object.fromEntries(new FormData(f));
  const user = users.current();
  let rerender = () => {};   // cada página define cómo se vuelve a pintar
  let openBook = null;       // libro cuyo modal está abierto

  // Rutas protegidas: sin sesión se vuelve al inicio con el login abierto
  if (['cuenta.html', 'biblioteca.html'].includes(page) && !user) { location.replace('index.html?login=1'); return; }

  // ================= Componentes =================
  function toast(text, ok = true) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.className = 'toast ' + (ok ? 'toast--ok' : 'toast--err') + ' is-on';
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 3200);
  }
  const msg = (form, text, ok = false) => { const p = $('.msg', form); p.textContent = text; p.className = 'msg ' + (ok ? 'msg--ok' : 'msg--err'); };

  function closeModal() { $('.modal')?.remove(); openBook = null; }
  function openModal(html, wide = false) {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal__box ${wide ? 'modal__box--wide' : ''}" role="dialog" aria-modal="true"><button class="modal__close" data-close aria-label="Cerrar">×</button>${html}</div>`;
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); });
    document.body.appendChild(m);
    return m;
  }
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());

  // Header y footer compartidos: se editan aquí y cambian en todas las páginas
  const userIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="header"><div class="header__container">
      <a href="index.html" class="header__logo">BookFlow</a>
      <nav class="header__nav">
        <a href="index.html" data-p="index.html">Inicio</a>
        <a href="catalogo.html" data-p="catalogo.html">Catálogo</a>
        <a href="cuenta.html" data-profile data-p="cuenta.html,biblioteca.html">Mi perfil</a>
      </nav>
      <a href="cuenta.html" class="header__user ${user ? 'is-on' : ''}" data-profile aria-label="${user ? 'Mi perfil' : 'Iniciar sesión'}">${userIcon}</a>
    </div></header>`);
  document.body.insertAdjacentHTML('beforeend', `<footer class="footer"><strong>BookFlow</strong><span class="muted">© 2025 BookFlow Editorial. Todos los derechos reservados.</span></footer>`);
  $$('.header__nav a').forEach((a) => a.dataset.p.split(',').includes(page) && a.setAttribute('aria-current', 'page'));

  // Icono / "Mi perfil": con sesión navega al perfil; sin sesión abre el login
  $$('[data-profile]').forEach((a) => a.addEventListener('click', (e) => { if (!user) { e.preventDefault(); authModal(); } }));
  const CFG = window.BOOKFLOW_CONFIG || {};
  const searchIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  // ----- Inicio de sesión con Google (Google Identity Services) -----
  const decodeJwt = (t) => {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  };
  let gReady = null;
  function loadGoogle() {
    if (gReady) return gReady;
    gReady = new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = () => { google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: onGoogle }); res(); };
      sc.onerror = () => { gReady = null; rej(new Error('No se pudo cargar Google')); };
      document.head.appendChild(sc);
    });
    return gReady;
  }
  function onGoogle({ credential }) {
    try {
      const p = decodeJwt(credential);
      if (p.email_verified === false) return toast('Tu correo de Google no está verificado.', false);
      const r = users.loginWithGoogle({ name: p.name, email: p.email });
      r.ok ? (location.href = 'cuenta.html') : toast(r.error, false);
    } catch { toast('No se pudo iniciar sesión con Google.', false); }
  }
  function googleButton(el) {
    if (!el) return;
    if (!CFG.GOOGLE_CLIENT_ID) {
      el.innerHTML = '<button type="button" class="btn btn--ghost btn--block">Continuar con Google</button>';
      $('button', el).addEventListener('click', () => toast('Falta configurar GOOGLE_CLIENT_ID en js/config.js', false));
      return;
    }
    loadGoogle()
      .then(() => google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320 }))
      .catch(() => { el.innerHTML = '<p class="muted">No se pudo cargar Google. Revisa tu conexión.</p>'; });
  }

  // ----- Recuperar contraseña: código de 6 dígitos enviado por correo (EmailJS) -----
  async function sendResetEmail(to, name, code) {
    const c = (window.BOOKFLOW_CONFIG || {}).EMAILJS || {};
    if (!c.serviceId || !c.templateId || !c.publicKey) return { ok: false, error: 'El envío de correos no está configurado (js/config.js).' };
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: c.serviceId, template_id: c.templateId, user_id: c.publicKey, template_params: { to_email: to, to_name: name, code, minutes: 15 } }),
      });
      return res.ok ? { ok: true } : { ok: false, error: 'No se pudo enviar el correo. Intenta de nuevo.' };
    } catch { return { ok: false, error: 'Sin conexión: no se pudo enviar el correo.' }; }
  }
  async function sendCode(email) {
    const r = await users.requestReset(email);
    return r.data ? sendResetEmail(email, r.data.name, r.data.code) : { ok: true };
  }

  function forgotModal(prefill = '') {
    const m = openModal(`
      <h2>Recuperar contraseña</h2>
      <p class="muted">Escribe tu correo y te enviaremos un código de 6 dígitos.</p>
      <form class="form" novalidate>
        <label class="field">Correo electrónico<input type="email" name="email" value="${esc(prefill)}" autocomplete="email" required /></label>
        <p class="msg" role="alert"></p>
        <button class="btn btn--primary" type="submit">Enviar código</button>
      </form>`);
    $('form', m).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target, email = f.elements.email.value.trim(), btn = $('button', f);
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg(f, 'Escribe un correo válido.');
      btn.disabled = true; msg(f, 'Enviando código...', true);
      const r = await sendCode(email);
      if (!r.ok) { btn.disabled = false; return msg(f, r.error); }
      resetModal(email);
    });
  }

  function resetModal(email) {
    const m = openModal(`
      <h2>Ingresa el código</h2>
      <p class="muted">Si <strong>${esc(email)}</strong> tiene una cuenta, recibirás un código de 6 dígitos que vence en 15 minutos. Revisa también el spam.</p>
      <form class="form" novalidate>
        <label class="field">Código<input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required /></label>
        <label class="field">Nueva contraseña<input type="password" name="new" autocomplete="new-password" required /></label>
        <label class="field">Confirmar nueva contraseña<input type="password" name="confirm" autocomplete="new-password" required /></label>
        <p class="msg" role="alert"></p>
        <button class="btn btn--primary" type="submit">Cambiar contraseña</button>
      </form>
      <button type="button" class="link" data-resend>Reenviar código</button>`);
    $('form', m).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = fd(e.target), r = await users.resetPassword(email, d.code, d.new, d.confirm);
      if (!r.ok) return msg(e.target, r.error);
      toast('Contraseña actualizada.');
      user ? closeModal() : authModal();
    });
    $('[data-resend]', m).addEventListener('click', async () => {
      const r = await sendCode(email);
      toast(r.ok ? 'Te enviamos un código nuevo.' : r.error, r.ok);
    });
  }

  function authModal() {
    const m = openModal(`
      <h2>Iniciar sesión</h2>
      <p class="muted">Accede para pedir libros y guardar tus favoritos.</p>
      <div class="google-slot" id="google-login"></div>
      <p class="divider"><span>o con tu correo</span></p>
      <form class="form" id="login-form" novalidate>
        <label class="field">Correo electrónico<input type="email" name="email" autocomplete="email" required /></label>
        <label class="field">Contraseña<input type="password" name="password" autocomplete="current-password" required /></label>
        <p class="msg" role="alert"></p>
        <button class="btn btn--primary" type="submit">Ingresar</button>
      </form>
      <button type="button" class="link" data-forgot>¿Olvidaste tu contraseña?</button>
      <p class="muted">¿No tienes cuenta? <button class="link" data-register>Registrarse</button></p>`);
    googleButton($('#google-login', m));
    $('#login-form', m).addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = fd(e.target), r = await users.login(d.email, d.password);
      r.ok ? (location.href = 'cuenta.html') : msg(e.target, r.error);
    });
    $('[data-forgot]', m).addEventListener('click', () => forgotModal($('input[name=email]', m).value.trim()));
    $('[data-register]', m).addEventListener('click', () => {
      closeModal();
      page === 'index.html' ? $('#registro').scrollIntoView() : (location.href = 'index.html#registro');
    });
  }

  // Tarjeta de libro (nombre + imagen + "Ver libro" + favorito)
  function cardHTML(b, note = '') {
    const av = loans.availableCopies(b) > 0, liked = user && favorites.isLiked(user.email, b.id);
    return `<article class="card">
      <div class="card__cover" style="background-image:${b.cover}"><span class="badge ${av ? 'badge--ok' : 'badge--warn'}">${av ? 'Disponible' : 'En préstamo'}</span></div>
      <h3 class="card__title">${esc(b.title)}</h3>
      <p class="muted">${esc(b.author)} · ★ ${b.rating}</p>${note ? `<p class="muted">${note}</p>` : ''}
      <div class="card__actions">
        <button class="btn btn--primary" data-view="${b.id}">Ver libro</button>
        <button class="btn btn--icon ${liked ? 'is-on' : ''}" data-like="${b.id}" aria-pressed="${!!liked}" aria-label="Favorito">${liked ? '♥' : '♡'}</button>
      </div></article>`;
  }

  // Ventana emergente con todos los detalles del libro
  function bookModal(id) {
    const b = books.get(id); if (!b) return;
    const left = loans.availableCopies(b), liked = user && favorites.isLiked(user.email, b.id);
    const loan = user && loans.active(user.email).find((l) => l.bookId === b.id);
    const spec = (k, v) => `<div class="spec"><dt>${k}</dt><dd>${v ?? '—'}</dd></div>`;
    openModal(`<div class="detail">
      <div class="detail__cover" style="background-image:${b.cover}"></div>
      <div class="detail__info">
        <div class="tags">${b.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h2>${esc(b.title)}</h2><p class="muted">Por ${esc(b.author)}</p>
        <p>★ ${b.rating} <span class="muted">(${b.reviews} reseñas)</span> · <span class="${left > 0 ? 'ok' : 'warn'}">${left > 0 ? `Disponible · ${left} de ${b.copies} copias` : 'En préstamo'}</span></p>
        <h3>Sinopsis</h3><p class="muted">${esc(b.synopsis)}</p>
        <dl class="specs">${spec('Género', b.genre)}${spec('Tema', b.topic)}${spec('Páginas', b.pages)}${spec('Año de publicación', b.year)}${spec('Editorial', b.publisher)}${spec('ISBN', b.isbn)}
          ${loan ? spec('Fecha de préstamo', fmt(loan.loanDate)) + spec('Fecha de devolución', fmt(loan.dueDate)) : ''}</dl>
        <div class="card__actions">
          ${loan ? `<button class="btn btn--primary" data-renew="${loan.id}">Renovar</button><button class="btn btn--ghost" data-return="${loan.id}">Devolver</button>`
                 : `<button class="btn btn--primary" data-loan="${b.id}" ${left > 0 ? '' : 'disabled'}>${left > 0 ? 'Pedir préstamo' : 'No disponible'}</button>`}
          <button class="btn btn--ghost" data-like="${b.id}">${liked ? '♥ En favoritos' : '♡ Añadir a favoritos'}</button>
        </div>
      </div></div>`, true);
    openBook = b.id;
  }

  // ================= Acciones globales =================
  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (v) return bookModal(v.dataset.view);
    const btn = e.target.closest('[data-like],[data-loan],[data-renew],[data-return]');
    if (!btn) return;
    if (!user) { toast('Inicia sesión para continuar.', false); return authModal(); }
    const d = btn.dataset; let r;
    if (d.like) { r = favorites.toggle(user.email, d.like); r.ok && toast(r.data.liked ? 'Añadido a favoritos.' : 'Quitado de favoritos.'); }
    else if (d.loan) { r = loans.request(user.email, d.loan); r.ok && toast('Préstamo creado. Devuélvelo antes del ' + fmt(r.data.dueDate)); }
    else if (d.renew) { r = loans.renew(d.renew); r.ok && toast('Renovado hasta el ' + fmt(r.data.dueDate)); }
    else { r = loans.returnBook(d.return); r.ok && toast('Libro devuelto.'); }
    if (!r.ok) toast(r.error, false);
    const reopen = openBook; rerender(); if (reopen) bookModal(reopen);
  });

  // ================= Páginas =================
  function initIndex() {
    rerender = () => { $('#featured').innerHTML = [...books.all()].sort((a, b) => b.rating - a.rating).slice(0, 4).map((b) => cardHTML(b)).join(''); };
    rerender();
    if (user) $('#register-section').hidden = true; else googleButton($('#google-register'));
    $('#back-top').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0 }); });
    $('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await users.register(fd(e.target));
      r.ok ? (location.href = 'cuenta.html') : msg(e.target, r.error);
    });
    if (!user && new URLSearchParams(location.search).get('login')) authModal();
  }

  // Catálogo y biblioteca comparten buscador, filtros, orden y paginación
  function initBrowse(isLib) {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') === 'favs' ? 'favs' : 'loans';
    const genres = [...new Set(books.all().map((b) => b.genre))];
    const SIZE = 8; let current = 1;
    if (isLib) $('#title').textContent = tab === 'favs' ? 'Favoritos' : 'Mi biblioteca';

    $('#browse').innerHTML = `<div class="browse">
      <aside class="filters">
        <h2>Filtros</h2>
        <div><h3>Género</h3>${genres.map((g) => `<label class="check"><input type="checkbox" data-genre="${g}" /> ${g}</label>`).join('')}</div>
        <div><h3>Disponibilidad</h3>
          <label class="check"><input type="checkbox" id="f-disp" /> Disponible</label>
          <label class="check"><input type="checkbox" id="f-prest" /> En préstamo</label></div>
        <div><h3>Calificación mínima: <span id="rating-out">1.0</span></h3><input type="range" id="f-rating" min="1" max="5" step="0.5" value="1" /></div>
        <button class="btn btn--ghost" type="button" id="f-clear">Limpiar filtros</button>
      </aside>
      <section>
        <div class="toolbar">
          <div class="search">${searchIcon}<input type="search" id="q" placeholder="Buscar por título, autor o tema..." /></div>
          <select id="sort" aria-label="Ordenar"><option value="new">Más recientes</option><option value="rating">Mejor calificados</option><option value="title">Título A-Z</option></select>
        </div>
        <p class="muted" id="count"></p><div class="grid" id="grid"></div><nav class="pagination" id="pager" aria-label="Paginación"></nav>
      </section></div>`;
    if (params.get('q')) $('#q').value = params.get('q');

    // Libros de origen: todo el catálogo, los préstamos activos o los favoritos
    const source = () => !isLib ? books.all().map((b) => ({ b }))
      : tab === 'favs' ? favorites.list(user.email).map((b) => ({ b }))
      : loans.active(user.email).map((l) => ({ b: books.get(l.bookId), note: 'Vence el ' + fmt(l.dueDate) }));

    rerender = () => {
      const q = $('#q').value.trim().toLowerCase(), min = Number($('#f-rating').value), sort = $('#sort').value;
      const gs = $$('[data-genre]:checked').map((i) => i.dataset.genre);
      $('#rating-out').textContent = min.toFixed(1);
      const list = source().filter(({ b }) => {
        const av = loans.availableCopies(b) > 0;
        const text = [b.title, b.author, b.topic, b.genre, ...b.tags].join(' ').toLowerCase();
        const dispOn = $('#f-disp').checked, prestOn = $('#f-prest').checked;
        // Sin nada marcado (o con todo marcado) se muestran todos; si marcas una categoría, solo esa
        return (!gs.length || gs.includes(b.genre)) && b.rating >= min && text.includes(q) && (dispOn === prestOn || (av ? dispOn : prestOn));
      }).sort((x, y) => sort === 'rating' ? y.b.rating - x.b.rating : sort === 'title' ? x.b.title.localeCompare(y.b.title) : y.b.id - x.b.id);

      const pages = Math.max(1, Math.ceil(list.length / SIZE)); current = Math.min(current, pages);
      $('#count').textContent = `${list.length} ${list.length === 1 ? 'libro' : 'libros'}`;
      const emptyText = isLib && !source().length
        ? (tab === 'favs' ? 'Aún no tienes favoritos. Toca ♡ en cualquier libro.' : 'No tienes préstamos activos. Pide un libro desde el catálogo.')
        : 'Ningún libro coincide con la búsqueda o los filtros.';
      $('#grid').innerHTML = list.slice((current - 1) * SIZE, current * SIZE).map(({ b, note }) => cardHTML(b, note)).join('') || `<p class="muted empty">${emptyText}</p>`;
      $('#pager').innerHTML = pages < 2 ? '' :
        `<button class="btn btn--icon" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>` +
        Array.from({ length: pages }, (_, i) => `<button class="btn btn--icon ${i + 1 === current ? 'is-on' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('') +
        `<button class="btn btn--icon" data-page="${current + 1}" ${current === pages ? 'disabled' : ''} aria-label="Siguiente">›</button>`;
    };
    $('#browse').addEventListener('input', () => { current = 1; rerender(); });
    $('#browse').addEventListener('click', (e) => {
      const p = e.target.closest('[data-page]');
      if (p && !p.disabled) { current = Number(p.dataset.page); rerender(); }
      if (e.target.closest('#f-clear')) {
        $$('#browse input[type=checkbox]').forEach((c) => (c.checked = false));
        $('#f-rating').value = 1; $('#q').value = ''; $('#sort').value = 'new'; current = 1; rerender();
      }
    });
    rerender();
  }

  function initAccount() {
    rerender = () => {
      const u = users.current();
      $('#u-name').textContent = u.name; $('#u-email').textContent = u.email;
      $('#u-since').textContent = new Date(u.since).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
      $('#s-active').textContent = `${loans.active(u.email).length} / ${loans.MAX_ACTIVE}`;
      $('#s-history').textContent = loans.history(u.email).length;
      $('#s-likes').textContent = favorites.ids(u.email).length;
    };
    rerender();
    $('[data-logout]').addEventListener('click', () => { users.logout(); location.href = 'index.html'; });

    $('[data-edit]').addEventListener('click', () => {
      const m = openModal(`<h2>Modificar datos</h2><form class="form"><label class="field">Nombre completo<input name="name" value="${esc(user.name)}" required /></label>
        <p class="msg" role="alert"></p><button class="btn btn--primary">Guardar cambios</button></form>`);
      $('form', m).addEventListener('submit', (e) => {
        e.preventDefault();
        const r = users.updateName(user.email, fd(e.target).name);
        r.ok ? (closeModal(), toast('Datos actualizados.'), rerender()) : msg(e.target, r.error);
      });
    });

    $('[data-pass]').addEventListener('click', () => {
      const m = openModal(`<h2>Cambiar contraseña</h2><form class="form">
        <label class="field">Contraseña actual<input type="password" name="old" autocomplete="current-password" required /></label>
        <label class="field">Nueva contraseña<input type="password" name="new" autocomplete="new-password" required /></label>
        <label class="field">Confirmar nueva contraseña<input type="password" name="confirm" autocomplete="new-password" required /></label>
        <p class="msg" role="alert"></p><button class="btn btn--primary">Actualizar contraseña</button></form>
        <button type="button" class="link" data-forgot>¿Olvidaste tu contraseña?</button>`);
      $('[data-forgot]', m).addEventListener('click', () => forgotModal(user.email));
      $('form', m).addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = fd(e.target), r = await users.changePassword(user.email, d.old, d.new, d.confirm);
        r.ok ? (closeModal(), toast('Contraseña actualizada.')) : msg(e.target, r.error);
      });
    });

    $('[data-delete]').addEventListener('click', () => {
      const m = openModal(`<h2>Eliminar cuenta</h2><p class="muted">Se borrarán tu cuenta, tus préstamos y tus favoritos. Esta acción no se puede deshacer.</p>
        <div class="card__actions"><button class="btn btn--danger" data-confirm>Sí, eliminar</button><button class="btn btn--ghost" data-close>Cancelar</button></div>`);
      $('[data-confirm]', m).addEventListener('click', () => { users.remove(user.email); location.href = 'index.html'; });
    });
  }

  // Navegación interna de la cuenta (perfil / biblioteca / favoritos)
  const accNav = $('#acc-nav');
  if (accNav) {
    const fav = new URLSearchParams(location.search).get('tab') === 'favs';
    const on = page === 'cuenta.html' ? 0 : fav ? 2 : 1;
    accNav.innerHTML = [['cuenta.html', 'Mi perfil'], ['biblioteca.html', 'Mi biblioteca'], ['biblioteca.html?tab=favs', 'Favoritos']]
      .map(([h, t], i) => `<a class="tab ${i === on ? 'tab--on' : ''}" href="${h}">${t}</a>`).join('');
  }

  ({ 'index.html': initIndex, 'catalogo.html': () => initBrowse(false), 'biblioteca.html': () => initBrowse(true), 'cuenta.html': initAccount }[page] || (() => {}))();
})();
