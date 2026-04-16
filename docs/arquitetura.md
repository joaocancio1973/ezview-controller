# Arquitetura Atual

## Visao geral

O `EzView - Gestor Condominial` esta sendo construido como um SaaS com backend em Node.js/Express, banco MySQL e frontend em HTML, CSS e JavaScript puro, organizado em uma SPA progressiva.

## Camadas principais

### Backend

Local: `backend/src/`

Responsabilidades:

- expor a API HTTP
- aplicar autenticacao e autorizacao
- implementar regras de negocio
- acessar o banco de dados

Estrutura atual:

- `routes/`
  - registro das rotas por dominio
- `controllers/`
  - camada HTTP
- `services/`
  - regras de negocio e consultas reutilizaveis
- `middlewares/`
  - autenticacao e restricoes por perfil
- `config/`
  - conexao com banco e configuracoes base

### Frontend

Local: `frontend/`

Responsabilidades:

- renderizar a SPA atual
- controlar menus por perfil
- consumir a API
- exibir dashboards, tabelas e modais

Estrutura atual:

- `pages/dashboard.html`
  - shell principal da SPA
- `pages/login.html`
  - pagina de autenticacao
- `js/dashboard-super-admin.js`
  - logica principal da SPA atual
- `js/login.js`
  - fluxo de login
- `css/dashboard-super-admin2.css`
  - folha oficial de estilo da SPA
- `css/style2.css`
  - folha oficial de estilo do login

## Perfis atuais

- `super_admin`
  - gerencia admins
  - visualiza usuarios globais
- `admin`
  - gerencia condominios do proprio contexto
  - gerencia a estrutura e a operacao do proprio ecossistema condominial
- `morador`
  - opera apenas o proprio contexto de unidade
  - ja possui leitura inicial de areas comuns e reservas
- `funcionario`
  - entra como proximo perfil operacional estruturado
  - deve atuar apenas dentro do condominio do seu vinculo

## Proximo eixo operacional

O proximo bloco recomendado para implementacao e composto por:

- `funcionarios`
- `controle de acesso`

Justificativa:

- esse eixo abre a rotina real da portaria e da guarita
- ele depende da base ja consolidada de condominios, unidades, moradores e reservas
- ele prepara o terreno para visitantes, prestadores, QR Code, alertas e trilha de auditoria

## Padrao atual de implementacao

Ao criar um novo dominio:

1. criar rota em `routes/`
2. criar controller HTTP em `controllers/`
3. criar service em `services/` quando houver regra ou consulta reutilizavel
4. integrar o endpoint no frontend apenas se o fluxo ja estiver definido
5. documentar o dominio em `docs/endpoints/` e `docs/modulos/`

## Nota tecnica sobre unidades

A tabela `unidades` possui hoje tres regras de unicidade:

- `uk_unidade_condominio (condominio_id, identificacao)`
- `uk_unidade_torre (torre_id, identificacao)`
- `uk_unidade_logica (condominio_id, torre_id, identificacao)`

Essa combinacao deve ser revisada antes do CRUD definitivo de unidades, porque pode introduzir redundancia e restricoes conflitantes dependendo do tipo de condominio.

Direcao recomendada:

- se houver `torre_id`, tratar a unidade como unica por `torre_id + identificacao`
- se nao houver `torre_id`, tratar a unidade como unica por `condominio_id + identificacao`

A decisao final deve ser refletida em migracao especifica quando o modulo de `Estrutura Condominial` entrar em implementacao.
