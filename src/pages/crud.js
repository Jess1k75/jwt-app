import { api, session } from '../api.js';
import { esc, toast, clearError, showError } from '../ui.js';

// Fábrica de telas CRUD simples (usada em Categorias e Autores)
export function crudPage({ title, singular, endpoint, fields, columns }) {
  return async function render(el) {
    const admin = !!session.user?.isAdmin;
    let items = [];
    let editingId = null;

    const inputHtml = (f) =>
      f.type === 'textarea'
        ? `<textarea name="${f.name}"></textarea>`
        : `<input name="${f.name}" type="${f.type || 'text'}" />`;

    el.innerHTML = `
      <h2>${title}</h2>
      ${
        admin
          ? `<form id="f" class="card" novalidate>
              <h3 id="ft">Novo(a) ${singular}</h3>
              <div class="grid">${fields.map((f) => `<label>${f.label}${f.required ? ' *' : ''}${inputHtml(f)}</label>`).join('')}</div>
              <div id="err" class="error" hidden></div>
              <div class="actions">
                <button class="btn primary" type="submit">Salvar</button>
                <button class="btn" type="button" id="cancel" hidden>Cancelar edição</button>
              </div>
            </form>`
          : '<p class="muted">Somente administradores podem cadastrar, editar ou excluir.</p>'
      }
      <div class="card"><table>
        <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}${admin ? '<th></th>' : ''}</tr></thead>
        <tbody id="rows"></tbody>
      </table></div>`;

    const rows = el.querySelector('#rows');
    const form = el.querySelector('#f');

    function draw() {
      if (!items.length) {
        rows.innerHTML = `<tr><td colspan="${columns.length + 1}" class="muted">Nenhum registro.</td></tr>`;
        return;
      }
      rows.innerHTML = items
        .map(
          (it) => `<tr>
            ${columns.map((c) => `<td>${esc(c.format ? c.format(it[c.key]) : it[c.key] ?? '—')}</td>`).join('')}
            ${admin ? `<td class="row-actions"><button class="btn sm" data-edit="${it.id}">Editar</button><button class="btn sm danger" data-del="${it.id}">Excluir</button></td>` : ''}
          </tr>`
        )
        .join('');
    }

    async function load() {
      items = await api(endpoint);
      draw();
    }

    function resetForm() {
      editingId = null;
      form.reset();
      form.querySelector('#ft').textContent = `Novo(a) ${singular}`;
      form.querySelector('#cancel').hidden = true;
      clearError(form.querySelector('#err'));
    }

    if (form) {
      const err = form.querySelector('#err');
      form.querySelector('#cancel').addEventListener('click', resetForm);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(err);
        const body = {};
        fields.forEach((f) => (body[f.name] = form.elements[f.name].value));
        const missing = fields.find((f) => f.required && !String(body[f.name]).trim());
        if (missing) return showError(err, new Error(`${missing.label} é obrigatório.`));
        try {
          if (editingId) await api(`${endpoint}/${editingId}`, { method: 'PUT', body });
          else await api(endpoint, { method: 'POST', body });
          toast(`${singular} salvo(a) com sucesso`, 'success');
          resetForm();
          await load();
        } catch (ex) {
          showError(err, ex);
        }
      });
    }

    rows.addEventListener('click', async (e) => {
      const edit = e.target.dataset.edit;
      const del = e.target.dataset.del;
      if (edit) {
        const it = items.find((x) => String(x.id) === edit);
        editingId = it.id;
        fields.forEach((f) => (form.elements[f.name].value = it[f.name] ?? ''));
        form.querySelector('#ft').textContent = `Editando ${singular} #${it.id}`;
        form.querySelector('#cancel').hidden = false;
        form.scrollIntoView({ behavior: 'smooth' });
      }
      if (del && confirm('Excluir este registro?')) {
        try {
          await api(`${endpoint}/${del}`, { method: 'DELETE' });
          toast('Registro excluído', 'success');
          await load();
        } catch (ex) {
          toast(ex.message, 'error'); // ex.: 409 com a mensagem clara de vínculos
        }
      }
    });

    await load();
  };
}
