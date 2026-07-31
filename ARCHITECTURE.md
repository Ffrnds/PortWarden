# Port Manager — Arquitetura

Documento de referência. A ideia é consultar isso enquanto construímos, não ler de uma vez só.

## O que é

Um widget desktop (Electron, sempre visível) + uma API (Express) que listam e encerram
processos usando portas no Windows, mostram conexões de saída (com reverse DNS + GeoIP),
alertam sobre atividade suspeita e atualizam em tempo real via WebSocket. A API segue
arquitetura hexagonal com DDD tático, pra ficar testável sem depender de Windows/rede/
banco real nos testes de unidade.

## Estado atual das decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Empacotamento desktop | Electron | Reaproveita JS/Node, larga comunidade, custo de RAM/tamanho não importa pra uso pessoal |
| Gerenciador de monorepo | npm workspaces | Nativo, sem ferramenta extra pro tamanho do projeto |
| Test runner | Vitest | Mais rápido que Jest, boa integração com ESM |
| E2E do desktop | Playwright | Suporta Electron nativamente |
| Observabilidade | **Local por enquanto** | Grafana Cloud fica pra uma fase futura — o gateway já foi desenhado pra essa troca ser indolor |
| Docker | Prometheus + Grafana + Redis (`docker-compose.yml`), nunca pra API | A API precisa rodar direto no Windows host pra `netstat`/`tasklist`/`taskkill` funcionarem de verdade — um container (Linux ou Windows) é isolado do namespace de processos/rede do host, então não conseguiria listar nem matar processos reais. Prometheus faz scrape do `/metrics` via `host.docker.internal:3000` |
| Persistência de portas protegidas | `PortProtectionRepositoryPort` (nova outbound port) | Faltava no desenho original; `PortProtectionPolicy` é imutável de propósito, então a config do usuário precisa de uma Port própria pra persistir |
| Portas protegidas em runtime | `KillPortUseCase` monta a `PortProtectionPolicy` a cada `execute()`, lendo do repository | Sem isso, proteger uma porta via `ProtectPortUseCase` só valeria depois de reiniciar o processo |
| `apps/web` servido por HTTP, não `file://` | `apps/desktop/src/main.js` sobe um segundo Express (só `express.static`), `loadURL()` em vez de `loadFile()` | Chromium bloqueia `<script type="module">` carregado via `file://` (CORS). Ficou fora de `apps/api` de propósito — a API continua uma REST API pura, sem virar servidor de frontend |
| Conexões de saída em aba separada | `OutboundConnection` (entidade própria, não reaproveita `PortUsage`) | "Portas que eu abri" (LISTENING) e "quem meus processos estão chamando" (ESTABLISHED) são perguntas diferentes; misturar as duas na mesma lista ficava confuso |
| Reverse DNS + GeoIP em conexões de saída | `dns.promises.reverse()` (built-in) + `geoip-lite` (banco local, sem chamada de rede) | Best-effort, nunca bloqueia a resposta — timeout curto no DNS, IP sem PTR/fora do banco GeoIP só fica sem hostname/país |
| Autenticação | JWT efêmero por processo (`jsonwebtoken`), sem banco de usuário | Ferramenta de uso único: a API sobe no mesmo processo Electron que carrega a única página com permissão de falar com ela. `JWT_SECRET`/`ADMIN_ACCESS_KEY` são aleatórios a cada boot por padrão (`env.js`); o widget pega a chave direto do processo e loga sozinho — nunca tem tela de senha. Só as rotas que mudam estado (kill/protect/unprotect) exigem token; leitura fica aberta |
| Rate limiting | `express-rate-limit`, dois níveis (geral em `/api`, mais apertado só no kill) | Equivalente Express de `@nestjs/throttler`. É uma ferramenta pessoal de instância única, então o limite é generoso — o objetivo é pegar um cliente com bug em loop, não se defender de abuso externo |
| Tempo real | WebSocket (`ws`) em `/ws`, snapshot completo (portas + conexões + alertas) por conexão + a cada 5s | Equivalente Express de `@nestjs/websockets`. `apps/web` pausa o polling por HTTP enquanto o socket está aberto e volta a fazer polling sozinho se ele cair — nenhum dos dois lados depende do outro pra funcionar |
| Cache do snapshot de portas | `CachingPortInspectorAdapter` (decorator sobre `PortInspectorPort`), TTL curto (2s), Redis opcional via `REDIS_URL` (fallback: em memória) | `netstat`/`tasklist` é a coisa mais cara que a API faz (segundos, sob carga) — com WebSocket + polling de fallback + checagem de alertas todos pedindo o mesmo snapshot, o cache evita repetir o trabalho dentro da mesma janela. `KillPortUseCase` usa o `PortInspectorPort` cru (nunca cacheado) e invalida o cache depois de matar um processo, pra não devolver uma lista desatualizada logo em seguida |
| Alertas de atividade suspeita | `SuspiciousActivityPolicy` (domain service, lista fixa de portas historicamente associadas a malware/backdoor) | Pattern matching básico contra uma lista estática, não é threat intel de verdade — existe pra chamar atenção pro óbvio, não pra ser um produto de segurança |

