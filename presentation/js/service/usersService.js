/* Cuentas: registro, ingreso, perfil, contraseña y eliminación. */
(() => {
  const { storage, ok, fail } = BookFlow;
  const KEY = 'users', SESSION = 'session', RESETS = 'resets';
  const CODE_MINUTES = 15, MAX_TRIES = 5;
  const newCode = () => { const a = new Uint32Array(1); window.crypto && crypto.getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.random() * 4e9); return String((a[0] % 900000) + 100000); };
  const norm = (e) => String(e || '').trim().toLowerCase();
  const list = () => storage.get(KEY, []);
  const rnd = () => Math.random().toString(36).slice(2);
  const pub = (u) => (u ? { name: u.name, email: u.email, since: u.since } : null);

  // Contraseña con hash SHA-256 + sal (si el navegador lo permite)
  async function hash(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return 'x' + btoa(unescape(encodeURIComponent(text)));
  }

  function checkPassword(pass, confirm) {
    if (!pass || pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (pass !== confirm) return 'Las contraseñas no coinciden.';
    return null;
  }

  BookFlow.users = {
    current() {
      const email = storage.get(SESSION, null);
      return pub(list().find((u) => u.email === email));
    },

    async register({ name, email, password, confirm }) {
      name = String(name || '').trim(); email = norm(email);
      if (name.length < 2) return fail('Escribe tu nombre completo.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Escribe un correo válido.');
      const err = checkPassword(password, confirm);
      if (err) return fail(err);
      if (list().some((u) => u.email === email)) return fail('Ese correo ya está registrado. Ingresa desde la página de acceso.');

      const salt = rnd();
      const user = { name, email, salt, pass: await hash(salt + password), since: new Date().toISOString() };
      storage.set(KEY, [...list(), user]);
      storage.set(SESSION, email);
      return ok(pub(user));
    },

    async login(email, password) {
      email = norm(email);
      const user = list().find((u) => u.email === email);
      if (user && !user.pass) return fail('Esta cuenta usa Google. Ingresa con Google o usa "¿Olvidaste tu contraseña?" para crear una contraseña.');
      if (!user || user.pass !== (await hash(user.salt + password))) return fail('Correo o contraseña incorrectos.');
      storage.set(SESSION, email);
      return ok(pub(user));
    },

    // Google: crea la cuenta la primera vez y luego solo inicia sesión
    loginWithGoogle({ name, email }) {
      email = norm(email);
      if (!email) return fail('Google no devolvió un correo.');
      const users = list();
      let u = users.find((x) => x.email === email);
      if (!u) {
        u = { name: String(name || email.split('@')[0]).trim(), email, salt: '', pass: null, google: true, since: new Date().toISOString() };
        storage.set(KEY, [...users, u]);
      }
      storage.set(SESSION, email);
      return ok(pub(u));
    },

    // Recuperar contraseña, paso 1: genera un código de 6 dígitos (vence en 15 min).
    // Devuelve el código a quien llama para que lo envíe por correo; nunca se muestra en pantalla.
    async requestReset(email) {
      email = norm(email);
      const u = list().find((x) => x.email === email);
      if (!u) return ok(null); // no revelamos si el correo existe
      const code = newCode(), salt = rnd(), all = storage.get(RESETS, {});
      all[email] = { salt, hash: await hash(salt + code), expires: Date.now() + CODE_MINUTES * 60000, tries: 0 };
      storage.set(RESETS, all);
      return ok({ code, name: u.name });
    },

    // Paso 2: valida el código y guarda la nueva contraseña
    async resetPassword(email, code, newPass, confirm) {
      email = norm(email);
      const err = checkPassword(newPass, confirm);
      if (err) return fail(err);
      const all = storage.get(RESETS, {}), r = all[email];
      if (!r || r.expires < Date.now()) return fail('El código venció o no existe. Solicita uno nuevo.');
      if (r.tries >= MAX_TRIES) return fail('Demasiados intentos. Solicita un código nuevo.');
      if (r.hash !== (await hash(r.salt + String(code).trim()))) {
        r.tries += 1; storage.set(RESETS, all);
        return fail('Código incorrecto.');
      }
      const users = list(), u = users.find((x) => x.email === email);
      if (!u) return fail('Usuario no encontrado.');
      u.salt = rnd(); u.pass = await hash(u.salt + newPass);
      storage.set(KEY, users);
      delete all[email]; storage.set(RESETS, all);
      return ok();
    },

    logout: () => storage.remove(SESSION),

    updateName(email, name) {
      name = String(name || '').trim();
      if (name.length < 2) return fail('Escribe un nombre válido.');
      const users = list();
      const u = users.find((x) => x.email === email);
      if (!u) return fail('Usuario no encontrado.');
      u.name = name; storage.set(KEY, users);
      return ok(pub(u));
    },

    async changePassword(email, oldPass, newPass, confirm) {
      const users = list();
      const u = users.find((x) => x.email === email);
      if (u && !u.pass) return fail('Tu cuenta usa Google. Usa "¿Olvidaste tu contraseña?" para crear una contraseña.');
      if (!u || u.pass !== (await hash(u.salt + oldPass))) return fail('La contraseña actual es incorrecta.');
      const err = checkPassword(newPass, confirm);
      if (err) return fail(err);
      u.salt = rnd(); u.pass = await hash(u.salt + newPass);
      storage.set(KEY, users);
      return ok();
    },

    // DELETE: borra cuenta + préstamos + favoritos
    remove(email) {
      storage.set(KEY, list().filter((u) => u.email !== email));
      BookFlow.loans.removeAllForUser(email);
      BookFlow.favorites.removeAllForUser(email);
      storage.remove(SESSION);
      return ok();
    },
  };
})();
