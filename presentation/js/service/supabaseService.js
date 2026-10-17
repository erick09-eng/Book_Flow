/* Servicio de Supabase.
   Expone el cliente ya inicializado (en js/config.js) y funciones listas para
   usar. Los servicios actuales (users, loans, favorites) siguen usando
   localStorage como fuente principal; este archivo solo replica lo importante
   a Supabase para que los datos queden guardados en la nube. */
(() => {
  const supabaseClient = window.supabaseClient;

  // Helper: obtener el UUID de un usuario en profiles por su email
  const getUserIdByEmail = async (email) => {
    if (!supabaseClient || !email) return null;
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      if (error || !data) return null;
      return data.id;
    } catch {
      return null;
    }
  };

  BookFlow.supabase = {
    client: supabaseClient || null,

    // Indica si Supabase está disponible (script cargado + client creado)
    isReady: !!supabaseClient,

    // ---------- Perfiles ----------
    async getProfile(email) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },

    async upsertProfile(profile) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const { data, error } = await supabaseClient
        .from('profiles')
        .upsert(profile, { onConflict: 'email' });
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },

    // ---------- Préstamos ----------
    async insertLoan(loan) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const userId = await getUserIdByEmail(loan.userEmail);
      if (!userId) return { ok: false, error: 'Usuario no encontrado en Supabase' };
      const { data, error } = await supabaseClient
        .from('loans')
        .insert({
          user_id: userId,
          book_id: String(loan.bookId),
          loan_date: loan.loanDate,
          due_date: loan.dueDate,
          status: loan.status,
          returned_at: loan.returnedAt,
          renewals: loan.renewals,
        });
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },

    async updateLoan(id, updates) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const { data, error } = await supabaseClient
        .from('loans')
        .update(updates)
        .eq('id', id);
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },

    // ---------- Favoritos ----------
    async insertFavorite(userEmail, bookId) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const userId = await getUserIdByEmail(userEmail);
      if (!userId) return { ok: false, error: 'Usuario no encontrado en Supabase' };
      const { data, error } = await supabaseClient
        .from('favorites')
        .insert({ user_id: userId, book_id: String(bookId) });
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },

    async removeFavorite(userEmail, bookId) {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const userId = await getUserIdByEmail(userEmail);
      if (!userId) return { ok: false, error: 'Usuario no encontrado en Supabase' };
      const { error } = await supabaseClient
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', String(bookId));
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    // ---------- Libros (referencia opcional del catálogo de midudev) ----------
    async getBooks() {
      if (!supabaseClient) return { ok: false, error: 'Supabase no disponible' };
      const { data, error } = await supabaseClient.from('books').select('*');
      return error ? { ok: false, error: error.message } : { ok: true, data };
    },
  };

  if (supabaseClient) {
    console.log('[Supabase] Cliente inicializado y listo.');
  } else {
    console.warn('[Supabase] No se pudo inicializar. Revisa js/config.js.');
  }
})();
