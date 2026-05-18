const STATUS_FINANCEIRO_LABELS = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  emitido: "Emitido",
  em_analise: "Em analise",
  pago: "Pago",
  isento: "Isento",
  cancelado: "Cancelado",
  rejeitado: "Rejeitado",
  vencido: "Vencido",
};

const ORIGEM_FINANCEIRO_LABELS = {
  reserva: "Reserva",
  taxa_condominial: "Taxa condominial",
  mensalidade: "Mensalidade",
  multa: "Multa",
  avulso: "Avulso",
};

const financeiroState = {
  cobrancas: [],
  responsaveis: [],
  resumo: {},
  paginacao: {
    pagina_atual: 1,
    limite: 25,
    total_registros: 0,
    total_paginas: 1,
    possui_anterior: false,
    possui_proxima: false,
  },
};

function formatarStatusFinanceiro(status) {
  return STATUS_FINANCEIRO_LABELS[status] || status || "-";
}

function formatarOrigemFinanceira(origem) {
  return ORIGEM_FINANCEIRO_LABELS[origem] || origem || "-";
}

function buildStatusFinanceiroBadge(status) {
  const classe =
    status === "pago" || status === "isento" ? "status-ativo" :
    status === "cancelado" || status === "rejeitado" || status === "vencido" ? "status-inativo" :
    "status-pendente";

  return `<span class="status-badge ${classe}">${formatarStatusFinanceiro(status)}</span>`;
}

function formatarSituacaoResponsavelFinanceiro(situacao) {
  const mapa = {
    elegivel: "Elegivel",
    pendente: "Pendente",
    nao_configurado: "Nao configurado",
  };
  return mapa[situacao] || "Pendente";
}

function buildSituacaoResponsavelBadge(situacao) {
  const classe =
    situacao === "elegivel" ? "status-ativo" :
    situacao === "nao_configurado" ? "status-inativo" :
    "status-pendente";
  return `<span class="status-badge ${classe}">${formatarSituacaoResponsavelFinanceiro(situacao)}</span>`;
}

function buildOcupacaoFinanceiraBadge(situacao) {
  if (situacao === "ocupada") {
    return `<span class="status-badge status-ativo">Ocupada</span>`;
  }
  return `<span class="status-badge status-inativo">Sem moradores</span>`;
}

