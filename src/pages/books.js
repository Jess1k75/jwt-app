import { api, session } from '../api.js';
import { esc, toast, clearError, showError } from '../ui.js';

export async function render(el) {
  const admin = !!session.user?.isAdmin;
  const [categories, authors] = await Promise.all([api('/categories'), api('/authors')]);
  let books = [];
  let editingId = null;

  const catOptions = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const authOptions = authors.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('');

  el.innerHTML = `
    <h2>Livros</h2>
    <form id="filters" class="card filters">
      <label>Título <input name="title" placeholder="buscar…" /></label>
      <label>Categoria <select name="categoryId"><option value="">Todas</option>${catOptions}</select></label>
      <label>Autor <select name="authorId"><option value="">Todos</option>${authOptions}</select></label>
      <label class="check"><input type="checkbox" name="available" /> Só disponíveis</label>
      <button class="btn primary" type="submit">Buscar</button>
      <button class="btn" type="button" id="clear">Limpar</button>
    </form>
    ${
      admin
        ? `<form id="f" class="card" novalidate>
            <h3 id="ft">Novo livro</h3>
            <div class="grid">
              <label>Título *<input name="title" /></label>
              <label>ISBN *<input name="isbn" /></label>
              <label>Ano<input name="year" type="number" /></label>
              <label>Total de exemplares *<input name="totalCopies" type="number" min="1" value="1" /></label>
              <label>Categoria *<select name="categoryId"><option value="">Selecione…</option>${catOptions}</select></label>
              <label>Autores (Ctrl/Cmd para vários)<select name="authorIds" multiple size="4">${authOptions}</select></label>
            </div>
            <div id="err" class="error" hidden></div>
            <div class="actions">
              <button class="btn primary" type="submit">Salvar</button>
              <button class="btn" type="button" id="cancel" hidden>Cancelar edição</button>
            </div>
          </form>`
        : ''
    }
    <div class="card"><table>
      <thead><tr><th>Título</th><th>ISBN</th><th>Ano</th><th>Categoria</th><th>Autores</th><th>Disponíveis</th>${admin ? '<th></th>' : ''}</tr></thead>
      <tbody id="rows"></tbody>
    </table></div>`;

  const rows = el.querySelector('#rows');
  const filters = el.querySelector('#filters');
  const form = el.querySelector('#f');

  function draw() {
    if (!books.length) {
      rows.innerHTML = '<tr><td colspan="7" class="muted">Nenhum livro encontrado.</td></tr>';
      return;
    }
    rows.innerHTML = books
      .map(
        (b) => `<tr>
          <td>${esc(b.title)}</td><td>${esc(b.isbn)}</td><td>${esc(b.year ?? '—')}</td>
          <td>${esc(b.category?.name)}</td>
          <td>${esc(b.authors.map((a) => a.name).join(', ') || '—')}</td>
          <td><span class="badge ${b.availableCopies > 0 ? 'ok' : 'off'}">${b.availableCopies} / ${b.totalCopies}</span></td>
          ${admin ? `<td class="row-actions"><button class="btn sm" data-edit="${b.id}">Editar</button><button class="btn sm danger" data-del="${b.id}">Excluir</button></td>` : ''}
        </tr>`
      )
      .join('');
  }

  async function load() {
    const q = new URLSearchParams();
    if (filters.elements.title.value.trim()) q.set('title', filters.elements.title.value.trim());
    if (filters.elements.categoryId.value) q.set('categoryId', filters.elements.categoryId.value);
    if (filters.elements.authorId.value) q.set('authorId', filters.elements.authorId.value);
    if (filters.elements.available.checked) q.set('available', 'true');
    books = await api(`/books${q.toString() ? `?${q}` : ''}`);
    draw();
  }

  filters.addEventListener('submit', (e) => {
    e.preventDefault();
    load();
  });
  filters.querySelector('#clear').addEventListener('click', () => {
    filters.reset();
    load();
  });

  function resetForm() {
    editingId = null;
    form.reset();
    form.elements.totalCopies.value = 1;
    form.querySelector('#ft').textContent = 'Novo livro';
    form.querySelector('#cancel').hidden = true;
    clearError(form.querySelector('#err'));
  }

  if (form) {
    const err = form.querySelector('#err');
    form.querySelector('#cancel').addEventListener('click', resetForm);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(err);
      const body = {
        title: form.elements.title.value,
        isbn: form.elements.isbn.value,
        year: form.elements.year.value === '' ? null : Number(form.elements.year.value),
        totalCopies: Number(form.elements.totalCopies.value),
        categoryId: form.elements.categoryId.value ? Number(form.elements.categoryId.value) : null,
        authorIds: [...form.elements.authorIds.selectedOptions].map((o) => Number(o.value)),
      };
      if (!body.title.trim() || !body.isbn.trim()) return showError(err, new Error('Título e ISBN são obrigatórios.'));
      if (!body.categoryId) return showError(err, new Error('Selecione uma categoria.'));
      try {
        if (editingId) await api(`/books/${editingId}`, { method: 'PUT', body });
        else await api('/books', { method: 'POST', body });
        toast('Livro salvo com sucesso', 'success');
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
      const b = books.find((x) => String(x.id) === edit);
      editingId = b.id;
      form.elements.title.value = b.title;
      form.elements.isbn.value = b.isbn;
      form.elements.year.value = b.year ?? '';
      form.elements.totalCopies.value = b.totalCopies;
      form.elements.categoryId.value = b.categoryId;
      const ids = b.authors.map((a) => String(a.id));
      [...form.elements.authorIds.options].forEach((o) => (o.selected = ids.includes(o.value)));
      form.querySelector('#ft').textContent = `Editando livro #${b.id}`;
      form.querySelector('#cancel').hidden = false;
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (del && confirm('Excluir este livro?')) {
      try {
        await api(`/books/${del}`, { method: 'DELETE' });
        toast('Livro excluído', 'success');
        await load();
      } catch (ex) {
        toast(ex.message, 'error');
      }
    }
  });

  await load();
}
