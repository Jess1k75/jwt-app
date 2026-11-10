import { crudPage } from './crud.js';
import { fmtDate } from '../ui.js';

export const render = crudPage({
  title: 'Autores',
  singular: 'autor',
  endpoint: '/authors',
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'nationality', label: 'Nacionalidade' },
    { name: 'birthDate', label: 'Data de nascimento', type: 'date' },
  ],
  columns: [
    { key: 'name', label: 'Nome' },
    { key: 'nationality', label: 'Nacionalidade' },
    { key: 'birthDate', label: 'Nascimento', format: fmtDate },
  ],
});