function formatarValorFinanceiro(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatarDataCurtaFinanceiro(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function getFinanceiroFiltrosAtuais() {
  return {
    condominio_id: document.getElementById("financeiroCondominioFilter")?.value || "",
    status: document.getElementById("financeiroStatusFilter")?.value || "",
    origem: document.getElementById("financeiroOrigemFilter")?.value || "",
    vencimento_de: document.getElementById("financeiroVencimentoDe")?.value || "",
    vencimento_ate: document.getElementById("financeiroVencimentoAte")?.value || "",
    busca: document.getElementById("financeiroBuscaInput")?.value?.trim() || "",
    pagina: financeiroState.paginacao.pagina_atual || 1,
    limite: document.getElementById("financeiroLimiteFilter")?.value || financeiroState.paginacao.limite || 25,
  };
}

async function buscarCobrancasFinanceiras(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const response = await fetch(`http://localhost:3000/financeiro/cobrancas${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar as cobrancas");
  }

  return payload;
}

async function buscarDetalheCobrancaFinanceira(id) {
  const response = await fetch(`http://localhost:3000/financeiro/cobrancas/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar o detalhe da cobranca");
  }

  return payload;
}

async function buscarResponsaveisFinanceiros(condominioId, busca = "") {
  const query = new URLSearchParams();
  if (condominioId) query.set("condominio_id", condominioId);
  if (busca) query.set("busca", busca);

  const response = await fetch(`http://localhost:3000/financeiro/responsaveis?${query.toString()}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar responsaveis financeiros");
  }

  return payload;
}

async function buscarOpcoesResponsavelFinanceiro(unidadeId) {
  const response = await fetch(`http://localhost:3000/financeiro/unidades/${encodeURIComponent(unidadeId)}/responsavel-opcoes`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar as opcoes da unidade");
  }

  return payload;
}

async function salvarResponsavelFinanceiro(payload) {
  const response = await fetch("http://localhost:3000/financeiro/responsaveis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel salvar o responsavel financeiro");
  }
  return data;
}

function renderFinanceiro(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (user?.perfil !== "admin") {
    renderDashboard(container);
    return;
  }

  financeiroState.paginacao = {
    pagina_atual: 1,
    limite: 25,
    total_registros: 0,
    total_paginas: 1,
    possui_anterior: false,
    possui_proxima: false,
  };

  container.innerHTML = `
    <div class="page-header acessos-page-header financeiro-page-header">
      <div class="page-heading-group">
        <h2>Financeiro</h2>
        <div class="page-subtitle">Cobrancas operacionais do condominio com foco em reservas e validacao administrativa.</div>
      </div>
      <div class="page-heading-actions financeiro-heading-actions">
        <button type="button" class="btn-secondary-soft" id="btnFinanceiroImprimir">Imprimir / PDF</button>
      </div>
    </div>

    <div class="panel financeiro-panel">
      <div class="filters-grid compact financeiro-filters-grid">
        <label>Condominio
          <select id="financeiroCondominioFilter">
            <option value="">Carregando condominios...</option>
          </select>
        </label>
        <label>Status
          <select id="financeiroStatusFilter">
            <option value="">Todos</option>
            ${Object.entries(STATUS_FINANCEIRO_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
        <label>Origem
          <select id="financeiroOrigemFilter">
            <option value="">Todas</option>
            ${Object.entries(ORIGEM_FINANCEIRO_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
        <label>Vencimento de
          <input type="date" id="financeiroVencimentoDe" />
        </label>
        <label>Vencimento ate
          <input type="date" id="financeiroVencimentoAte" />
        </label>
      </div>

      <div class="financeiro-toolbar-inline">
        <label class="financeiro-toolbar-search">
          <span>Busca</span>
          <input type="search" id="financeiroBuscaInput" placeholder="Referencia, unidade, morador ou condominio" />
        </label>
        <label class="financeiro-toolbar-limit">
          <span>Por pagina</span>
          <select id="financeiroLimiteFilter">
            <option value="10">10</option>
            <option value="25" selected>25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>

      <div class="financeiro-inline-summary" id="financeiroResumoInline">
        <span class="financeiro-mini-chip">Total: -</span>
        <span class="financeiro-mini-chip">Pendentes: -</span>
        <span class="financeiro-mini-chip">Em analise: -</span>
        <span class="financeiro-mini-chip">Pagas: -</span>
        <span class="financeiro-mini-chip">Vencidas: -</span>
      </div>
    </div>

    <div class="panel financeiro-responsavel-panel">
      <div class="financeiro-section-head">
        <div>
          <h3>Responsavel financeiro da unidade</h3>
          <p>Defina quem recebe a cobranca oficial e acompanhe a elegibilidade por unidade.</p>
        </div>
        <button type="button" class="btn-secondary-soft" id="btnFinanceiroResponsavelRefresh">Atualizar</button>
      </div>
      <div class="financeiro-responsavel-table-wrap">
        <table class="funcionarios-table financeiro-table financeiro-responsavel-table" id="financeiroResponsaveisTable">
          <thead>
            <tr>
              <th>Unidade</th>
              <th>Responsavel</th>
              <th>Contato</th>
              <th>Cobranca</th>
              <th>Ambiente</th>
              <th>Atualizacao</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="7">Carregando responsaveis financeiros...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel funcionarios-panel financeiro-table-panel">
      <table class="funcionarios-table financeiro-table" id="financeiroTable">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Unidade</th>
            <th>Origem</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Vencimento</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="7">Carregando cobrancas...</td></tr>
        </tbody>
      </table>

      <div class="financeiro-pagination" id="financeiroPagination">
        <button type="button" class="btn-secondary-soft" id="financeiroPrevBtn">Anterior</button>
        <div class="financeiro-pagination-info" id="financeiroPaginationInfo">Pagina 1 de 1</div>
        <button type="button" class="btn-secondary-soft" id="financeiroNextBtn">Proxima</button>
      </div>
    </div>

    <div id="modalFinanceiro" class="modal-overlay hidden"></div>
  `;

  [
    "financeiroCondominioFilter",
    "financeiroStatusFilter",
    "financeiroOrigemFilter",
    "financeiroVencimentoDe",
    "financeiroVencimentoAte",
    "financeiroLimiteFilter",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      financeiroState.paginacao.pagina_atual = 1;
      if (id === "financeiroCondominioFilter") {
        carregarResponsaveisFinanceirosAdmin();
      }
      carregarFinanceiroAdmin();
    });
  });

  document.getElementById("financeiroBuscaInput")?.addEventListener("input", () => {
    clearTimeout(window.__financeiroBuscaTimer);
    window.__financeiroBuscaTimer = setTimeout(() => {
      financeiroState.paginacao.pagina_atual = 1;
      carregarFinanceiroAdmin();
    }, 260);
  });

  document.getElementById("btnFinanceiroImprimir")?.addEventListener("click", imprimirRelatorioFinanceiro);
  document.getElementById("btnFinanceiroResponsavelRefresh")?.addEventListener("click", carregarResponsaveisFinanceirosAdmin);
  document.querySelector("#financeiroResponsaveisTable tbody")?.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-financeiro-responsavel");
    if (!button) return;
    abrirModalResponsavelFinanceiro(button.dataset.unidadeId);
  });
  document.getElementById("financeiroPrevBtn")?.addEventListener("click", () => {
    if (financeiroState.paginacao.pagina_atual > 1) {
      financeiroState.paginacao.pagina_atual -= 1;
      carregarFinanceiroAdmin();
    }
  });
  document.getElementById("financeiroNextBtn")?.addEventListener("click", () => {
    if (financeiroState.paginacao.pagina_atual < (financeiroState.paginacao.total_paginas || 1)) {
      financeiroState.paginacao.pagina_atual += 1;
      carregarFinanceiroAdmin();
    }
  });

  carregarContextoFinanceiroAdmin();
}

