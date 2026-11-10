import { api, session } from '../api.js';
import { esc, toast, clearError, showError } from '../ui.js';

export async function render(el) {
  let users = [];
  let editingId = null;
  const me = session.user;

  el.innerHTML = `
    <h2>Atendentes</h2>
    <form id="f" class="card" novalidate>
      <h3 id="ft">Novo atendente</h3>
      <div class="grid">
        <label>Nome *<input name="name" /></label>
        <label>Username *<input name="username" /></label>
        <label>E-mail *<input name="email" type="email" /></label>
        <label>Senha <span id="pwhint">*</span><input name="password" type="password" autocomplete="new-password" /></label>
        <label class="check"><input name="isAdmin" type="checkbox" /> Administrador</label>
      </div>
      <div id="err" class="error" hidden></div>
      <div class="actions">
        <button class="btn primary" type="submit">Salvar</button>
        <button class="btn" type="button" id="cancel" hidden>Cancelar edição</button>
      </div>
    </form>
    <div class="card"><table>
      <thead><tr><th>Nome</th><th>Username</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>`;

  const form = el.querySelector('#f');
  const err = el.querySelector('#err');
  const rows = el.querySelector('#rows');

  function draw() {
    rows.innerHTML = users
      .map(
        (u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${esc(u.email)}</td>
        <td>${u.isAdmin ? '<span class="badge adm">Administrador</span>' : 'Atendente'}</td>
        <td><span class="badge ${u.active ? 'ok' : 'off'}">${u.active ? 'Ativo' : 'Desativado'}</span></td>
        <td class="row-actions">
          <button class="btn sm" data-edit="${u.id}">Editar</button>
          ${u.id === me.id ? '' : `<button class="btn sm ${u.active ? 'danger' : ''}" data-toggle="${u.id}">${u.active ? 'Desativar' : 'Ativar'}</button>`}
        </td></tr>`
      )
      .join('');
  }

  async function load() {
    users = await api('/user');
    draw();
  }

  function resetForm() {
    editingId = null;
    form.reset();
    form.querySelector('#ft').textContent = 'Novo atendente';
    form.querySelector('#pwhint').textContent = '*';
    form.querySelector('#cancel').hidden = true;
    clearError(err);
  }

  form.querySelector('#cancel').addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(err);
    const f = form.elements;
    const body = { name: f.name.value, username: f.username.value, email: f.email.value, isAdmin: f.isAdmin.checked };
    if (f.password.value) body.password = f.password.value;
    if (!body.name.trim() || !body.username.trim() || !body.email.trim()) {
      return showError(err, new Error('Nome, username e e-mail são obrigatórios.'));
    }
    if (!editingId && (!body.password || body.password.length < 6)) {
      return showError(err, new Error('A senha deve ter pelo menos 6 caracteres.'));
    }
    try {
      if (editingId) await api(`/user/${editingId}`, { method: 'PUT', body });
      else await api('/user', { method: 'POST', body });
      toast('Atendente salvo com sucesso', 'success');
      resetForm();
      await load();
    } catch (ex) {
      showError(err, ex);
    }
  });

  rows.addEventListener('click', async (e) => {
    const edit = e.target.dataset.edit;
    const toggle = e.target.dataset.toggle;
    if (edit) {
      const u = users.find((x) => String(x.id) === edit);
      editingId = u.id;
      const f = form.elements;
      f.name.value = u.name;
      f.username.value = u.username;
      f.email.value = u.email;
      f.isAdmin.checked = u.isAdmin;
      f.password.value = '';
      form.querySelector('#ft').textContent = `Editando #${u.id} (senha em branco = não altera)`;
      form.querySelector('#pwhint').textContent = '(opcional)';
      form.querySelector('#cancel').hidden = false;
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (toggle) {
      const u = users.find((x) => String(x.id) === toggle);
      try {
        await api(`/user/${u.id}/active`, { method: 'PATCH', body: { active: !u.active } });
        toast(u.active ? 'Atendente desativado' : 'Atendente ativado', 'success');
        await load();
      } catch (ex) {
        toast(ex.message, 'error');
      }
    }
  });

  await load();
}
