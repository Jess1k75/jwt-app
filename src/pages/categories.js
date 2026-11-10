import { crudPage } from './crud.js';

export const render = crudPage({
  title: 'Categorias',
  singular: 'categoria',
  endpoint: '/categories',
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'description', label: 'Descrição' },
  ],
  columns: [
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrição' },
  ],
});