## Monorepo

```
port-manager/
├── package.json          <- raiz, define os workspaces
├── design/               <- mockups e referências visuais, não roda no app
├── docker-compose.yml    <- Prometheus + Grafana + Redis, tudo opcional (ver decisões acima)
├── docker/
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/    <- datasource + dashboard já pré-configurados, sem passo manual na UI
└── apps/
    ├── desktop/           <- Electron: janela sempre-no-topo, tray, servidor estático de apps/web
    ├── web/               <- HTML/CSS/ES modules, servido por HTTP (não file://) pelo desktop
    │   ├── assets/          <- logo e outros assets estáticos (SVG, ícones)
    │   ├── src/
    │   │   ├── main.js        <- orquestração/wiring (equivalente ao server.js + composition-root da API)
    │   │   ├── api/            <- fala com o backend via fetch() (equivalente a adapters/driven)
    │   │   ├── realtime/       <- cliente WebSocket (portsSocket.js), com reconexão e fallback pro polling
    │   │   └── ui/             <- lógica pura de renderização/formatação, testável sem navegador
    │   └── tests/
    │       ├── unit/            <- Vitest + jsdom, sem rede real
    │       └── e2e/             <- Playwright, navegador real + API real
    └── api/               <- Express + arquitetura hexagonal (detalhe abaixo)
```

## Arquitetura da API: hexagonal + DDD

Regra de ouro: **setas de dependência sempre apontam pra dentro**. `domain/` não importa
nada de `adapters/`. `application/` só conhece `domain/`. Quem depende de todo mundo são
os adapters, na borda.

Duas exceções pragmáticas, deliberadas: `/metrics`, `/health/*` e o guard de auth são
conectados direto em `server.js` a adapters concretos (não viram Ports/use cases) — são
preocupações operacionais sobre os próprios adapters, não regra de negócio. Ver seções
"Observabilidade" e "Autenticação" abaixo.

