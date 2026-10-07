/* "Me gusta" / Guardados. */
(() => {
  const { storage, ok } = BookFlow;
  const KEY = 'favorites';
  const all = () => storage.get(KEY, {});

  const svc = {
    ids: (email) => all()[email] || [],
    isLiked: (email, id) => svc.ids(email).includes(Number(id)),
    toggle(email, id) {
      const data = all();
      const set = new Set(data[email] || []);
      const liked = !set.has(Number(id));
      liked ? set.add(Number(id)) : set.delete(Number(id));
      data[email] = [...set];
      storage.set(KEY, data);
      return ok({ liked });
    },
    list: (email) => svc.ids(email).map((id) => BookFlow.books.get(id)).filter(Boolean),
    count: (id) => Object.values(all()).filter((ids) => ids.includes(Number(id))).length,
    removeAllForUser(email) { const d = all(); delete d[email]; storage.set(KEY, d); },
  };
  BookFlow.favorites = svc;
})();
