(() => {
  // ---------- Elementos da página ----------
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('main-nav');
  const progressBar = document.getElementById('scroll-progress-bar');

  const searchInput = document.getElementById('product-search');
  const searchClear = document.getElementById('search-clear');
  const tipButtons = document.querySelectorAll('.tip-button');
  const resetButton = document.getElementById('reset-filters');
  const productGrid = document.getElementById('product-grid');
  const productCards = productGrid ? Array.from(productGrid.querySelectorAll('.product-card')) : [];
  const filterButtons = Array.from(document.querySelectorAll('.filter-button'));
  const productCount = document.getElementById('product-count');
  const emptyMessage = document.getElementById('catalog-empty');

  // ---------- Tema claro e escuro ----------
  function getSavedTheme() {
    try {
      return localStorage.getItem('nvidia-site-theme');
    } catch (erro) {
      return null;
    }
  }

  const savedTheme = getSavedTheme();
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.dataset.theme = savedTheme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.dataset.theme = 'dark';
  }

  function updateThemeControl() {
    const isDark = root.dataset.theme === 'dark';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
      themeToggle.setAttribute('title', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    if (themeLabel) themeLabel.textContent = isDark ? 'Modo claro' : 'Modo escuro';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', isDark ? '#0e100e' : '#f7f8f5');
  }

  updateThemeControl();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('nvidia-site-theme', root.dataset.theme);
      } catch (erro) {
        // Se não der para salvar, o site continua funcionando normalmente.
      }
      updateThemeControl();
    });
  }

  // ---------- Menu no celular ----------
  function closeMenu() {
    if (mainNav) mainNav.classList.remove('is-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir menu');
    }
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });
    mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 800) closeMenu();
  });
  window.addEventListener('pageshow', closeMenu);

  // ---------- Barra de progresso da rolagem ----------
  function updateProgress() {
    if (!progressBar) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
    progressBar.style.width = Math.max(0, Math.min(progress, 100)) + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // ---------- Busca e filtros de produtos ----------
  let activeCategory = 'all';

  // Tira acentos e deixa tudo minúsculo (assim "robô" acha "robo" e "ROBÔ")
  function normalize(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Guarda o texto de cada card já normalizado, para a busca ser rápida
  const cardData = productCards.map(card => {
    const text = normalize(card.textContent);
    return { card: card, words: text.split(/[^a-z0-9]+/).filter(Boolean), text: text };
  });

  // Palavras curtas (como "ia") só valem se começarem uma palavra do card.
  // Palavras maiores podem aparecer em qualquer parte do texto.
  function matchesWord(item, word) {
    if (word.length < 3) return item.words.some(w => w.startsWith(word));
    return item.text.includes(word);
  }

  function filterProducts() {
    const query = normalize(searchInput ? searchInput.value.trim() : '');
    const queryWords = query.split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    cardData.forEach(item => {
      const categories = (item.card.dataset.category || '').split(/\s+/);
      const okCategory = activeCategory === 'all' || categories.includes(activeCategory);
      const okSearch = queryWords.every(word => matchesWord(item, word));
      const visible = okCategory && okSearch;
      item.card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (productCount) {
      if (visibleCount === 1) productCount.textContent = '1 produto encontrado';
      else productCount.textContent = visibleCount + ' produtos encontrados';
    }
    if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;

    const hasSearch = queryWords.length > 0;
    if (searchClear) searchClear.hidden = !hasSearch;
    if (resetButton) resetButton.hidden = !(hasSearch || activeCategory !== 'all');
  }

  function setCategory(category) {
    activeCategory = category;
    filterButtons.forEach(button => {
      const active = (button.dataset.filter || 'all') === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      setCategory(button.dataset.filter || 'all');
      filterProducts();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Escape' && searchInput.value !== '') {
        searchInput.value = '';
        filterProducts();
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      filterProducts();
      searchInput.focus();
    });
  }

  // Botões de sugestão: preenchem a busca com um clique
  tipButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = button.dataset.tip || '';
      setCategory('all');
      filterProducts();
    });
  });

  // Botão "Limpar busca e filtros"
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      setCategory('all');
      filterProducts();
    });
  }

  // Atalho: apertar "/" leva direto para a busca
  document.addEventListener('keydown', event => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  filterProducts();
})();
