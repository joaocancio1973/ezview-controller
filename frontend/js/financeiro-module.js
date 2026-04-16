const STATUS_FINANCEIRO_LABELS = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  em_analise: "Em analise",
  pago: "Pago",
  isento: "Isento",
  cancelado: "Cancelado",
  rejeitado: "Rejeitado",
};

const ORIGEM_FINANCEIRO_LABELS = {
  reserva: "Reserva",
  taxa_condominial: "Taxa condominial",
  mensalidade: "Mensalidade",
  multa: "Multa",
  avulso: "Avulso",
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
    status === "cancelado" || status === "rejeitado" ? "status-inativo" :
    "status-pendente";

  return `<span class="status-badge ${classe}">${formatarStatusFinanceiro(status)}</span>`;
}

function formatarValorFinanceiro(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

async function buscarCobrancasFinanceiras(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
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

function renderFinanceiro(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (user?.perfil !== "admin") {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header acessos-page-header financeiro-page-header">
      <div class="page-heading-group">
        <h2>Financeiro</h2>
        <div class="page-subtitle">Cobrancas operacionais do condominio com foco em reservas e validacao administrativa.</div>
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

      <div class="financeiro-inline-summary" id="financeiroResumoInline">
        <span class="financeiro-mini-chip">Total: -</span>
        <span class="financeiro-mini-chip">Pendentes: -</span>
        <span class="financeiro-mini-chip">Em analise: -</span>
        <span class="financeiro-mini-chip">Pagas: -</span>
        <span class="financeiro-mini-chip">Vencidas: -</span>
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
    </div>

    <div id="modalFinanceiro" class="modal-overlay hidden"></div>
  `;

  const filtrosIds = [
    "financeiroCondominioFilter",
    "financeiroStatusFilter",
    "financeiroOrigemFilter",
    "financeiroVencimentoDe",
    "financeiroVencimentoAte",
  ];

  filtrosIds.forEach((id) => {
    document.getElementById(id)?.addEventListener("change", carregarFinanceiroAdmin);
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
      await carregarFinanceiroAdmin();
    }
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    showToast("Erro ao carregar contexto financeiro", "error");
  }
}

async function carregarFinanceiroAdmin() {
  const tbody = document.querySelector("#financeiroTable tbody");
  const resumoEl = document.getElementById("financeiroResumoInline");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7">Carregando cobrancas...</td></tr>`;

  try {
    const payload = await buscarCobrancasFinanceiras({
      condominio_id: document.getElementById("financeiroCondominioFilter")?.value || "",
      status: document.getElementById("financeiroStatusFilter")?.value || "",
      origem: document.getElementById("financeiroOrigemFilter")?.value || "",
      vencimento_de: document.getElementById("financeiroVencimentoDe")?.value || "",
      vencimento_ate: document.getElementById("financeiroVencimentoAte")?.value || "",
    });

    const cobrancas = Array.isArray(payload?.cobrancas) ? payload.cobrancas : [];
    const resumo = payload?.resumo || {};

    if (resumoEl) {
      resumoEl.innerHTML = `
        <span class="financeiro-mini-chip">Total: <strong>${resumo.total || 0}</strong></span>
        <span class="financeiro-mini-chip">Pendentes: <strong>${resumo.pendentes || 0}</strong></span>
        <span class="financeiro-mini-chip">Em analise: <strong>${resumo.em_analise || 0}</strong></span>
        <span class="financeiro-mini-chip">Pagas: <strong>${resumo.pagas || 0}</strong></span>
        <span class="financeiro-mini-chip">Vencidas: <strong>${resumo.vencidas || 0}</strong></span>
        <span class="financeiro-mini-chip">Valor: <strong>${formatarValorFinanceiro(resumo.valor_total || 0)}</strong></span>
      `;
    }

    if (!cobrancas.length) {
      tbody.innerHTML = `<tr><td colspan="7">Nenhuma cobranca encontrada para os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = cobrancas.map((item) => `
      <tr>
        <td data-label="Referencia">
          <div class="funcionario-name-cell">
            <strong>${escapeMensagemHtml(item.referencia_titulo || "-")}</strong>
            <small>${escapeMensagemHtml(item.usuario_nome || "-")}${item.condominio_nome ? ` • ${escapeMensagemHtml(item.condominio_nome)}` : ""}</small>
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
            <strong>${formatarValorFinanceiro(item.valor)}</strong>
            <small>${escapeMensagemHtml(item.forma_cobranca || "-")}</small>
          </div>
        </td>
        <td data-label="Status">${buildStatusFinanceiroBadge(item.status)}</td>
        <td data-label="Vencimento">
          <div class="financeiro-cell-stack">
            <strong>${formatarDataHora(item.vencimento_em) || "-"}</strong>
            <small>${item.pago_em ? `Pago em ${escapeMensagemHtml(formatarDataHora(item.pago_em) || "-")}` : "Sem baixa"}</small>
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
    <div class="modal financeiro-modal">
      <div class="modal-header">
        <div>
          <h3>Detalhe da cobranca</h3>
          <p>Historico operacional e contexto financeiro da reserva.</p>
        </div>
        <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
      </div>
      <div class="financeiro-loading-block">Carregando detalhe...</div>
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
      <div class="modal financeiro-modal">
        <div class="modal-header">
          <div>
            <h3>${escapeMensagemHtml(cobranca.referencia_titulo || "Cobranca")}</h3>
            <p>${escapeMensagemHtml(cobranca.condominio_nome || "")}</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>

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
            <strong>${formatarDataHora(cobranca.vencimento_em) || "-"}</strong>
            <small>${cobranca.pago_em ? `Pago em ${escapeMensagemHtml(formatarDataHora(cobranca.pago_em) || "-")}` : "Sem pagamento confirmado"}</small>
          </article>
        </div>

        <div class="financeiro-detail-note">
          <div><strong>Reserva:</strong> ${cobranca.area_nome ? `${escapeMensagemHtml(cobranca.area_nome)} • ${escapeMensagemHtml(cobranca.reserva_status || "-")} • ${escapeMensagemHtml(cobranca.reserva_status_pagamento || "-")}` : "Nao vinculada"}</div>
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
    `;

    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
  } catch (error) {
    console.error(error);
    modal.innerHTML = `
      <div class="modal financeiro-modal">
        <div class="modal-header">
          <div>
            <h3>Detalhe da cobranca</h3>
            <p>Nao foi possivel carregar o detalhe.</p>
          </div>
          <button type="button" class="modal-close" id="closeFinanceiroModal">&times;</button>
        </div>
        <div class="moradores-empty">Erro ao carregar detalhe da cobranca.</div>
      </div>
    `;
    modal.querySelector("#closeFinanceiroModal")?.addEventListener("click", fechar);
    showToast(error.message || "Erro ao carregar detalhe financeiro", "error");
  }
}
