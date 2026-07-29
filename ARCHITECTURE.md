# Port Manager — Arquitetura

Documento de referência. A ideia é consultar isso enquanto construímos, não ler de uma vez só.

## O que é

Um widget desktop (Electron, sempre visível) + uma API (Express) que listam e encerram
processos usando portas no Windows. A API segue arquitetura hexagonal com DDD tático,
pra ficar testável sem depender de Windows/rede/banco real nos testes de unidade.

## Estado atual das decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Empacotamento desktop | Electron | Reaproveita JS/Node, larga comunidade, custo de RAM/tamanho não importa pra uso pessoal |
| Gerenciador de monorepo | npm workspaces | Nativo, sem ferramenta extra pro tamanho do projeto |
| Test runner | Vitest | Mais rápido que Jest, boa integração com ESM |
| E2E do desktop | Playwright | Suporta Electron nativamente |
| Observabilidade | **Local por enquanto** | Grafana Cloud fica pra uma fase futura — o gateway já foi desenhado pra essa troca ser indolor |
| Docker | Não é dependência do core | Só entraria se decidirmos hospedar Prometheus/Loki/Grafana localmente, o que não é o plano agora |
| Persistência de portas protegidas | `PortProtectionRepositoryPort` (nova outbound port) | Faltava no desenho original; `PortProtectionPolicy` é imutável de propósito, então a config do usuário precisa de uma Port própria pra persistir |
| Portas protegidas em runtime | `KillPortUseCase` monta a `PortProtectionPolicy` a cada `execute()`, lendo do repository | Sem isso, proteger uma porta via `ProtectPortUseCase` só valeria depois de reiniciar o processo |

## Monorepo

```
port-manager/
├── package.json          <- raiz, define os workspaces
└── apps/
    ├── desktop/           <- Electron: janela sempre-no-topo, tray
    ├── web/               <- HTML/CSS/JS puro, renderizado dentro do Electron
    └── api/               <- Express + arquitetura hexagonal (detalhe abaixo)
```

## Arquitetura da API: hexagonal + DDD

Regra de ouro: **setas de dependência sempre apontam pra dentro**. `domain/` não importa
nada de `adapters/`. `application/` só conhece `domain/`. Quem depende de todo mundo são
os adapters, na borda.

```
apps/api/src/
├── domain/                          <- regra de negócio pura, zero I/O, zero framework
│   ├── entities/
│   │   └── PortUsage.js              <- tem identidade (porta + protocolo + pid)
│   ├── value-objects/
│   │   ├── PortNumber.js             <- imutável, se autovalida (1-65535)
│   │   ├── Protocol.js               <- TCP | UDP
│   │   └── ProcessId.js
│   ├── aggregates/
│   │   └── PortUsageAggregate.js     <- portão único pra mudanças consistentes
│   ├── services/
│   │   └── PortProtectionPolicy.js   <- regra que não pertence a UMA entidade só
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
│       │   ├── NotifierPort.js
│       │   └── ObservabilityGatewayPort.js
│       └── inbound/                   <- o que o mundo de fora PODE pedir
│           ├── ListPortsPort.js
│           ├── KillPortPort.js
│           ├── GetPortHistoryPort.js
│           └── ProtectPortPort.js
│
├── application/                     <- orquestra, nunca decide regra de negócio
│   ├── use-cases/
│   │   ├── ListPortsUseCase.js        <- implementa ListPortsPort
│   │   ├── KillPortUseCase.js         <- implementa KillPortPort
│   │   ├── GetPortHistoryUseCase.js   <- implementa GetPortHistoryPort
│   │   └── ProtectPortUseCase.js      <- implementa ProtectPortPort
│   ├── dto/
│   │   ├── PortDTO.js                  <- forma que sai pra fora (não é a entidade)
│   │   └── KillPortRequestDTO.js
│   └── mappers/
│       └── PortMapper.js               <- PortUsage (domínio) ↔ PortDTO
│
├── adapters/
│   ├── driving/                      <- adapters que CHAMAM a aplicação
│   │   └── http/
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── validators/             <- valida o request antes de virar DTO
│   │       └── swagger/
│   └── driven/                       <- adapters que a aplicação CHAMA
│       ├── os/
│       │   ├── WindowsPortInspectorAdapter.js   <- netstat/tasklist
│       │   └── UnixPortInspectorAdapter.js      <- lsof/ss
│       ├── process/
│       │   └── NodeProcessTerminatorAdapter.js  <- taskkill / process.kill
│       ├── persistence/
│       │   └── SqlitePortHistoryRepositoryAdapter.js
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
│   └── env.js
│
└── server.js
```

