import { api } from '../api.js';
import { esc, toast, clearError, showError, fmtDate, fmtDateTime, fmtMoney, badge } from '../ui.js';

const fmtCpf = (c) => (c && c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c ?? '—');

export async function render(el) {
  let readers = [];
  let editingId = null;

  el.innerHTML = `
    <h2>Leitores</h2>
    <form id="f" class="card" novalidate>
      <h3 id="ft">Novo leitor</h3>
      <div class="grid">
        <label>Nome *<input name="name" /></label>
        <label>CPF *<input name="cpf" placeholder="000.000.000-00" /></label>
        <label>E-mail<input name="email" type="email" /></label>
        <label>Telefone<input name="phone" /></label>
      </div>
      <div id="err" class="error" hidden></div>
      <div class="actions">
        <button class="btn primary" type="submit">Salvar</button>
        <button class="btn" type="button" id="cancel" hidden>Cancelar edição</button>
      </div>
    </form>
    <form id="search" class="card filters">
      <label>Buscar por nome ou CPF<input name="search" /></label>
      <button class="btn primary" type="submit">Buscar</button>
    </form>
    <div class="card"><table>
      <thead><tr><th>Nome</th><th>CPF</th><th>E-mail</th><th>Telefone</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
    <div id="history"></div>`;

  const form = el.querySelector('#f');
  const err = el.querySelector('#err');
  const rows = el.querySelector('#rows');
  const search = el.querySelector('#search');
  const history = el.querySelector('#history');

  function draw() {
    rows.innerHTML = readers.length
      ? readers
          .map(
            (r) => `<tr><td>${esc(r.name)}</td><td>${esc(fmtCpf(r.cpf))}</td><td>${esc(r.email ?? '—')}</td><td>${esc(r.phone ?? '—')}</td>
            <td class="row-actions"><button class="btn sm" data-edit="${r.id}">Editar</button><button class="btn sm" data-hist="${r.id}">Histórico</button></td></tr>`
          )
          .join('')
      : '<tr><td colspan="5" class="muted">Nenhum leitor encontrado.</td></tr>';
  }

  async function load() {
    const s = search.elements.search.value.trim();
    readers = await api(`/readers${s ? `?search=${encodeURIComponent(s)}` : ''}`);
    draw();
  }

  function resetForm() {
    editingId = null;
    form.reset();
    form.querySelector('#ft').textContent = 'Novo leitor';
    form.querySelector('#cancel').hidden = true;
    clearError(err);
  }

  search.addEventListener('submit', (e) => {
    e.preventDefault();
    load();
  });
  form.querySelector('#cancel').addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(err);
    const f = form.elements;
    const body = { name: f.name.value, cpf: f.cpf.value, email: f.email.value, phone: f.phone.value };
    if (!body.name.trim()) return showError(err, new Error('O nome é obrigatório.'));
    if (body.cpf.replace(/\D/g, '').length !== 11) return showError(err, new Error('O CPF deve ter 11 dígitos.'));
    try {
      if (editingId) await api(`/readers/${editingId}`, { method: 'PUT', body });
      else await api('/readers', { method: 'POST', body });
      toast('Leitor salvo com sucesso', 'success');
      resetForm();
      await load();
    } catch (ex) {
      showError(err, ex);
    }
  });

  rows.addEventListener('click', async (e) => {
    const edit = e.target.dataset.edit;
    const hist = e.target.dataset.hist;
    if (edit) {
      const r = readers.find((x) => String(x.id) === edit);
      editingId = r.id;
      const f = form.elements;
      f.name.value = r.name;
      f.cpf.value = fmtCpf(r.cpf);
      f.email.value = r.email ?? '';
      f.phone.value = r.phone ?? '';
      form.querySelector('#ft').textContent = `Editando leitor #${r.id}`;
      form.querySelector('#cancel').hidden = false;
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (hist) {
      const r = readers.find((x) => String(x.id) === hist);
      try {
        const loans = await api(`/readers/${hist}/loans`);
        history.innerHTML = `<div class="card"><h3>Histórico de ${esc(r.name)}</h3><table>
          <thead><tr><th>Livro</th><th>Empréstimo</th><th>Vencimento</th><th>Devolução</th><th>Status</th><th>Multa</th></tr></thead>
          <tbody>${
            loans.length
              ? loans
                  .map(
                    (l) => `<tr><td>${esc(l.book?.title)}</td><td>${fmtDate(l.loanDate)}</td><td>${fmtDate(l.dueDate)}</td>
                    <td>${l.returnDate ? fmtDateTime(l.returnDate) : '—'}</td><td>${badge(l.status)}</td><td>${fmtMoney(l.fine)}</td></tr>`
                  )
                  .join('')
              : '<tr><td colspan="6" class="muted">Sem empréstimos.</td></tr>'
          }</tbody></table></div>`;
        history.scrollIntoView({ behavior: 'smooth' });
      } catch (ex) {
        toast(ex.message, 'error');
      }
    }
  });

  await load();
}
