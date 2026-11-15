# Task Manager API

[Português](#português) · [English](#english)

---

## Português

API REST para gerenciar projetos e tarefas. Cada usuário cria uma conta, faz login com JWT e organiza suas próprias tarefas em projetos. Nenhum usuário consegue ver ou alterar dados de outro.

### Funcionalidades

- **Autenticação:** cadastro, login com JWT, consulta e edição de perfil, troca de senha. A troca de senha revoga todos os tokens já emitidos.
- **Projetos:** CRUD completo, sempre restrito ao dono.
- **Tarefas:** CRUD dentro de projetos, com título, descrição, prioridade (`LOW`, `MEDIUM`, `HIGH`), status (`PENDING`, `IN_PROGRESS`, `COMPLETED`), data de vencimento e datas de criação/atualização.
- **Consultas:** filtro por status, prioridade e projeto; busca por título (sem diferenciar maiúsculas); ordenação por data de criação ou vencimento; paginação com `limit` e `offset`.
- **Segurança:** senhas com bcrypt, validação de toda entrada com Zod, Helmet, rate limit nas rotas de autenticação, erros sem detalhes internos, consultas sempre filtradas pelo dono.
- **Documentação:** Swagger UI gerado a partir dos mesmos schemas Zod que validam as requisições.

### Tecnologias

Node.js 26 · TypeScript 7 · Express 5 · PostgreSQL 17 · Prisma 7 · Zod 4 · JWT (jsonwebtoken) · bcrypt · Helmet · express-rate-limit · Swagger UI (zod-to-openapi) · Vitest + Supertest · Docker e Docker Compose

### Arquitetura

```
src/
  config/env.ts          variáveis de ambiente validadas com Zod (a app não sobe se faltar algo)
  lib/prisma.ts          cliente Prisma (passwordHash omitido por padrão em todas as consultas)
  modules/
    auth/                cadastro e login
    users/               perfil e troca de senha
    projects/            CRUD de projetos
    tasks/               CRUD de tarefas, filtros e paginação
  middlewares/           autenticação JWT, rate limit, tratamento global de erros
  docs/openapi.ts        especificação OpenAPI
  utils/                 erros, JWT, hash de senha, schemas compartilhados
prisma/                  schema e migrations
tests/                   testes de integração contra um banco PostgreSQL real
```

Cada módulo separa responsabilidades: **routes** → **controller** (HTTP e validação) → **service** (regras de negócio) → **repository** (acesso ao banco).

Decisões principais:

- **Isolamento de dados no banco:** toda consulta filtra pelo dono (`{ id, ownerId }` ou `{ id, project: { ownerId } }`). Um ID sozinho nunca dá acesso a um recurso.
- **404 para recursos de outros usuários**, em vez de 403, para não revelar que o ID existe.
- **Revogação de tokens:** cada usuário tem um `tokenVersion` que entra no JWT; trocar a senha incrementa o número e invalida os tokens antigos.
- **Login sem enumeração:** e-mail inexistente e senha errada retornam a mesma resposta, no mesmo tempo.

### Requisitos

- Node.js 24 ou superior (desenvolvido com Node 26) e npm
- Docker e Docker Compose

### Como executar

**1. Instale as dependências**

```bash
npm install
```

**2. Configure o `.env`**

```bash
cp .env.example .env
```

Troque o `JWT_SECRET` por um valor aleatório. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | URL de conexão do PostgreSQL | — |
| `JWT_SECRET` | Chave de assinatura do JWT (mínimo 32 caracteres) | — |
| `JWT_EXPIRES_IN` | Validade do token (`15m`, `1h`, `7d`) | `1h` |
| `PORT` | Porta HTTP | `3000` |
| `BCRYPT_ROUNDS` | Custo do bcrypt | `12` |
| `AUTH_RATE_LIMIT_MAX` | Tentativas em `/auth/*` a cada 15 minutos, por IP | `10` |

**3. Suba o PostgreSQL com Docker**

```bash
docker compose up -d db
```

**4. Execute as migrations**

```bash
npm run db:migrate
```

**5. Inicie o servidor**

```bash
npm run dev
```

A API fica em `http://localhost:3000`. Para rodar a versão compilada: `npm run build` e depois `npm start`.

**Alternativa: tudo no Docker** (API + banco; as migrations rodam automaticamente ao iniciar)

```bash
docker compose up -d --build
```

### Testes

Os testes de integração usam um banco separado (`taskmanager_test`), criado e migrado automaticamente. O PostgreSQL precisa estar rodando:

```bash
docker compose up -d db
```

```bash
npm test
```

Também há verificação de tipos:

```bash
npm run typecheck
```

### Documentação (Swagger)

Com o servidor rodando, acesse **http://localhost:3000/docs**. O JSON da especificação fica em `/docs/openapi.json`. Para testar rotas protegidas, faça login, clique em **Authorize** e cole o token.

### Endpoints

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | `/auth/register` | — | Cria uma conta |
| POST | `/auth/login` | — | Retorna um JWT |
| GET | `/users/me` | JWT | Perfil do usuário |
| PATCH | `/users/me` | JWT | Atualiza nome/e-mail |
| PATCH | `/users/me/password` | JWT | Troca a senha |
| POST | `/projects` | JWT | Cria um projeto |
| GET | `/projects` | JWT | Lista projetos (`limit`, `offset`) |
| GET | `/projects/:id` | JWT | Detalha um projeto |
| PATCH | `/projects/:id` | JWT | Atualiza um projeto |
| DELETE | `/projects/:id` | JWT | Exclui o projeto e suas tarefas |
| POST | `/projects/:projectId/tasks` | JWT | Cria uma tarefa no projeto |
| GET | `/tasks` | JWT | Lista tarefas com filtros |
| GET | `/tasks/:id` | JWT | Detalha uma tarefa |
| PATCH | `/tasks/:id` | JWT | Atualiza uma tarefa |
| DELETE | `/tasks/:id` | JWT | Exclui uma tarefa |

Parâmetros de `GET /tasks`: `projectId`, `status`, `priority`, `search`, `sortBy` (`createdAt` ou `dueDate`), `order` (`asc` ou `desc`), `limit` (1–100, padrão 20), `offset` (padrão 0).

### Exemplos

Os exemplos usam `curl`, um projeto e uma tarefa fictícios.

**Cadastro**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"password123"}'
```

```json
{
  "data": {
    "user": {
      "id": "6f1c2a9e-...",
      "name": "Ana",
      "email": "ana@example.com",
      "createdAt": "2026-11-15T12:00:00.000Z",
      "updatedAt": "2026-11-15T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Criar uma tarefa**

```bash
curl -X POST http://localhost:3000/projects/<projectId>/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Escrever README","priority":"HIGH","dueDate":"2026-12-01T18:00:00-03:00"}'
```

```json
{
  "data": {
    "id": "b7e4...",
    "title": "Escrever README",
    "description": null,
    "priority": "HIGH",
    "status": "PENDING",
    "dueDate": "2026-12-01T21:00:00.000Z",
    "projectId": "<projectId>",
    "createdAt": "2026-11-15T12:05:00.000Z",
    "updatedAt": "2026-11-15T12:05:00.000Z"
  }
}
```

**Listar tarefas pendentes de alta prioridade, pelo vencimento**

```bash
curl "http://localhost:3000/tasks?status=PENDING&priority=HIGH&sortBy=dueDate&order=asc&limit=10" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "data": [{ "id": "b7e4...", "title": "Escrever README", "priority": "HIGH", "status": "PENDING" }],
  "meta": { "total": 1, "limit": 10, "offset": 0 }
}
```

**Formato de erro** (igual em todas as rotas)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": { "formErrors": [], "fieldErrors": { "email": ["Invalid email address"] } }
  }
}
```

| Status | Quando |
|---|---|
| 200 / 201 / 204 | Sucesso / criado / sem conteúdo |
| 400 | JSON malformado |
| 401 | Token ausente, inválido, expirado ou revogado; credenciais erradas |
| 404 | Recurso inexistente ou de outro usuário |
| 409 | E-mail já cadastrado |
| 413 | Corpo da requisição maior que 100 KB |
| 422 | Dados inválidos |
| 429 | Muitas tentativas de login/cadastro |
| 500 | Erro interno (sem detalhes na resposta) |

---

## English

REST API to manage projects and tasks. Each user signs up, logs in with a JWT and organizes their own tasks into projects. No user can read or change another user's data.

### Features

- **Authentication:** sign up, JWT login, view and edit profile, change password. Changing the password revokes every token already issued.
- **Projects:** full CRUD, always scoped to the owner.
- **Tasks:** CRUD inside projects, with title, description, priority (`LOW`, `MEDIUM`, `HIGH`), status (`PENDING`, `IN_PROGRESS`, `COMPLETED`), due date and created/updated timestamps.
- **Queries:** filter by status, priority and project; case-insensitive title search; sort by creation or due date; `limit`/`offset` pagination.
- **Security:** bcrypt password hashing, Zod validation on every input, Helmet, rate limiting on auth routes, errors without internal details, every query filtered by owner.
- **Docs:** Swagger UI generated from the same Zod schemas that validate requests.

### Tech stack

Node.js 26 · TypeScript 7 · Express 5 · PostgreSQL 17 · Prisma 7 · Zod 4 · JWT (jsonwebtoken) · bcrypt · Helmet · express-rate-limit · Swagger UI (zod-to-openapi) · Vitest + Supertest · Docker and Docker Compose

### Architecture

```
src/
  config/env.ts          environment variables validated with Zod (the app refuses to start if one is missing)
  lib/prisma.ts          Prisma client (passwordHash omitted from every query by default)
  modules/
    auth/                sign up and login
    users/               profile and password change
    projects/            project CRUD
    tasks/               task CRUD, filters and pagination
  middlewares/           JWT authentication, rate limiting, global error handling
  docs/openapi.ts        OpenAPI specification
  utils/                 errors, JWT, password hashing, shared schemas
prisma/                  schema and migrations
tests/                   integration tests against a real PostgreSQL database
```

Each module splits responsibilities: **routes** → **controller** (HTTP and validation) → **service** (business rules) → **repository** (database access).

Key decisions:

- **Data isolation in the database:** every query filters by owner (`{ id, ownerId }` or `{ id, project: { ownerId } }`). An id alone never grants access to a resource.
- **404 for other users' resources**, instead of 403, so the API does not reveal that the id exists.
- **Token revocation:** each user has a `tokenVersion` embedded in the JWT; changing the password increments it and invalidates older tokens.
- **No account enumeration on login:** an unknown email and a wrong password return the same response, in the same time.

### Requirements

- Node.js 24 or newer (developed with Node 26) and npm
- Docker and Docker Compose

### Getting started

**1. Install dependencies**

```bash
npm install
```

**2. Configure `.env`**

```bash
cp .env.example .env
```

Replace `JWT_SECRET` with a random value. To generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | — |
| `JWT_SECRET` | JWT signing key (at least 32 characters) | — |
| `JWT_EXPIRES_IN` | Token lifetime (`15m`, `1h`, `7d`) | `1h` |
| `PORT` | HTTP port | `3000` |
| `BCRYPT_ROUNDS` | bcrypt cost | `12` |
| `AUTH_RATE_LIMIT_MAX` | Attempts on `/auth/*` per 15 minutes, per IP | `10` |

**3. Start PostgreSQL with Docker**

```bash
docker compose up -d db
```

**4. Run the migrations**

```bash
npm run db:migrate
```

**5. Start the server**

```bash
npm run dev
```

The API runs at `http://localhost:3000`. To run the compiled build: `npm run build`, then `npm start`.

**Alternative: everything in Docker** (API + database; migrations run automatically on start)

```bash
docker compose up -d --build
```

### Tests

Integration tests use a separate database (`taskmanager_test`), created and migrated automatically. PostgreSQL must be running:

```bash
docker compose up -d db
```

```bash
npm test
```

Type checking:

```bash
npm run typecheck
```

### Documentation (Swagger)

With the server running, open **http://localhost:3000/docs**. The raw specification is at `/docs/openapi.json`. To call protected routes, log in, click **Authorize** and paste the token.

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create an account |
| POST | `/auth/login` | — | Get a JWT |
| GET | `/users/me` | JWT | Current user profile |
| PATCH | `/users/me` | JWT | Update name/email |
| PATCH | `/users/me/password` | JWT | Change password |
| POST | `/projects` | JWT | Create a project |
| GET | `/projects` | JWT | List projects (`limit`, `offset`) |
| GET | `/projects/:id` | JWT | Get a project |
| PATCH | `/projects/:id` | JWT | Update a project |
| DELETE | `/projects/:id` | JWT | Delete a project and its tasks |
| POST | `/projects/:projectId/tasks` | JWT | Create a task in the project |
| GET | `/tasks` | JWT | List tasks with filters |
| GET | `/tasks/:id` | JWT | Get a task |
| PATCH | `/tasks/:id` | JWT | Update a task |
| DELETE | `/tasks/:id` | JWT | Delete a task |

`GET /tasks` parameters: `projectId`, `status`, `priority`, `search`, `sortBy` (`createdAt` or `dueDate`), `order` (`asc` or `desc`), `limit` (1–100, default 20), `offset` (default 0).

### Examples

**Sign up**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"password123"}'
```

```json
{
  "data": {
    "user": {
      "id": "6f1c2a9e-...",
      "name": "Ana",
      "email": "ana@example.com",
      "createdAt": "2026-11-15T12:00:00.000Z",
      "updatedAt": "2026-11-15T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Create a task**

```bash
curl -X POST http://localhost:3000/projects/<projectId>/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write README","priority":"HIGH","dueDate":"2026-12-01T18:00:00-03:00"}'
```

```json
{
  "data": {
    "id": "b7e4...",
    "title": "Write README",
    "description": null,
    "priority": "HIGH",
    "status": "PENDING",
    "dueDate": "2026-12-01T21:00:00.000Z",
    "projectId": "<projectId>",
    "createdAt": "2026-11-15T12:05:00.000Z",
    "updatedAt": "2026-11-15T12:05:00.000Z"
  }
}
```

**List pending high-priority tasks by due date**

```bash
curl "http://localhost:3000/tasks?status=PENDING&priority=HIGH&sortBy=dueDate&order=asc&limit=10" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "data": [{ "id": "b7e4...", "title": "Write README", "priority": "HIGH", "status": "PENDING" }],
  "meta": { "total": 1, "limit": 10, "offset": 0 }
}
```

**Error format** (same on every route)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": { "formErrors": [], "fieldErrors": { "email": ["Invalid email address"] } }
  }
}
```

| Status | When |
|---|---|
| 200 / 201 / 204 | Success / created / no content |
| 400 | Malformed JSON |
| 401 | Missing, invalid, expired or revoked token; wrong credentials |
| 404 | Resource does not exist or belongs to another user |
| 409 | Email already registered |
| 413 | Request body larger than 100 KB |
| 422 | Invalid data |
| 429 | Too many login/sign-up attempts |
| 500 | Internal error (no details in the response) |