async function carregarContextoFinanceiroAdmin() {
  const select = document.getElementById("financeiroCondominioFilter");
  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();
    select.innerHTML = `<option value="">Selecione um condominio</option>${condominios.map((item) => `<option value="${item.id}">${item.nome_fantasia}</option>`).join("")}`;
    if (condominios.length) {
      select.value = condominios[0].id;
      await carregarResponsaveisFinanceirosAdmin();
      await carregarFinanceiroAdmin();
    }
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    showToast("Erro ao carregar contexto financeiro", "error");
  }
}

async function carregarResponsaveisFinanceirosAdmin() {
  const tbody = document.querySelector("#financeiroResponsaveisTable tbody");
  const condominioId = document.getElementById("financeiroCondominioFilter")?.value || "";
  if (!tbody || !condominioId) return;

  tbody.innerHTML = `<tr><td colspan="7">Carregando responsaveis financeiros...</td></tr>`;

  try {
    const payload = await buscarResponsaveisFinanceiros(condominioId);
    const itens = Array.isArray(payload?.itens) ? payload.itens : [];
    financeiroState.responsaveis = itens;

    if (!itens.length) {
      tbody.innerHTML = `<tr><td colspan="7">Nenhuma unidade encontrada para este condominio.</td></tr>`;
      return;
    }

    tbody.innerHTML = itens.map((item) => `
      <tr>
        <td data-label="Unidade">
          <div class="financeiro-cell-stack">
            <strong>${escapeMensagemHtml(item.unidade_identificacao || "-")}</strong>
            <small>${escapeMensagemHtml(item.torre_nome || item.condominio_nome || "-")}</small>
            <small>${buildOcupacaoFinanceiraBadge(item.ocupacao_situacao)} ${item.morador_principal ? ` <span class="financeiro-inline-note">Morador: ${escapeMensagemHtml(item.morador_principal)}</span>` : ""}</small>
          </div>
        </td>
        <td data-label="Responsavel">
          <div class="financeiro-cell-stack">
            <strong>${escapeMensagemHtml(item.nome_completo || "Nao configurado")}</strong>
            <small>${escapeMensagemHtml(item.cpf_cnpj || item.tipo_pagador || "-")}</small>
            <small>${!item.nome_completo && item.moradores_ativos > 0 ? "Unidade ocupada, mas sem responsavel financeiro definido" : item.moradores_ativos > 0 ? `${item.moradores_ativos} morador(es) ativo(s)` : "Unidade sem moradores ativos"}</small>
          </div>
        </td>
        <td data-label="Contato">
          <div class="financeiro-cell-stack">
            <strong>${escapeMensagemHtml(item.email || "-")}</strong>
            <small>${escapeMensagemHtml(item.telefone_principal || "Sem telefone")}</small>
          </div>
        </td>
        <td data-label="Cobranca">
          <div class="financeiro-cell-stack">
            ${buildSituacaoResponsavelBadge(item.situacao_financeira)}
            <small>${Number(item.ativo_para_cobranca) === 1 ? "Ativo para cobranca" : "Bloqueado para cobranca"}${Number(item.recebe_cobranca) === 1 ? " | Recebe aviso" : ""}</small>
          </div>
        </td>
        <td data-label="Ambiente">
          <span class="funcionario-chip funcionario-chip-matricula">${escapeMensagemHtml(item.ambiente_financeiro || "teste")}</span>
        </td>
        <td data-label="Atualizacao">
          <div class="financeiro-cell-stack">
            <strong>${escapeMensagemHtml(formatarDataHora(item.atualizado_em || item.criado_em) || "-")}</strong>
            <small>${item.validado_em ? `Validado em ${escapeMensagemHtml(formatarDataHora(item.validado_em))}` : "Sem validacao"}</small>
          </div>
        </td>
        <td data-label="Acoes">
          <button type="button" class="btn-inline-action btn-financeiro-responsavel" data-unidade-id="${item.unidade_id}">Configurar</button>
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar responsaveis financeiros.</td></tr>`;
    showToast(error.message || "Erro ao carregar responsaveis financeiros", "error");
  }
}

function renderResumoFinanceiro(resumo) {
  const resumoEl = document.getElementById("financeiroResumoInline");
  if (!resumoEl) return;

  resumoEl.innerHTML = `
    <span class="financeiro-mini-chip">Total: <strong>${resumo.total || 0}</strong></span>
    <span class="financeiro-mini-chip">Pendentes: <strong>${resumo.pendentes || 0}</strong></span>
    <span class="financeiro-mini-chip">Em analise: <strong>${resumo.em_analise || 0}</strong></span>
    <span class="financeiro-mini-chip">Pagas: <strong>${resumo.pagas || 0}</strong></span>
    <span class="financeiro-mini-chip">Vencidas: <strong>${resumo.vencidas || 0}</strong></span>
    <span class="financeiro-mini-chip">Valor: <strong>${formatarValorFinanceiro(resumo.valor_total || 0)}</strong></span>
  `;
}

function renderPaginacaoFinanceiro() {
  const info = document.getElementById("financeiroPaginationInfo");
  const prev = document.getElementById("financeiroPrevBtn");
  const next = document.getElementById("financeiroNextBtn");
  if (!info || !prev || !next) return;

  const paginacao = financeiroState.paginacao || {};
  const totalRegistros = Number(paginacao.total_registros || 0);
  const limite = Number(paginacao.limite || 25);
  const paginaAtual = Number(paginacao.pagina_atual || 1);
  const inicio = totalRegistros ? ((paginaAtual - 1) * limite) + 1 : 0;
  const fim = totalRegistros ? Math.min(paginaAtual * limite, totalRegistros) : 0;

  info.textContent = `Pagina ${paginaAtual} de ${paginacao.total_paginas || 1} | exibindo ${inicio}-${fim} de ${totalRegistros}`;
  prev.disabled = !paginacao.possui_anterior;
  next.disabled = !paginacao.possui_proxima;
}

async function carregarFinanceiroAdmin() {
  const tbody = document.querySelector("#financeiroTable tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7">Carregando cobrancas...</td></tr>`;

  try {
    const payload = await buscarCobrancasFinanceiras(getFinanceiroFiltrosAtuais());
    const cobrancas = Array.isArray(payload?.cobrancas) ? payload.cobrancas : [];
    const resumo = payload?.resumo || {};
    const paginacao = payload?.paginacao || {
      pagina_atual: 1,
      limite: 25,
      total_registros: cobrancas.length,
      total_paginas: 1,
      possui_anterior: false,
      possui_proxima: false,
    };

    financeiroState.cobrancas = cobrancas;
    financeiroState.resumo = resumo;
    financeiroState.paginacao = paginacao;

    renderResumoFinanceiro(resumo);
    renderPaginacaoFinanceiro();

    if (!cobrancas.length) {
      tbody.innerHTML = `<tr><td colspan="7">Nenhuma cobranca encontrada para os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = cobrancas.map((item) => `
      <tr>
        <td data-label="Referencia">
          <div class="funcionario-name-cell">
            <strong>${escapeMensagemHtml(item.referencia_titulo || "-")}</strong>
            <small>${escapeMensagemHtml(item.usuario_nome || "-")}${item.condominio_nome ? ` | ${escapeMensagemHtml(item.condominio_nome)}` : ""}</small>
          </div>
        </td>
        <td data-label="Unidade">
          <div class="financeiro-cell-stack">
            <strong>${escapeMensagemHtml(item.unidade_identificacao || "-")}</strong>
            <small>${item.reserva_status ? `Reserva ${escapeMensagemHtml(item.reserva_status)}` : "Sem reserva"}</small>
          </div>
        </td>
        <td data-label="Origem">
          <span class="funcionario-chip funcionario-chip-area">${formatarOrigemFinanceira(item.origem)}</span>
        </td>
        <td data-label="Valor">
          <div class="financeiro-cell-stack">
            <strong class="financeiro-value-cell">${formatarValorFinanceiro(item.valor)}</strong>
            <small>${escapeMensagemHtml(item.forma_cobranca || "-")}</small>
          </div>
        </td>
        <td data-label="Status">${buildStatusFinanceiroBadge(item.status)}</td>
        <td data-label="Vencimento">
          <div class="financeiro-cell-stack">
            <strong>${formatarDataCurtaFinanceiro(item.vencimento_em)}</strong>
            <small>${item.pago_em ? `Pago em ${escapeMensagemHtml(formatarDataCurtaFinanceiro(item.pago_em))}` : "Sem baixa"}</small>
          </div>
        </td>
        <td data-label="Acoes">
          <button type="button" class="btn-inline-action btn-financeiro-detalhe" data-id="${item.id}">Detalhe</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-financeiro-detalhe").forEach((button) => {
      button.addEventListener("click", () => abrirDetalheFinanceiro(button.dataset.id));
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar cobrancas.</td></tr>`;
    showToast(error.message || "Erro ao carregar cobrancas", "error");
  }
}

async function abrirDetalheFinanceiro(id) {
  const modal = document.getElementById("modalFinanceiro");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.innerHTML = `
    <div class="modal financeiro-modal financeiro-modal-shell">
      <div class="modal-header financeiro-modal-header">
        <div class="financeiro-modal-title-wrap">
          <h3>Detalhe da cobranca</h3>
          <p>Historico operacional e contexto financeiro da reserva.</p>
        </div>
        <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
      </div>
      <div class="financeiro-modal-body">
        <div class="financeiro-loading-block">Carregando detalhe...</div>
      </div>
    </div>
  `;

  const fechar = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  };

  modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) fechar();
  }, { once: true });

  try {
    const payload = await buscarDetalheCobrancaFinanceira(id);
    const cobranca = payload?.cobranca || {};
    const eventos = Array.isArray(payload?.eventos) ? payload.eventos : [];

    modal.innerHTML = `
      <div class="modal financeiro-modal financeiro-modal-shell">
        <div class="modal-header financeiro-modal-header">
          <div class="financeiro-modal-title-wrap">
            <h3>${escapeMensagemHtml(cobranca.referencia_titulo || "Cobranca")}</h3>
            <p>${escapeMensagemHtml(cobranca.condominio_nome || "")}</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>

        <div class="financeiro-modal-body">
          <div class="financeiro-detail-grid">
            <article>
              <span>Status</span>
              <strong>${formatarStatusFinanceiro(cobranca.status)}</strong>
              <small>${formatarOrigemFinanceira(cobranca.origem)}</small>
            </article>
            <article>
              <span>Valor</span>
              <strong>${formatarValorFinanceiro(cobranca.valor)}</strong>
              <small>${escapeMensagemHtml(cobranca.forma_cobranca || "-")}</small>
            </article>
            <article>
              <span>Unidade</span>
              <strong>${escapeMensagemHtml(cobranca.unidade_identificacao || "-")}</strong>
              <small>${escapeMensagemHtml(cobranca.usuario_nome || "-")}</small>
            </article>
            <article>
              <span>Vencimento</span>
              <strong>${formatarDataCurtaFinanceiro(cobranca.vencimento_em)}</strong>
              <small>${cobranca.pago_em ? `Pago em ${escapeMensagemHtml(formatarDataCurtaFinanceiro(cobranca.pago_em))}` : "Sem pagamento confirmado"}</small>
            </article>
            <article>
              <span>Responsavel financeiro</span>
              <strong>${escapeMensagemHtml(cobranca.responsavel_financeiro_nome || "Nao vinculado")}</strong>
              <small>${escapeMensagemHtml(cobranca.responsavel_financeiro_email || cobranca.responsavel_financeiro_telefone || "-")}</small>
            </article>
            <article>
              <span>Cobranca habilitada</span>
              <strong>${Number(cobranca.responsavel_financeiro_ativo_para_cobranca) === 1 ? "Sim" : "Nao"}</strong>
              <small>${escapeMensagemHtml(cobranca.responsavel_financeiro_ambiente || "teste")} | ${Number(cobranca.responsavel_financeiro_recebe_cobranca) === 1 ? "Recebe notificacao" : "Sem recebimento"}</small>
            </article>
          </div>

          <div class="financeiro-detail-note">
            <div><strong>Reserva:</strong> ${cobranca.area_nome ? `${escapeMensagemHtml(cobranca.area_nome)} | ${escapeMensagemHtml(cobranca.reserva_status || "-")} | ${escapeMensagemHtml(cobranca.reserva_status_pagamento || "-")}` : "Nao vinculada"}</div>
            <div><strong>Observacao do morador:</strong> ${escapeMensagemHtml(cobranca.observacao_morador || "Sem observacao")}</div>
            <div><strong>Observacao interna:</strong> ${escapeMensagemHtml(cobranca.observacao_interna || "Sem observacao interna")}</div>
          </div>

          <div class="financeiro-history-block">
            <div class="financeiro-history-title">Historico da cobranca</div>
            ${eventos.length ? `
              <table class="funcionarios-table financeiro-history-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Origem</th>
                    <th>Status</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  ${eventos.map((evento) => `
                    <tr>
                      <td>
                        <div class="financeiro-cell-stack">
                          <strong>${escapeMensagemHtml((evento.tipo_evento || "-").replaceAll("_", " "))}</strong>
                          <small>${escapeMensagemHtml(evento.descricao || "-")}</small>
                        </div>
                      </td>
                      <td>
                        <div class="financeiro-cell-stack">
                          <strong>${escapeMensagemHtml(evento.origem_ator || "-")}</strong>
                          <small>${escapeMensagemHtml(evento.usuario_nome || evento.mensagem_titulo || "-")}</small>
                        </div>
                      </td>
                      <td>
                        <div class="financeiro-cell-stack">
                          <strong>${escapeMensagemHtml(formatarStatusFinanceiro(evento.status_novo) || "-")}</strong>
                          <small>${evento.status_anterior ? `Antes: ${escapeMensagemHtml(formatarStatusFinanceiro(evento.status_anterior))}` : "Sem status anterior"}</small>
                        </div>
                      </td>
                      <td>
                        <strong>${escapeMensagemHtml(formatarDataHora(evento.criado_em) || "-")}</strong>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : `<div class="moradores-empty">Nenhum evento financeiro registrado ainda.</div>`}
          </div>
        </div>
      </div>
    `;

    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
  } catch (error) {
    console.error(error);
    modal.innerHTML = `
      <div class="modal financeiro-modal financeiro-modal-shell">
        <div class="modal-header financeiro-modal-header">
          <div class="financeiro-modal-title-wrap">
            <h3>Detalhe da cobranca</h3>
            <p>Nao foi possivel carregar o detalhe.</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>
        <div class="financeiro-modal-body">
          <div class="moradores-empty">Erro ao carregar detalhe da cobranca.</div>
        </div>
      </div>
    `;
    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
    showToast(error.message || "Erro ao carregar detalhe financeiro", "error");
  }
}

async function abrirModalResponsavelFinanceiro(unidadeId) {
  const modal = document.getElementById("modalFinanceiro");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.innerHTML = `
    <div class="modal financeiro-modal financeiro-modal-shell financeiro-responsavel-modal-shell">
      <div class="modal-header financeiro-modal-header">
        <div class="financeiro-modal-title-wrap">
          <h3>Responsavel financeiro da unidade</h3>
          <p>Defina o pagador oficial da unidade com leitura tecnica e enxuta.</p>
        </div>
        <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
      </div>
      <div class="financeiro-modal-body">
        <div class="financeiro-loading-block">Carregando unidade...</div>
      </div>
    </div>
  `;

  const fechar = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  };

  modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) fechar();
  }, { once: true });

  try {
    const payload = await buscarOpcoesResponsavelFinanceiro(unidadeId);
    const unidade = payload?.unidade || {};
    const responsavel = payload?.responsavel_atual || null;
    const candidatos = Array.isArray(payload?.candidatos) ? payload.candidatos : [];
    const selectedUsuarioId = String(responsavel?.usuario_id || candidatos[0]?.id || "");

    modal.innerHTML = `
      <div class="modal financeiro-modal financeiro-modal-shell financeiro-responsavel-modal-shell">
        <div class="modal-header financeiro-modal-header">
          <div class="financeiro-modal-title-wrap">
            <h3>Responsavel financeiro</h3>
            <p>Unidade ${escapeMensagemHtml(unidade.unidade_identificacao || "-")} | ${escapeMensagemHtml(unidade.condominio_nome || "-")}${unidade.torre_nome ? ` | ${escapeMensagemHtml(unidade.torre_nome)}` : ""}</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>
        <div class="financeiro-modal-body">
          <form id="formFinanceiroResponsavel" class="financeiro-responsavel-form">
            <input type="hidden" name="unidade_id" value="${escapeMensagemHtml(unidade.id || unidadeId)}" />
            <div class="financeiro-detail-note">
              <div><strong>Situacao atual:</strong> ${responsavel ? buildSituacaoResponsavelBadge(responsavel.situacao_financeira) : '<span class="status-badge status-inativo">Nao configurado</span>'}</div>
              <div><strong>Pendencias:</strong> ${responsavel?.pendencias?.length ? escapeMensagemHtml(responsavel.pendencias.join(", ")) : "Nenhuma pendencia estrutural"}</div>
              <div><strong>Moradores elegiveis:</strong> ${candidatos.length ? `${candidatos.length} vinculado(s) ativo(s)` : "Nenhum morador ativo nesta unidade"}</div>
            </div>
            <div class="form-grid two-columns financeiro-responsavel-grid">
              <label>Morador vinculado
                <select name="usuario_id" id="financeiroResponsavelUsuarioSelect" required>
                  <option value="">Selecione</option>
                  ${candidatos.map((item) => `<option value="${item.id}" ${String(item.id) === selectedUsuarioId ? "selected" : ""}>${escapeMensagemHtml(item.nome_completo)} - ${escapeMensagemHtml(item.papel || "morador")}</option>`).join("")}
                </select>
              </label>
              <label>Tipo de pagador
                <select name="tipo_pagador">
                  <option value="pf" ${(responsavel?.tipo_pagador || "pf") === "pf" ? "selected" : ""}>Pessoa fisica</option>
                  <option value="pj" ${responsavel?.tipo_pagador === "pj" ? "selected" : ""}>Pessoa juridica</option>
                </select>
              </label>
              <label>Nome completo
                <input type="text" name="nome_completo" value="${escapeMensagemHtml(responsavel?.nome_completo || "")}" maxlength="160" />
              </label>
              <label>CPF / CNPJ
                <input type="text" name="cpf_cnpj" value="${escapeMensagemHtml(responsavel?.cpf_cnpj || "")}" maxlength="20" />
              </label>
              <label>Email
                <input type="email" name="email" value="${escapeMensagemHtml(responsavel?.email || "")}" maxlength="160" />
              </label>
              <label>Telefone principal
                <input type="text" name="telefone_principal" value="${escapeMensagemHtml(responsavel?.telefone_principal || "")}" maxlength="30" />
              </label>
              <label>CEP
                <input type="text" name="cep" value="${escapeMensagemHtml(responsavel?.cep || "")}" maxlength="12" />
              </label>
              <label>Logradouro
                <input type="text" name="logradouro" value="${escapeMensagemHtml(responsavel?.logradouro || "")}" maxlength="160" />
              </label>
              <label>Numero
                <input type="text" name="numero" value="${escapeMensagemHtml(responsavel?.numero || "")}" maxlength="30" />
              </label>
              <label>Complemento
                <input type="text" name="complemento" value="${escapeMensagemHtml(responsavel?.complemento || "")}" maxlength="120" />
              </label>
              <label>Bairro
                <input type="text" name="bairro" value="${escapeMensagemHtml(responsavel?.bairro || "")}" maxlength="120" />
              </label>
              <label>Cidade
                <input type="text" name="cidade" value="${escapeMensagemHtml(responsavel?.cidade || "")}" maxlength="120" />
              </label>
              <label>UF
                <input type="text" name="uf" value="${escapeMensagemHtml(responsavel?.uf || "")}" maxlength="2" />
              </label>
              <label>Ambiente
                <select name="ambiente_financeiro">
                  <option value="teste" ${(responsavel?.ambiente_financeiro || "teste") === "teste" ? "selected" : ""}>teste</option>
                  <option value="producao" ${responsavel?.ambiente_financeiro === "producao" ? "selected" : ""}>producao</option>
                </select>
              </label>
              <label>Preferencia de envio
                <select name="preferencia_envio">
                  <option value="email" ${responsavel?.preferencia_envio === "email" ? "selected" : ""}>email</option>
                  <option value="inbox" ${responsavel?.preferencia_envio === "inbox" ? "selected" : ""}>inbox</option>
                  <option value="email_e_inbox" ${!responsavel?.preferencia_envio || responsavel?.preferencia_envio === "email_e_inbox" ? "selected" : ""}>email e inbox</option>
                </select>
              </label>
              <label class="full-width">Observacao financeira
                <textarea name="observacao_financeira" rows="3" placeholder="Observacao interna curta e tecnica">${escapeMensagemHtml(responsavel?.observacao_financeira || "")}</textarea>
              </label>
            </div>
            <div class="financeiro-checkbox-row">
              <label><input type="checkbox" name="ativo_para_cobranca" value="1" ${Number(responsavel?.ativo_para_cobranca) === 1 ? "checked" : ""} /> Ativo para cobranca</label>
              <label><input type="checkbox" name="recebe_cobranca" value="1" ${Number(responsavel?.recebe_cobranca) === 1 ? "checked" : ""} /> Recebe cobranca</label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" id="cancelFinanceiroResponsavel">Cancelar</button>
              <button type="submit" class="btn-confirm" id="saveFinanceiroResponsavelBtn">Salvar responsavel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
    modal.querySelector("#cancelFinanceiroResponsavel")?.addEventListener("click", fechar);

    const usuarioSelect = modal.querySelector("#financeiroResponsavelUsuarioSelect");
    const nomeInput = modal.querySelector('input[name="nome_completo"]');
    const emailInput = modal.querySelector('input[name="email"]');
    const telefoneInput = modal.querySelector('input[name="telefone_principal"]');
    const documentoInput = modal.querySelector('input[name="cpf_cnpj"]');
    const hydrateFromCandidate = () => {
      const candidato = candidatos.find((item) => String(item.id) === String(usuarioSelect.value));
      if (!candidato) return;
      if (!nomeInput.value.trim()) nomeInput.value = candidato.nome_completo || "";
      if (!emailInput.value.trim()) emailInput.value = candidato.email || "";
      if (!telefoneInput.value.trim()) telefoneInput.value = candidato.phone_whatsapp || "";
      if (!documentoInput.value.trim()) documentoInput.value = candidato.documento_identificacao || "";
    };
    usuarioSelect?.addEventListener("change", hydrateFromCandidate);
    hydrateFromCandidate();

    modal.querySelector("#formFinanceiroResponsavel")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = modal.querySelector("#saveFinanceiroResponsavelBtn");
      try {
        const formData = new FormData(event.currentTarget);
        const payloadForm = Object.fromEntries(formData.entries());
        payloadForm.ativo_para_cobranca = formData.get("ativo_para_cobranca") ? 1 : 0;
        payloadForm.recebe_cobranca = formData.get("recebe_cobranca") ? 1 : 0;
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";
        await salvarResponsavelFinanceiro(payloadForm);
        showToast("Responsavel financeiro atualizado");
        fechar();
        await carregarResponsaveisFinanceirosAdmin();
        await carregarFinanceiroAdmin();
      } catch (error) {
        showToast(error.message || "Erro ao salvar responsavel financeiro", "error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar responsavel";
      }
    });
  } catch (error) {
    console.error(error);
    modal.innerHTML = `
      <div class="modal financeiro-modal financeiro-modal-shell">
        <div class="modal-header financeiro-modal-header">
          <div class="financeiro-modal-title-wrap">
            <h3>Responsavel financeiro</h3>
            <p>Nao foi possivel carregar os dados da unidade.</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>
        <div class="financeiro-modal-body">
          <div class="moradores-empty">Erro ao carregar configuracao financeira da unidade.</div>
        </div>
      </div>
    `;
    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
    showToast(error.message || "Erro ao carregar responsavel financeiro", "error");
  }
}

function imprimirRelatorioFinanceiro() {
  const itens = Array.isArray(financeiroState.cobrancas) ? financeiroState.cobrancas : [];
  const resumo = financeiroState.resumo || {};
  const filtros = getFinanceiroFiltrosAtuais();
  const condominioTexto = document.getElementById("financeiroCondominioFilter")?.selectedOptions?.[0]?.textContent || "Todos";
  const statusTexto = document.getElementById("financeiroStatusFilter")?.selectedOptions?.[0]?.textContent || "Todos";
  const origemTexto = document.getElementById("financeiroOrigemFilter")?.selectedOptions?.[0]?.textContent || "Todas";
  const paginaTexto = `Pagina ${financeiroState.paginacao.pagina_atual || 1} de ${financeiroState.paginacao.total_paginas || 1}`;

  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) {
    showToast("Nao foi possivel abrir a visualizacao de impressao", "error");
    return;
  }

  const html = `
    <!doctype html>
    <html lang="pt-br">
      <head>
        <meta charset="UTF-8" />
        <title>Relatorio Financeiro</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #16202b; }
          h1 { margin: 0 0 6px; font-size: 20px; }
          p { margin: 0 0 12px; font-size: 12px; color: #506070; }
          .meta, .resumo { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
          .chip { border: 1px solid #d5dde5; border-radius: 999px; padding: 4px 8px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d9e0e6; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f6f8; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
          strong { font-size: 11px; }
          small { display: block; color: #607080; margin-top: 2px; font-size: 10px; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>Relatorio Financeiro</h1>
        <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <div class="meta">
          <span class="chip">Condominio: ${condominioTexto}</span>
          <span class="chip">Status: ${statusTexto}</span>
          <span class="chip">Origem: ${origemTexto}</span>
          <span class="chip">Busca: ${filtros.busca || "-"}</span>
          <span class="chip">De: ${filtros.vencimento_de || "-"}</span>
          <span class="chip">Ate: ${filtros.vencimento_ate || "-"}</span>
          <span class="chip">${paginaTexto}</span>
        </div>
        <div class="resumo">
          <span class="chip">Total: ${resumo.total || 0}</span>
          <span class="chip">Pendentes: ${resumo.pendentes || 0}</span>
          <span class="chip">Em analise: ${resumo.em_analise || 0}</span>
          <span class="chip">Pagas: ${resumo.pagas || 0}</span>
          <span class="chip">Vencidas: ${resumo.vencidas || 0}</span>
          <span class="chip">Valor: ${formatarValorFinanceiro(resumo.valor_total || 0)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Unidade</th>
              <th>Origem</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${itens.length ? itens.map((item) => `
              <tr>
                <td><strong>${escapeMensagemHtml(item.referencia_titulo || "-")}</strong><small>${escapeMensagemHtml(item.usuario_nome || "-")}</small></td>
                <td><strong>${escapeMensagemHtml(item.unidade_identificacao || "-")}</strong><small>${escapeMensagemHtml(item.condominio_nome || "-")}</small></td>
                <td>${escapeMensagemHtml(formatarOrigemFinanceira(item.origem))}</td>
                <td>${escapeMensagemHtml(formatarValorFinanceiro(item.valor))}</td>
                <td>${escapeMensagemHtml(formatarStatusFinanceiro(item.status))}</td>
                <td>${escapeMensagemHtml(formatarDataCurtaFinanceiro(item.vencimento_em))}</td>
              </tr>
            `).join("") : `<tr><td colspan="6">Nenhuma cobranca encontrada.</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}