## Blocos de DDD usados

| Bloco | O que é | Onde mora aqui |
|---|---|---|
| Entity | Tem identidade própria, muda ao longo do tempo | `PortUsage` |
| Value Object | Definido pelo valor, imutável, sem identidade | `PortNumber`, `Protocol`, `ProcessId` |
| Aggregate | Agrupa entidades, único ponto de entrada pra mudanças consistentes | `PortUsageAggregate` |
| Domain Service | Regra de negócio que não pertence a uma entidade só | `PortProtectionPolicy` |
| Domain Event | Algo que aconteceu e outras partes podem reagir | `ProcessTerminatedEvent` |
| Domain Exception | Erro de regra de negócio, tipado (não é `Error` genérico) | `ProtectedPortError`, `InsufficientPrivilegeError` |
| Repository | Finge ser uma coleção do domínio (`save`, `findAll`) | `PortHistoryRepositoryPort`, `PortProtectionRepositoryPort` |
| Gateway | Espelha a API de um sistema externo de verdade | `ObservabilityGatewayPort` |

## Fluxo de uma requisição: matar uma porta

```
1. DELETE /api/ports/:port chega no controller (adapters/driving/http)
2. Validator confere o formato do request
3. Controller monta um KillPortRequestDTO e chama KillPortUseCase
4. KillPortUseCase:
   a. Pergunta pro PortInspectorPort quem está usando a porta
   b. Confere a trava fixa (PID 0/4 nunca pode) — não configurável
   c. Lê o PortProtectionRepositoryPort e monta uma PortProtectionPolicy fresca a cada
      chamada (assim, proteger uma porta via ProtectPortUseCase vale sem reiniciar o
      processo) — confere se a porta está protegida
   d. Se passou nas duas: chama ProcessTerminatorPort.kill(pid)
   e. Se o SO negar (sem privilégio): use case lança InsufficientPrivilegeError
   f. Se deu certo: dispara ProcessTerminatedEvent → grava histórico → registra log/métrica
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

## Observabilidade (status: local)

Hoje: `PinoLoggerAdapter` escreve logs estruturados localmente, `PromClientMetricsAdapter`
expõe `/metrics` em texto simples. O `ObservabilityGatewayPort` está implementado por um
`InMemoryObservabilityGateway` (usado em dev e nos testes).

Quando decidirmos ligar o Grafana Cloud: troca-se só a implementação injetada no
`composition-root.js` (`LokiCloudGateway` no lugar do `InMemory...`) — nenhum caso de uso
muda. Métricas (Prometheus remote_write) exigem protobuf+snappy, então usarão o
**Grafana Alloy** como agente local em vez de um gateway feito à mão.

## Estratégia de testes

| Camada | O que testa | Ferramenta | Velocidade |
|---|---|---|---|
| `domain/` | Entidades, value objects, `PortProtectionPolicy` | Vitest, sem mocks | Instantâneo |
| `application/` | Casos de uso, injetando fakes das ports | Vitest + dublês | Rápido |
| `adapters/driven/` | Adapters reais rodando comando de SO de verdade | Vitest | Mais lento |
| `adapters/driving/http` | Rotas Express respondendo certo | Supertest | Médio |
| API completa (e2e) | Sobe processo real, lista, mata, confere histórico | Supertest + processo real | Lento, poucos |
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
