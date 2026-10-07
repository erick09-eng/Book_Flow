/* Catálogo de libros (datos de ejemplo).
   genre  -> coincide con los filtros del catálogo (Fiction, Non-Fiction, Science, History, Philosophy)
   topic  -> se muestra en la ruta de navegación del detalle
   tags   -> etiquetas del detalle */
(() => {
  const g = (a, b) => `linear-gradient(160deg, ${a} 0%, ${b} 100%)`;
  const BOOKS = [
    { id: 1, title: 'Spaces in Between', author: 'Elena Rostova', genre: 'Non-Fiction', topic: 'Arquitectura y Diseño', tags: ['Arquitectura', 'Modernismo'],
      rating: 4.8, reviews: 124, copies: 2, pages: 342, year: 2021, publisher: 'ArchPress Books', isbn: '978-3-16-148410-0', cover: g('#2d3142', '#1b1d29'),
      synopsis: 'Una exploración del espacio negativo en el diseño arquitectónico modernista: vacíos, patios y pozos de luz como parte esencial de la experiencia de un edificio.' },
    { id: 2, title: 'The Design of Everyday Things', author: 'Don Norman', genre: 'Non-Fiction', topic: 'Arquitectura y Diseño', tags: ['Diseño', 'Usabilidad'],
      rating: 4.7, reviews: 310, copies: 2, cover: g('#3b2f4a', '#1c1626'),
      synopsis: 'Un clásico sobre por qué algunos objetos cotidianos son fáciles de usar y otros frustran, y cómo diseñar pensando en las personas.' },
    { id: 3, title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'Science', topic: 'Psicología', tags: ['Psicología', 'Decisiones'],
      rating: 4.6, reviews: 512, copies: 1, cover: g('#4a3728', '#241a13'),
      synopsis: 'Kahneman describe los dos sistemas de pensamiento que guían nuestras decisiones y los sesgos que cometemos sin darnos cuenta.' },
    { id: 4, title: 'Clean Code', author: 'Robert C. Martin', genre: 'Science', topic: 'Tecnología', tags: ['Programación', 'Buenas prácticas'],
      rating: 4.5, reviews: 280, copies: 1, cover: g('#1f3b3b', '#0f1f1f'),
      synopsis: 'Principios y buenas prácticas para escribir código legible, mantenible y fácil de cambiar.' },
    { id: 5, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', genre: 'History', topic: 'Historia', tags: ['Historia', 'Antropología'],
      rating: 4.6, reviews: 640, copies: 3, cover: g('#4a4128', '#231f12'),
      synopsis: 'Un recorrido por la historia de nuestra especie, desde la revolución cognitiva hasta el mundo moderno.' },
    { id: 6, title: 'The Overstory', author: 'Richard Powers', genre: 'Fiction', topic: 'Novela', tags: ['Novela', 'Naturaleza'],
      rating: 4.4, reviews: 198, copies: 1, cover: g('#1f3b2c', '#101f17'),
      synopsis: 'Una novela coral que entrelaza las vidas de varias personas con los árboles y el mundo natural.' },
    { id: 7, title: 'The Architecture of the City', author: 'Aldo Rossi', genre: 'Non-Fiction', topic: 'Arquitectura y Diseño', tags: ['Arquitectura', 'Urbanismo'],
      rating: 4.3, reviews: 87, copies: 1, cover: g('#3a2d2d', '#1c1515'),
      synopsis: 'Reflexión teórica sobre la ciudad como obra colectiva construida a lo largo del tiempo.' },
    { id: 8, title: 'Meditations', author: 'Marco Aurelio', genre: 'Philosophy', topic: 'Filosofía', tags: ['Filosofía', 'Estoicismo'],
      rating: 4.8, reviews: 420, copies: 2, cover: g('#2b3a4a', '#131c26'),
      synopsis: 'Notas personales del emperador romano sobre disciplina, deber y serenidad, y una de las obras centrales del estoicismo.' },
    { id: 9, title: 'Dune', author: 'Frank Herbert', genre: 'Fiction', topic: 'Ciencia ficción', tags: ['Novela', 'Ciencia ficción'],
      rating: 4.7, reviews: 530, copies: 2, pages: 612, year: 1965, publisher: 'Chilton Books', isbn: '978-0-441-17271-9', cover: g('#5a3b1e', '#2a1a0c'),
      synopsis: 'En el desértico planeta Arrakis, el joven Paul Atreides se ve envuelto en una lucha por el control de la especia más valiosa del universo.' },
    { id: 10, title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', topic: 'Cosmología', tags: ['Física', 'Universo'],
      rating: 4.5, reviews: 360, copies: 1, pages: 256, year: 1988, publisher: 'Bantam Books', isbn: '978-0-553-38016-3', cover: g('#1d2b4f', '#0b1226'),
      synopsis: 'Del Big Bang a los agujeros negros: una introducción accesible a las grandes preguntas sobre el origen y el destino del universo.' },
    { id: 11, title: 'The Republic', author: 'Platón', genre: 'Philosophy', topic: 'Filosofía', tags: ['Filosofía', 'Política'],
      rating: 4.2, reviews: 150, copies: 0, cover: g('#4a2b3a', '#25141d'),
      synopsis: 'Diálogo clásico sobre la justicia, el Estado ideal y el papel de la educación. (Sin copias: sirve para probar el filtro "En préstamo".)' },
    { id: 12, title: 'Guns, Germs, and Steel', author: 'Jared Diamond', genre: 'History', topic: 'Historia', tags: ['Historia', 'Geografía'],
      rating: 4.4, reviews: 270, copies: 2, pages: 528, year: 1997, publisher: 'W. W. Norton', isbn: '978-0-393-31755-8', cover: g('#3d3a1f', '#1d1c0e'),
      synopsis: 'Por qué unas sociedades dominaron a otras: el papel de la geografía, las plantas, los animales y las enfermedades en la historia humana.' },
  ];

  BookFlow.books = {
    all: () => BOOKS,
    get: (id) => BOOKS.find((b) => b.id === Number(id)) || null,
  };
})();
