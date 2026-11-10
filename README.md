# PortPulse

Widget desktop (Electron) + API (Express, arquitetura hexagonal) que lista e encerra
processos usando portas no Windows, mostra conexões de saída (com reverse DNS + GeoIP),
alerta sobre atividade suspeita e atualiza em tempo real via WebSocket. Detalhes de
arquitetura em [ARCHITECTURE.md](ARCHITECTURE.md).

## Rodando o widget

```
npm install
npm start
```

Sobe a janela Electron (sempre no topo) com a API já embutida no mesmo processo —
nada mais precisa estar rodando antes. O widget faz login sozinho na API (chave de
acesso gerada por processo, ver seção Autenticação) — não tem tela de senha.

## Rodando só a API (desenvolvimento do backend)

```
npm run dev
```

Sobe em `http://localhost:3000` (configurável via `apps/api/.env`, veja `.env.example`).

- Docs interativas: `http://localhost:3000/docs`
- Métricas Prometheus: `/metrics`
- Health checks: `/health/live` (liveness), `/health/ready` (checa o banco)
- Login: `POST /api/auth/login` com `{ "accessKey": "..." }` (chave impressa/gerada no
  boot — ver `.env.example`) devolve um JWT exigido pelas rotas que alteram estado
  (`DELETE /api/ports/:port`, `PUT`/`DELETE /api/protection/:port`)

## Autenticação

Não tem cadastro de usuário — é uma ferramenta de uso pessoal, a API sobe no mesmo
processo Electron que carrega a única página com permissão de falar com ela. Por
padrão, `JWT_SECRET` e `ADMIN_ACCESS_KEY` são gerados aleatoriamente a cada boot (sem
`.env`); o widget pega a chave direto do processo que o subiu e faz login sozinho. Rotas
de leitura (listar portas, conexões, alertas, histórico) continuam abertas. Detalhes em
`apps/api/src/config/env.js`.

## Tempo real

`apps/web` conecta em `ws://.../ws` ao abrir e recebe um snapshot (portas + conexões +
alertas) sempre que algo muda, em vez de só ficar perguntando (`GET /api/ports`) a cada
5s. Se o WebSocket cair, volta a fazer polling automaticamente até reconectar — nenhum
dos dois lados depende do outro pra funcionar.

## Observabilidade local (Prometheus + Grafana + Redis, tudo opcional)

```
npm run dev            # API precisa estar rodando direto no Windows — ver ARCHITECTURE.md
docker compose up -d   # Prometheus + Grafana + Redis em containers
```

- Grafana em `http://localhost:3001` (sem login, dashboard "Port Manager" já
  provisionado). Prometheus em `http://localhost:9090`.
- Redis em `localhost:6380` — só some usar se `REDIS_URL` estiver setado no `.env` da
  API; sem isso, ela cacheia o snapshot de portas/conexões em memória mesmo (TTL curto,
  só pra não repetir `netstat` toda hora com o WebSocket + polling + checagem de
  alertas rodando juntos). Nunca é obrigatório.

`docker compose down` pra derrubar tudo.

## Testes

```
npm test                                  # apps/api
npm run test --workspace=apps/web         # unitários da UI (Vitest + jsdom)
npm run test:e2e --workspace=apps/web     # navegador real + API real
npm run test --workspace=apps/desktop     # Playwright do Electron
```