```
apps/api/src/
├── domain/                          <- regra de negócio pura, zero I/O, zero framework
│   ├── entities/
│   │   ├── PortUsage.js               <- tem identidade (porta + protocolo + pid); inclui executablePath
│   │   └── OutboundConnection.js      <- "quem esse processo está chamando" (remoto, reverse DNS, GeoIP)
│   ├── value-objects/
│   │   ├── PortNumber.js             <- imutável, se autovalida (1-65535)
│   │   ├── Protocol.js               <- TCP | UDP
│   │   └── ProcessId.js
│   ├── aggregates/
│   │   └── PortUsageAggregate.js     <- portão único pra mudanças consistentes
│   ├── services/
│   │   ├── PortProtectionPolicy.js       <- regra que não pertence a UMA entidade só
│   │   └── SuspiciousActivityPolicy.js   <- pattern matching contra portas suspeitas conhecidas
│   ├── events/
│   │   └── ProcessTerminatedEvent.js <- disparado quando um processo é morto
│   ├── exceptions/
│   │   ├── ProtectedPortError.js
│   │   └── InsufficientPrivilegeError.js
│   └── ports/
│       ├── outbound/                  <- o que o domínio EXIGE de fora
│       │   ├── PortInspectorPort.js
│       │   ├── ProcessTerminatorPort.js
│       │   ├── PortHistoryRepositoryPort.js
│       │   ├── PortProtectionRepositoryPort.js  <- persiste as portas protegidas configuradas pelo usuário
│       │   ├── NotifierPort.js                  <- toast nativo do Windows (usado pelos alertas)
│       │   ├── ObservabilityGatewayPort.js
│       │   └── CachePort.js                     <- get/set com TTL; Redis ou em memória por trás
│       └── inbound/                   <- o que o mundo de fora PODE pedir
│           ├── ListPortsPort.js
│           ├── KillPortPort.js
│           ├── GetPortHistoryPort.js
│           ├── ProtectPortPort.js
│           ├── UnprotectPortPort.js
│           ├── ListProtectedPortsPort.js
│           ├── ListOutboundConnectionsPort.js
│           └── DetectSuspiciousActivityPort.js
│
├── application/                     <- orquestra, nunca decide regra de negócio
│   ├── use-cases/
│   │   ├── ListPortsUseCase.js               <- implementa ListPortsPort (lê via cache)
│   │   ├── KillPortUseCase.js                <- implementa KillPortPort (lê sem cache, invalida ao matar)
│   │   ├── GetPortHistoryUseCase.js          <- implementa GetPortHistoryPort
│   │   ├── ProtectPortUseCase.js             <- implementa ProtectPortPort
│   │   ├── UnprotectPortUseCase.js           <- implementa UnprotectPortPort
│   │   ├── ListProtectedPortsUseCase.js      <- implementa ListProtectedPortsPort
│   │   ├── ListOutboundConnectionsUseCase.js <- implementa ListOutboundConnectionsPort
│   │   └── DetectSuspiciousActivityUseCase.js <- roda a SuspiciousActivityPolicy, notifica 1x por achado
│   ├── dto/
│   │   ├── PortDTO.js
│   │   ├── KillPortRequestDTO.js
│   │   ├── OutboundConnectionDTO.js
│   │   └── AlertDTO.js
│   └── mappers/
│       ├── PortMapper.js               <- PortUsage (domínio) ↔ PortDTO
│       ├── OutboundConnectionMapper.js
│       └── AlertMapper.js
│
├── adapters/
│   ├── driving/                      <- adapters que CHAMAM a aplicação
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── auth/                   <- createLoginController (emite JWT) + createAuthGuard (middleware)
│   │   │   ├── validators/             <- valida o request antes de virar DTO
│   │   │   ├── createRateLimiters.js   <- express-rate-limit, geral + kill
│   │   │   └── swagger/
│   │   └── websocket/
│   │       └── createPortsWebSocketServer.js  <- push do snapshot (ver decisão "Tempo real")
│   └── driven/                       <- adapters que a aplicação CHAMA
│       ├── os/
│       │   ├── WindowsPortInspectorAdapter.js   <- netstat/tasklist/PowerShell; reverse DNS + GeoIP
│       │   └── UnixPortInspectorAdapter.js      <- ss; mesma paridade, não verificado (sem Linux aqui)
│       ├── process/
│       │   └── NodeProcessTerminatorAdapter.js  <- taskkill / process.kill
│       ├── persistence/
│       │   ├── SqlitePortHistoryRepositoryAdapter.js
│       │   └── SqlitePortProtectionRepositoryAdapter.js
│       ├── cache/
│       │   ├── CachingPortInspectorAdapter.js   <- decorator: cacheia listActivePorts/listOutboundConnections
│       │   ├── InMemoryCacheAdapter.js          <- padrão quando REDIS_URL não está setado
│       │   └── RedisCacheAdapter.js             <- opt-in; fail-open (erro de conexão = cache miss, nunca derruba a API)
│       ├── notification/
│       │   └── WindowsNotifierAdapter.js
│       ├── logging/
│       │   └── PinoLoggerAdapter.js
│       ├── metrics/
│       │   └── PromClientMetricsAdapter.js
│       └── gateways/                              <- acesso a sistemas externos
│           ├── InMemoryObservabilityGateway.js     <- usado em dev/teste, hoje
│           └── LokiCloudGateway.js                 <- pronto, mas não usado ainda
│
├── config/
│   ├── composition-root.js          <- monta as dependências (DI manual)
│   └── env.js                       <- porta, banco, jwtSecret/adminAccessKey, redisUrl
│
└── server.js
```

## Blocos de DDD usados

