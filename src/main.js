import './style.css';
import { api, session, setOnExpire, accessTokenSecondsLeft } from './api.js';
import { esc, toast } from './ui.js';
import { renderLogin } from './pages/login.js';

const app = document.getElementById('app');
let timer = null;

const routes = {
  '/dashboard': { label: 'Dashboard', load: () => import('./pages/dashboard.js') },
  '/livros': { label: 'Livros', load: () => import('./pages/books.js') },
  '/categorias': { label: 'Categorias', load: () => import('./pages/categories.js') },
  '/autores': { label: 'Autores', load: () => import('./pages/authors.js') },
  '/leitores': { label: 'Leitores', load: () => import('./pages/readers.js') },
  '/emprestimos': { label: 'Empréstimos', load: () => import('./pages/loans.js') },
  '/atendentes': { label: 'Atendentes', admin: true, load: () => import('./pages/users.js') },
};

setOnExpire(() => {
  toast('Sessão expirada. Faça login novamente.', 'error');
  location.hash = '#/login';
  navigate();
});

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST', body: { refreshToken: session.refresh }, auth: false });
  } catch {

  }
  session.clear();
  location.hash = '#/login';
  navigate();
}

function shell(path) {
  const user = session.user;
  const links = Object.entries(routes)
    .filter(([, r]) => !r.admin || user?.isAdmin)
    .filter(([p]) => p !== '/dashboard' || true)
    .map(([p, r]) => `<a href="#${p}" class="${p === path ? 'active' : ''}">${r.label}</a>`)
    .join('');
  app.innerHTML = `
    <header class="top">
      <span class="brand">Biblioteca</span>
      <nav>${links}</nav>
      <div class="who">
        <span class="tk" id="tk" title="Tempo restante do access token"></span>
        <span>${esc(user?.name)} ${user?.isAdmin ? '(admin)' : '(atendente)'}</span>
        <button class="btn sm" id="logout">Sair</button>
      </div>
    </header>
    <main id="view"></main>`;
  app.querySelector('#logout').addEventListener('click', logout);

  clearInterval(timer);
  const tick = () => {
    const s = accessTokenSecondsLeft();
    const tk = document.getElementById('tk');
    if (tk) tk.textContent = s == null ? '' : `access token: ${s}s`;
  };
  tick();
  timer = setInterval(tick, 1000);
}

async function navigate() {
  const path = location.hash.slice(1) || '/dashboard';

  if (!session.active) {
    clearInterval(timer);
    if (path !== '/login') {
      location.hash = '#/login';
      return;
    }
    renderLogin(app, () => {
      location.hash = '#/dashboard';
      navigate();
    });
    return;
  }

  if (path === '/login' || !routes[path]) {
    location.hash = '#/dashboard';
    return;
  }

  const route = routes[path];
  if (route.admin && !session.user?.isAdmin) {
    toast('Acesso restrito a administradores.', 'error');
    location.hash = '#/dashboard';
    return;
  }

  shell(path);
  const view = document.getElementById('view');
  try {
    const page = await route.load();
    await page.render(view);
  } catch (ex) {
    if (ex.status === 401) return;
    view.innerHTML = `<div class="card error">${esc(ex.message)}</div>`;
  }
}

window.addEventListener('hashchange', navigate);
navigate();
