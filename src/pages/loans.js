import { api } from '../api.js';
import { esc, toast, clearError, showError, fmtDate, fmtDateTime, fmtMoney, badge } from '../ui.js';

export async function render(el) {
  let readers = [];
  let books = [];
  let loans = [];

  el.innerHTML = `
    <h2>Empréstimos</h2>
    <form id="f" class="card" novalidate>
      <h3>Novo empréstimo</h3>
      <div class="grid">
        <label>Buscar leitor (nome ou CPF)<input id="qr" placeholder="digite para filtrar…" /></label>
        <label>Leitor *<select id="reader" size="4"></select></label>
        <label>Buscar livro (título ou ISBN)<input id="qb" placeholder="digite para filtrar…" /></label>
        <label>Livro disponível *<select id="book" size="4"></select></label>
      </div>
      <div id="err" class="error" hidden></div>
      <div class="actions"><button class="btn primary" type="submit">Registrar empréstimo</button></div>
      <p class="muted">Prazo padrão: 7 dias. Máximo de 3 empréstimos ativos por leitor; leitor com atraso não pode pegar livros.</p>
    </form>
    <div class="card filters">
      <label>Filtrar por status
        <select id="status"><option value="">Todos</option><option>ATIVO</option><option>ATRASADO</option><option>DEVOLVIDO</option></select>
      </label>
    </div>
    <div class="card"><table>
      <thead><tr><th>#</th><th>Livro</th><th>Leitor</th><th>Empréstimo</th><th>Vencimento</th><th>Devolução</th><th>Status</th><th>Multa</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>`;

  const form = el.querySelector('#f');
  const err = el.querySelector('#err');
  const selReader = el.querySelector('#reader');
  const selBook = el.querySelector('#book');
  const rows = el.querySelector('#rows');
  const status = el.querySelector('#status');

  const norm = (s) => String(s ?? '').toLowerCase();

  function fillReaders() {
    const q = norm(el.querySelector('#qr').value);
    selReader.innerHTML = readers
      .filter((r) => norm(r.name).includes(q) || r.cpf.includes(q.replace(/\D/g, '') || '§'))
      .map((r) => `<option value="${r.id}">${esc(r.name)} — ${esc(r.cpf)}</option>`)
      .join('');
  }

  function fillBooks() {
    const q = norm(el.querySelector('#qb').value);
    selBook.innerHTML = books
      .filter((b) => norm(b.title).includes(q) || norm(b.isbn).includes(q))
      .map((b) => `<option value="${b.id}">${esc(b.title)} (${b.availableCopies} disp.)</option>`)
      .join('');
  }

  function draw() {
    rows.innerHTML = loans.length
      ? loans
          .map(
            (l) => `<tr>
            <td>${l.id}</td><td>${esc(l.book?.title)}</td><td>${esc(l.reader?.name)}</td>
            <td>${fmtDate(l.loanDate)}</td><td>${fmtDate(l.dueDate)}</td>
            <td>${l.returnDate ? fmtDateTime(l.returnDate) : '—'}</td>
            <td>${badge(l.status)}</td><td>${l.fine > 0 ? `<b>${fmtMoney(l.fine)}</b>` : fmtMoney(0)}</td>
            <td>${l.returnDate ? '' : `<button class="btn sm primary" data-ret="${l.id}">Devolver</button>`}</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="9" class="muted">Nenhum empréstimo.</td></tr>';
  }

  async function loadLoans() {
    loans = await api(`/loans${status.value ? `?status=${status.value}` : ''}`);
    draw();
  }

  async function loadOptions() {
    [readers, books] = await Promise.all([api('/readers'), api('/books?available=true')]);
    fillReaders();
    fillBooks();
  }

  el.querySelector('#qr').addEventListener('input', fillReaders);
  el.querySelector('#qb').addEventListener('input', fillBooks);
  status.addEventListener('change', loadLoans);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(err);
    if (!selReader.value || !selBook.value) return showError(err, new Error('Selecione um leitor e um livro.'));
    try {
      await api('/loans', { method: 'POST', body: { readerId: Number(selReader.value), bookId: Number(selBook.value) } });
      toast('Empréstimo registrado', 'success');
      await Promise.all([loadLoans(), loadOptions()]);
    } catch (ex) {
      showError(err, ex); // 409: sem estoque, limite de 3, leitor atrasado…
    }
  });

  rows.addEventListener('click', async (e) => {
    const id = e.target.dataset.ret;
    if (!id || !confirm('Registrar a devolução deste empréstimo?')) return;
    try {
      const loan = await api(`/loans/${id}/return`, { method: 'PATCH' });
      toast(loan.fine > 0 ? `Devolvido com atraso. Multa: ${fmtMoney(loan.fine)}` : 'Devolvido no prazo. Sem multa.', loan.fine > 0 ? 'error' : 'success');
      await Promise.all([loadLoans(), loadOptions()]);
    } catch (ex) {
      toast(ex.message, 'error');
    }
  });

  await Promise.all([loadLoans(), loadOptions()]);
}
