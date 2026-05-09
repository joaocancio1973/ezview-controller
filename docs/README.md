# EzView - Documentacao Oficial

Este diretorio concentra a documentacao viva do SaaS `EzView - Gestor Condominial`.

Objetivos desta documentacao:

- registrar a arquitetura atual da aplicacao
- padronizar o trabalho entre os agentes da familia `Sinapse`
- manter regras de negocio visiveis e atualizadas
- documentar endpoints e contratos da API
- organizar a evolucao dos modulos do sistema

## Estrutura

- `agents/`
  - papeis oficiais dos agentes `Sinapse`
- `arquitetura.md`
  - visao geral da aplicacao, camadas e organizacao do projeto
- `mapa-visual-ezview.html`
  - organograma visual dos modulos, banco relacional e fluxo real da aplicacao
- `mapa-visual-ezview.md`
  - atalho textual para a versao visual em HTML
- `visao-fase2-ecossistema-ezview.html`
  - visao aspiracional e comercial da fase 2 do EzView como ecossistema de servicos
- `visao-fase2-ecossistema-ezview.md`
  - atalho textual para a versao visual da fase 2
- `relatorio-comercial-ezview.html`
  - relatorio executivo comercial do produto para leitura externa e PDF
- `relatorio-comercial-ezview.md`
  - atalho textual para a versao executiva comercial
- `github-integracao.md`
  - roteiro oficial para conectar o projeto ao GitHub
- `governanca-versionamento-git.md`
  - regras e preparacao do projeto para versionamento Git
- `automacao-local-git.md`
  - primeira camada de automacao local para checklist, hook e padrao de commit
- `vscode-setup.md`
  - configuracao recomendada do VSCode para trabalhar no projeto
- `regras-de-negocio.md`
  - regras funcionais que orientam permissoes, fluxos e escopo
- `estado-atual-dados.md`
  - fotografia inicial dos dados reais cadastrados no banco
- `endpoints/`
  - catalogo da API por dominio
- `modulos/`
  - descricao funcional dos modulos do SaaS
- `modulos/financeiro-cobrancas.md`
  - fase 1 do dominio financeiro e de cobrancas operacionais
- `modulos/financeiro-boletos-arquitetura.md`
  - arquitetura oficial do financeiro com boletos, webhook e notificacao automatica
- `endpoints/financeiro.md`
  - desenho inicial dos endpoints administrativos do financeiro

## Regra de manutencao

- sempre que um dominio for criado ou alterado, revisar sua documentacao
- comentarios no codigo devem ser curtos e usados apenas quando agregarem contexto real
- detalhes maiores devem viver nesta pasta `docs/`

## Estado atual

Neste momento, o sistema ja possui base funcional para:

- autenticacao
- setup inicial do super admin
- criacao e listagem de admins
- criacao e listagem de condominios por admin logado
- listagem global de usuarios para super admin
- dashboard SPA inicial com tema claro/escuro
- estrutura inicial de torres, unidades, areas comuns e reservas
- ativacao segura de moradores por convite
- veiculos e vagas de garagem com vinculo operacional

Proximo eixo operacional recomendado:

- funcionarios
  - vinculo unico por condominio
  - convite e ativacao segura
  - tela operacional propria
- controle de acesso
  - visitantes
  - prestadores
  - fila da portaria
  - eventos e auditoria
- [qa-checklist-fase-atual.md](C:/ezview-controller/docs/qa-checklist-fase-atual.md)

- modulo documentado: colaboradores da unidade
- modulo documentado: prestadores de servico
- modulo documentado: financeiro e cobrancas
- modulo documentado: ocorrencias e manutencao
- modulo documentado: manutencao e reformas
- modulo documentado: inbox interno
- modulo documentado: centro de ajuda e onboarding

- inbox da unidade