| Bloco | O que é | Onde mora aqui |
|---|---|---|
| Entity | Tem identidade própria, muda ao longo do tempo | `PortUsage`, `OutboundConnection` |
| Value Object | Definido pelo valor, imutável, sem identidade | `PortNumber`, `Protocol`, `ProcessId` |
| Aggregate | Agrupa entidades, único ponto de entrada pra mudanças consistentes | `PortUsageAggregate` |
| Domain Service | Regra de negócio que não pertence a uma entidade só | `PortProtectionPolicy`, `SuspiciousActivityPolicy` |
| Domain Event | Algo que aconteceu e outras partes podem reagir | `ProcessTerminatedEvent` |
| Domain Exception | Erro de regra de negócio, tipado (não é `Error` genérico) | `ProtectedPortError`, `InsufficientPrivilegeError` |
| Repository | Finge ser uma coleção do domínio (`save`, `findAll`) | `PortHistoryRepositoryPort`, `PortProtectionRepositoryPort` |
| Gateway | Espelha a API de um sistema externo de verdade | `ObservabilityGatewayPort` |

Fora do vocabulário clássico de DDD, mas no mesmo espírito de "Port por trás de uma
interface": `CachingPortInspectorAdapter` é um **Decorator** — implementa
`PortInspectorPort` só que envolvendo outra implementação da mesma Port, sem o resto do
sistema saber a diferença.

## Fluxo de uma requisição: matar uma porta

```
1. DELETE /api/ports/:port chega no createAuthGuard (verifica o JWT) e no rate limiter
2. Controller (adapters/driving/http) valida o formato do request
3. Controller monta um KillPortRequestDTO e chama KillPortUseCase
4. KillPortUseCase:
   a. Pergunta pro PortInspectorPort (sem cache) quem está usando a porta
   b. Confere a trava fixa (PID 0/4 nunca pode) — não configurável
   c. Lê o PortProtectionRepositoryPort e monta uma PortProtectionPolicy fresca a cada
      chamada (assim, proteger uma porta via ProtectPortUseCase vale sem reiniciar o
      processo) — confere se a porta está protegida
   d. Se passou nas duas: chama ProcessTerminatorPort.kill(pid)
   e. Se o SO negar (sem privilégio): use case lança InsufficientPrivilegeError
   f. Se deu certo: invalida o cache do snapshot, dispara ProcessTerminatedEvent → grava
      histórico → registra log/métrica
5. Controller traduz o resultado (ou exceção) pra uma resposta HTTP
```

## Elevação de privilégio (admin no Windows)

- **Trava fixa, não configurável**: PID 0 e PID 4 (Idle/System) nunca podem ser mortos,
  mesmo com admin — matar o System pode travar o Windows. Isso é checado antes de
  qualquer outra coisa, dentro do próprio `KillPortUseCase`.
- **Elevação sob demanda**: se o `taskkill` normal falhar por permissão, o adapter lança
  `InsufficientPrivilegeError`. O widget oferece um botão "tentar como administrador",
  que aciona um UAC só daquele comando específico (`Start-Process ... -Verb RunAs`),
  nunca o app inteiro rodando elevado.
- Esse fluxo de UAC real **não entra no CI** (é uma tela nativa esperando clique humano)
  — testamos com um `ProcessTerminatorPort` fake simulando o erro.

## Autenticação

Não tem cadastro de usuário: esta é uma ferramenta de uso pessoal, e a API sobe no mesmo
processo Electron que carrega a única página com permissão de falar com ela
(`apps/desktop/src/main.js`). `env.js` gera `jwtSecret` e `adminAccessKey` aleatórios a
cada boot por padrão (`JWT_SECRET`/`ADMIN_ACCESS_KEY` no `.env` fixam um valor, só
necessário se o token precisar sobreviver a um restart).

- `apps/desktop/src/main.js` pega `adminAccessKey` de volta do `createApp()` e passa pra
  página carregada via query string, do mesmo jeito que já fazia com `apiPort`.
- `apps/web` chama `POST /api/auth/login` sozinho ao abrir e guarda o JWT em memória —
  nunca aparece uma tela de senha pro usuário.
- `createAuthGuard` (middleware Express, equivalente a um Nest Guard) protege só as
  rotas que mudam estado: `DELETE /ports/:port`, `PUT`/`DELETE /protection/:port`.
  Leitura (`GET`) e o push do WebSocket continuam abertos.
