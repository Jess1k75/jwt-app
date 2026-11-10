# jwt-app — Front-end do Sistema de Biblioteca

Vite + JavaScript puro (módulos ES). Consome a `jwt-api`.

## Como instalar

```bash
npm install
cp .envex .env        # no Windows: copy .envex .env
npm run dev           # http://localhost:5173
```

`.env`: `VITE_API_URL=http://localhost:3000/v1`. A API precisa estar rodando e com CORS liberado para `http://localhost:5173`.

Login do seed: `admin@biblioteca.com` / `123456`.

## Telas

Login · Dashboard (admin) · Categorias · Autores · Livros (busca/filtros, vários autores, disponíveis) · Leitores (histórico) · Empréstimos (novo, filtro de status, devolução com multa) · Atendentes (admin). Topo com nome do usuário, contador do access token e botão Sair.

## Como funciona a renovação automática (`src/api.js`)

1. Toda requisição leva `Authorization: Bearer <accessToken>`.
2. Se a API responde **401**, o interceptor chama `POST /auth/refresh` **uma única vez** e repete a requisição original com o novo token.
3. Se várias requisições recebem 401 ao mesmo tempo, elas compartilham **a mesma Promise** de refresh: sai só uma chamada e as demais aguardam na fila.
4. Se o refresh falhar, a sessão é limpa e o usuário vai para o login.
5. Rotas sem sessão redirecionam para `#/login`; menus de administrador ficam ocultos para atendente (a API também bloqueia com 403).

## Onde os tokens ficam e os riscos

Os tokens ficam em **`localStorage`**: simples e sobrevive ao fechar a aba, mas qualquer script que rode na página (ex.: falha de XSS) consegue ler os tokens. `sessionStorage` reduz a exposição (some ao fechar a aba) mas tem o mesmo risco de XSS. A opção mais segura é guardar o refresh token em cookie `HttpOnly` + `Secure` + `SameSite`, o que exigiria alterar a API. Mitigações aplicadas aqui: access token de vida curta (15 min), rotação do refresh token, escape de HTML nas telas (`esc()`) para reduzir XSS.
