# PortWarden

Widget desktop (Electron) + API (Express, arquitetura hexagonal) que lista e encerra
processos usando portas no Windows. Detalhes de arquitetura em [ARCHITECTURE.md](ARCHITECTURE.md).

## Rodando o widget

```
npm install
npm start
```

Sobe a janela Electron (sempre no topo) com a API já embutida no mesmo processo —
nada mais precisa estar rodando antes.

## Rodando só a API (desenvolvimento do backend)

```
npm run dev
```

Sobe em `http://localhost:3000` (configurável via `apps/api/.env`, veja `.env.example`).
Docs interativas em `http://localhost:3000/api-docs`, métricas Prometheus em `/metrics`.

## Observabilidade local (Prometheus + Grafana)

```
npm run dev            # API precisa estar rodando direto no Windows — ver ARCHITECTURE.md
docker compose up -d   # Prometheus + Grafana em containers
```

Grafana em `http://localhost:3001` (sem login, dashboard "Port Manager" já
provisionado). Prometheus em `http://localhost:9090`. `docker compose down` pra
derrubar.

## Testes

```
npm test                                  # apps/api
npm run test --workspace=apps/web         # unitários da UI (Vitest + jsdom)
npm run test:e2e --workspace=apps/web     # navegador real + API real
npm run test --workspace=apps/desktop     # Playwright do Electron
```