- Um login que falha só trava as ações de escrita no widget — a lista continua
  funcionando (fail-open no lado da UI, pelo mesmo motivo que o resto do app trata
  qualquer coisa não-essencial: melhor mostrar dado que travar tudo).

## Observabilidade (status: local)

Hoje: `PinoLoggerAdapter` escreve logs estruturados localmente, `PromClientMetricsAdapter`
expõe `/metrics` em texto simples. O `ObservabilityGatewayPort` está implementado por um
`InMemoryObservabilityGateway` (usado em dev e nos testes).

Wiring de verdade fica em `server.js` (não em `composition-root.js`, já que log/métricas
não são Ports de domínio): `createRequestLogger` loga todo request (método, path, status,
duração), `createErrorHandler` loga o `stack` só quando o erro é inesperado (500 — os
outros já são resultado de negócio conhecido), e `GET /metrics` expõe o registry do
Prometheus. `KillPortUseCase` bem-sucedido incrementa o contador de processos encerrados
via `createKillPortController`. `GET /health/live` e `/health/ready` (esse último checa
o SQLite com um `SELECT 1`) seguem a mesma convenção liveness/readiness do Kubernetes —
equivalente Express do que `@nestjs/terminus` dá de graça no Nest.

Quando decidirmos ligar o Grafana Cloud: troca-se só a implementação injetada no
`composition-root.js` (`LokiCloudGateway` no lugar do `InMemory...`) — nenhum caso de uso
muda. Métricas (Prometheus remote_write) exigem protobuf+snappy, então usarão o
**Grafana Alloy** como agente local em vez de um gateway feito à mão.

**Grafana local (hoje, via Docker):** `docker compose up -d` na raiz sobe Prometheus
(faz scrape de `http://host.docker.internal:3000/metrics` — a API continua rodando
direto no Windows, não em container, ver decisão sobre Docker acima) e Grafana em
`http://localhost:3001`, já com o datasource e um dashboard ("Port Manager": total de
processos encerrados, CPU/memória do processo Node) provisionados — não precisa
configurar nada na UI. Login anônimo como Admin habilitado só por conveniência local
(`docker-compose.yml`); reavaliar se isso algum dia sair do `localhost`. O mesmo
`docker-compose.yml` sobe um serviço `redis` opcional (host `6380`) pro cache — ver
decisão "Cache do snapshot de portas" na tabela acima.

## Estratégia de testes

| Camada | O que testa | Ferramenta | Velocidade |
|---|---|---|---|
| `domain/` | Entidades, value objects, `PortProtectionPolicy`, `SuspiciousActivityPolicy` | Vitest, sem mocks | Instantâneo |
| `application/` | Casos de uso, injetando fakes das ports | Vitest + dublês | Rápido |
| `adapters/driven/` | Adapters reais rodando comando de SO/DB de verdade | Vitest | Mais lento |
| `adapters/driven/cache` | `RedisCacheAdapter` fail-open (endereço morto) + contra um Redis real (container Docker descartável, sobe/derruba no próprio teste) | Vitest | Fail-open: rápido. Redis real: mais lento |
| `adapters/driving/http` | Rotas Express respondendo certo, incluindo o guard de auth e rate limit | Supertest | Médio |
| `adapters/driving/websocket` | Servidor WS real (http.Server + cliente `ws` de verdade) | Vitest | Médio |
| API completa (e2e) | Sobe processo real, lista, mata, confere histórico | Supertest + processo real | Lento, poucos |
| `apps/web` e2e | Navegador real + API real, incluindo login JWT e o snapshot via WebSocket | Playwright | Lento |
| `apps/desktop` | Janela, tray, clique no botão de encerrar | Playwright | Lento, poucos |

## Convenção de nomes (pra não esquecer no meio do código)

- `*Port.js` → interface/contrato (vive em `domain/ports`)
- `*Adapter.js` → implementação concreta de um port (vive em `adapters/`)
- `*UseCase.js` → orquestra um fluxo (vive em `application/use-cases`)
- `*DTO.js` → formato de dado que atravessa a fronteira HTTP
- `*Mapper.js` → converte entre entidade de domínio e DTO
- `*Error.js` → exceção de domínio, tipada
- `*Gateway.js` → acesso a sistema externo (Grafana Cloud, etc.)
- `*Policy.js` → regra de negócio que não é específica de uma entidade
