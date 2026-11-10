import { api, session } from '../api.js';
import { clearError, showError } from '../ui.js';

export function renderLogin(root, onSuccess) {
  root.innerHTML = `
    <div class="login-wrap">
      <div class="card login-card">
        <h1>Biblioteca</h1>
        <p class="muted">Entre com seu usuário de atendente ou administrador.</p>
        <form id="f" novalidate>
          <label>E-mail <input name="email" type="email" autocomplete="username" placeholder="admin@biblioteca.com" /></label>
          <label>Senha <input name="password" type="password" autocomplete="current-password" /></label>
          <div id="err" class="error" hidden></div>
          <button class="btn primary" type="submit">Entrar</button>
        </form>
      </div>
    </div>`;

  const form = root.querySelector('#f');
  const err = root.querySelector('#err');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(err);
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    // validação no front
    if (!email || !password) return showError(err, new Error('Preencha e-mail e senha.'));
    if (!/^\S+@\S+\.\S+$/.test(email)) return showError(err, new Error('Informe um e-mail válido.'));

    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      session.saveLogin(data);
      onSuccess();
    } catch (ex) {
      showError(err, ex);
    } finally {
      btn.disabled = false;
    }
  });
}
