import { api, session } from '../api.js';
import { esc, fmtMoney } from '../ui.js';

export async function render(el) {
  const user = session.user;
  if (!user?.isAdmin) {
    el.innerHTML = `<h2>Olá, ${esc(user?.name)}!</h2>
      <div class="card"><p>Use o menu para consultar o <b>acervo</b>, cadastrar <b>leitores</b> e registrar <b>empréstimos</b> e <b>devoluções</b>.</p>
      <p class="muted">O painel com totais é exclusivo de administradores.</p></div>`;
    return;
  }

  el.innerHTML = '<h2>Dashboard</h2><p class="muted">Carregando…</p>';
  const d = await api('/reports/dashboard');
  el.innerHTML = `
    <h2>Dashboard</h2>
    <div class="cards">
      <div class="stat"><div class="n">${d.totalBooks}</div><div class="l">Títulos cadastrados (${d.totalCopies} exemplares, ${d.availableCopies} disponíveis)</div></div>
      <div class="stat"><div class="n">${d.activeLoans}</div><div class="l">Empréstimos ativos (não devolvidos)</div></div>
      <div class="stat red"><div class="n">${d.overdueLoans}</div><div class="l">Empréstimos atrasados</div></div>
      <div class="stat green"><div class="n">${fmtMoney(d.totalFines)}</div><div class="l">Multas cobradas</div></div>
      <div class="stat"><div class="n">${d.totalReaders}</div><div class="l">Leitores cadastrados</div></div>
    </div>`;
}
