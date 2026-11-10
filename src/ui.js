export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(message, type = 'info') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

export function fmtDate(value) {
  if (!value) return '—';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(value).toLocaleDateString('pt-BR');
}

export const fmtDateTime = (value) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const fmtMoney = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const badge = (status) => `<span class="badge ${esc(status)}">${esc(status)}</span>`;

export function showError(el, err) {
  el.textContent = err?.message || 'Erro inesperado.';
  el.hidden = false;
}

export function clearError(el) {
  el.hidden = true;
  el.textContent = '';
}
