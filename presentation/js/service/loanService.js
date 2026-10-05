/* CRUD de préstamos + reglas de negocio. */
(() => {
  const { storage, ok, fail } = BookFlow;
  const KEY = 'loans';
  const MAX_ACTIVE = 3;     // máximo de préstamos activos por usuario
  const LOAN_DAYS = 14;     // duración del préstamo
  const RENEW_DAYS = 7;     // días que suma cada renovación
  const MAX_RENEWALS = 2;   // renovaciones permitidas por préstamo

  const all = () => storage.get(KEY, []);
  const save = (list) => storage.set(KEY, list);
  const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); };
  const daysLeft = (loan) => Math.ceil((new Date(loan.dueDate) - new Date()) / 86400000);

  const svc = {
    MAX_ACTIVE, MAX_RENEWALS, daysLeft,
    active: (email) => all().filter((l) => l.userEmail === email && l.status === 'active'),
    history: (email) => all().filter((l) => l.userEmail === email && l.status === 'returned')
      .sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt)),
    isOverdue: (loan) => daysLeft(loan) < 0,

    availableCopies(book) {
      return book.copies - all().filter((l) => l.bookId === book.id && l.status === 'active').length;
    },

    // CREATE
    request(email, bookId) {
      const book = BookFlow.books.get(bookId);
      if (!book) return fail('El libro no existe.');
      const mine = svc.active(email);
      if (mine.length >= MAX_ACTIVE) return fail(`Llegaste al máximo de ${MAX_ACTIVE} préstamos activos. Devuelve un libro para pedir otro.`);
      if (mine.some((l) => l.bookId === book.id)) return fail('Ya tienes este libro en préstamo.');
      if (mine.some(svc.isOverdue)) return fail('Tienes préstamos vencidos. Devuélvelos antes de pedir otro libro.');
      if (svc.availableCopies(book) <= 0) return fail('No quedan copias disponibles por ahora.');

      const now = new Date().toISOString();
      const loan = {
        id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userEmail: email, bookId: book.id, loanDate: now, dueDate: addDays(now, LOAN_DAYS),
        renewals: 0, status: 'active', returnedAt: null,
      };
      save([...all(), loan]);
      return ok(loan);
    },

    // UPDATE: renovar
    renew(id) {
      const list = all();
      const loan = list.find((l) => l.id === id);
      if (!loan || loan.status !== 'active') return fail('El préstamo no está activo.');
      if (svc.isOverdue(loan)) return fail('Este préstamo está vencido. Devuélvelo en lugar de renovarlo.');
      if (loan.renewals >= MAX_RENEWALS) return fail(`Ya usaste las ${MAX_RENEWALS} renovaciones permitidas.`);
      loan.renewals += 1;
      loan.dueDate = addDays(loan.dueDate, RENEW_DAYS);
      save(list);
      return ok(loan);
    },

    // UPDATE: devolver (pasa al historial)
    returnBook(id) {
      const list = all();
      const loan = list.find((l) => l.id === id);
      if (!loan || loan.status !== 'active') return fail('El préstamo no está activo.');
      loan.status = 'returned';
      loan.returnedAt = new Date().toISOString();
      save(list);
      return ok(loan);
    },

    // DELETE: quitar del historial (solo devueltos)
    remove(id) {
      const list = all();
      const loan = list.find((l) => l.id === id);
      if (!loan) return fail('No se encontró el registro.');
      if (loan.status !== 'returned') return fail('Solo puedes quitar préstamos ya devueltos.');
      save(list.filter((l) => l.id !== id));
      return ok();
    },

    removeAllForUser: (email) => save(all().filter((l) => l.userEmail !== email)),
  };
  BookFlow.loans = svc;
})();
