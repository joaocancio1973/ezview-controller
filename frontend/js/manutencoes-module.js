const TIPO_ORIGEM_MANUTENCAO_LABELS = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  reforma: "Reforma",
  derivada_ocorrencia: "Derivada de ocorrencia",
  avulsa: "Avulsa",
};

const ALVO_MANUTENCAO_LABELS = {
  area_comum: "Area comum",
  torre: "Torre",
  unidade: "Unidade",
  estrutura_geral: "Estrutura geral",
};

const STATUS_MANUTENCAO_LABELS = {
  aberta: "Aberta",
  planejada: "Planejada",
  em_execucao: "Em execucao",
  aguardando_terceiro: "Aguardando terceiro",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

function formatarTipoOrigemManutencao(tipo) {
  return TIPO_ORIGEM_MANUTENCAO_LABELS[tipo] || "Ordem";
}

function formatarAlvoManutencao(tipo) {
  return ALVO_MANUTENCAO_LABELS[tipo] || "Estrutura geral";
}

function formatarStatusManutencao(status) {
  return STATUS_MANUTENCAO_LABELS[status] || status || "-";
}

function buildStatusManutencaoBadge(status) {
  const classe =
    status === "concluida" ? "status-ativo" :
    status === "cancelada" ? "status-inativo" :
    status === "em_execucao" ? "status-pendente" :
    status === "aguardando_terceiro" ? "status-pendente" :
    "status-ativo";

  return `<span class="status-badge ${classe}">${formatarStatusManutencao(status)}</span>`;
}

function buildTipoOrigemManutencaoOptions(selected = "") {
  return Object.entries(TIPO_ORIGEM_MANUTENCAO_LABELS)
    .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function buildAlvoManutencaoOptions(selected = "") {
  return Object.entries(ALVO_MANUTENCAO_LABELS)
    .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

async function buscarManutencoes(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const response = await fetch(`http://localhost:3000/manutencoes${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar as manutencoes");
  }

  return Array.isArray(data.ordens) ? data.ordens : [];
}

async function criarManutencao(payload) {
  const response = await fetch("http://localhost:3000/manutencoes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel criar a ordem de servico");
  }

  return data;
}

async function atualizarStatusManutencao(id, payload) {
  const response = await fetch(`http://localhost:3000/manutencoes/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o status da ordem");
  }

  return data;
}

async function atualizarResponsavelManutencao(id, payload) {
  const response = await fetch(`http://localhost:3000/manutencoes/${id}/responsavel`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o responsavel");
  }

  return data;
}

async function buscarHistoricoManutencao(id) {
  const response = await fetch(`http://localhost:3000/manutencoes/${id}/historico`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar o historico da ordem");
  }

  return data;
}

function renderManutencoes(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (user?.perfil === "funcionario") return renderManutencoesFuncionario(container);
  return renderManutencoesAdmin(container);
}

async function renderManutencoesFuncionario(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Ordens de Servico</h2>
        <div class="page-subtitle">Acompanhe a execucao tecnica do seu condominio.</div>
      </div>
      <button id="btnNovaManutencaoFuncionario" class="btn-primary-soft">+ Nova ordem</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Status
          <select id="manutencaoFuncionarioStatus">
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="planejada">Planejada</option>
            <option value="em_execucao">Em execucao</option>
            <option value="aguardando_terceiro">Aguardando terceiro</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label>Prioridade
          <select id="manutencaoFuncionarioPrioridade">
            <option value="">Todas</option>
            ${buildPrioridadeOcorrenciaOptions()}
          </select>
        </label>
        <label>Origem
          <select id="manutencaoFuncionarioTipo">
            <option value="">Todas</option>
            ${buildTipoOrigemManutencaoOptions()}
          </select>
        </label>
      </div>
    </div>
    <div class="panel funcionarios-panel">
      <table class="funcionarios-table" id="manutencoesFuncionarioTable">
        <thead>
          <tr>
            <th>Ordem</th>
            <th>Origem</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Responsavel</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="6">Carregando ordens...</td></tr></tbody>
      </table>
    </div>
    <div id="modalManutencao" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovaManutencaoFuncionario")?.addEventListener("click", () => abrirModalManutencao("funcionario"));
  document.getElementById("manutencaoFuncionarioStatus")?.addEventListener("change", carregarManutencoesFuncionario);
  document.getElementById("manutencaoFuncionarioPrioridade")?.addEventListener("change", carregarManutencoesFuncionario);
  document.getElementById("manutencaoFuncionarioTipo")?.addEventListener("change", carregarManutencoesFuncionario);
  await carregarManutencoesFuncionario();
}

async function renderManutencoesAdmin(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Manutencao e Reformas</h2>
        <div class="page-subtitle">Ordens tecnicas, execucao e acompanhamento patrimonial.</div>
      </div>
      <button id="btnNovaManutencaoAdmin" class="btn-primary-soft">+ Nova ordem</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Condominio
          <select id="manutencaoAdminCondominio"></select>
        </label>
        <label>Status
          <select id="manutencaoAdminStatus">
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="planejada">Planejada</option>
            <option value="em_execucao">Em execucao</option>
            <option value="aguardando_terceiro">Aguardando terceiro</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label>Prioridade
          <select id="manutencaoAdminPrioridade">
            <option value="">Todas</option>
            ${buildPrioridadeOcorrenciaOptions()}
          </select>
        </label>
        <label>Origem
          <select id="manutencaoAdminTipo">
            <option value="">Todas</option>
            ${buildTipoOrigemManutencaoOptions()}
          </select>
        </label>
      </div>
    </div>
    <div class="panel funcionarios-panel">
      <table class="funcionarios-table" id="manutencoesAdminTable">
        <thead>
          <tr>
            <th>Ordem</th>
            <th>Origem</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Responsavel</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="6">Carregando ordens...</td></tr></tbody>
      </table>
    </div>
    <div id="modalManutencao" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovaManutencaoAdmin")?.addEventListener("click", () => abrirModalManutencao("admin"));
  document.getElementById("manutencaoAdminStatus")?.addEventListener("change", carregarManutencoesAdmin);
  document.getElementById("manutencaoAdminPrioridade")?.addEventListener("change", carregarManutencoesAdmin);
  document.getElementById("manutencaoAdminTipo")?.addEventListener("change", carregarManutencoesAdmin);

  const selectCondominio = document.getElementById("manutencaoAdminCondominio");
  try {
    const condominios = await buscarCondominiosDoAdmin();
    selectCondominio.innerHTML = `<option value="">Selecione um condominio</option>${condominios.map((item) => `<option value="${item.id}">${item.nome_fantasia}</option>`).join("")}`;
    if (condominios.length) {
      selectCondominio.value = condominios[0].id;
      await carregarManutencoesAdmin();
    }
  } catch (error) {
    console.error(error);
    selectCondominio.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
  }
  selectCondominio?.addEventListener("change", carregarManutencoesAdmin);
}

async function carregarManutencoesFuncionario() {
  const tbody = document.querySelector("#manutencoesFuncionarioTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6">Carregando ordens...</td></tr>`;
  try {
    const ordens = await buscarManutencoes({
      status: document.getElementById("manutencaoFuncionarioStatus")?.value || "",
      prioridade: document.getElementById("manutencaoFuncionarioPrioridade")?.value || "",
      tipo_origem: document.getElementById("manutencaoFuncionarioTipo")?.value || "",
    });
    if (!ordens.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma ordem encontrada.</td></tr>`;
      return;
    }
    tbody.innerHTML = ordens.map((item) => `
      <tr>
        <td data-label="Ordem"><div class="funcionario-name-cell"><strong>${item.titulo || "-"}</strong><small>${item.local_referencia || item.area_nome || item.unidade_identificacao || "Estrutura geral"}</small></div></td>
        <td data-label="Origem"><span class="funcionario-chip funcionario-chip-area">${formatarTipoOrigemManutencao(item.tipo_origem)}</span></td>
        <td data-label="Prioridade"><span class="funcionario-chip funcionario-chip-cargo">${formatarPrioridadeOcorrencia(item.prioridade)}</span></td>
        <td data-label="Status">${buildStatusManutencaoBadge(item.status)}</td>
        <td data-label="Responsavel">${item.responsavel_nome || "-"}</td>
        <td data-label="Acoes">
          <div class="portaria-acoes-inline">
            ${(item.status === "aberta" || item.status === "planejada") ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="em_execucao">Iniciar</button>` : ""}
            ${(item.status !== "concluida" && item.status !== "cancelada") ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="aguardando_terceiro">Terceiro</button>` : ""}
            ${(item.status !== "concluida" && item.status !== "cancelada") ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="concluida">Concluir</button>` : ""}
            <button type="button" class="btn-primary-soft btn-historico-manutencao" data-id="${item.id}">Historico</button>
          </div>
        </td>
      </tr>
    `).join("");
    bindHistoricoManutencaoButtons(tbody);
    bindStatusManutencaoButtons(tbody, carregarManutencoesFuncionario);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar ordens.</td></tr>`;
    showToast(error.message || "Erro ao carregar manutencoes", "error");
  }
}

async function carregarManutencoesAdmin() {
  const tbody = document.querySelector("#manutencoesAdminTable tbody");
  const condominioId = document.getElementById("manutencaoAdminCondominio")?.value || "";
  if (!tbody) return;
  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="6">Selecione um condominio.</td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="6">Carregando ordens...</td></tr>`;
  try {
    const [ordens, funcionarios] = await Promise.all([
      buscarManutencoes({
        condominio_id: condominioId,
        status: document.getElementById("manutencaoAdminStatus")?.value || "",
        prioridade: document.getElementById("manutencaoAdminPrioridade")?.value || "",
        tipo_origem: document.getElementById("manutencaoAdminTipo")?.value || "",
      }),
      buscarFuncionarios({ condominio_id: condominioId }).catch(() => []),
    ]);
    if (!ordens.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma ordem encontrada.</td></tr>`;
      return;
    }
    tbody.innerHTML = ordens.map((item) => `
      <tr>
        <td><div class="funcionario-name-cell"><strong>${item.titulo || "-"}</strong><small>${item.local_referencia || item.area_nome || item.unidade_identificacao || "Estrutura geral"}</small></div></td>
        <td><span class="funcionario-chip funcionario-chip-area">${formatarTipoOrigemManutencao(item.tipo_origem)}</span></td>
        <td><span class="funcionario-chip funcionario-chip-cargo">${formatarPrioridadeOcorrencia(item.prioridade)}</span></td>
        <td>${buildStatusManutencaoBadge(item.status)}</td>
        <td>
          <select class="ocorrencia-responsavel-select" data-id="${item.id}">
            <option value="">Sem responsavel</option>
            ${funcionarios.map((f) => `<option value="${f.id}" ${item.funcionario_responsavel_id === f.id ? "selected" : ""}>${f.nome_completo} - ${formatarAreaAtuacao(f.area_atuacao)}</option>`).join("")}
          </select>
        </td>
        <td>
          <div class="portaria-acoes-inline">
            ${item.status === "aberta" ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="planejada">Planejar</button>` : ""}
            ${item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="em_execucao">Executar</button>` : ""}
            ${item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-manutencao" data-id="${item.id}" data-status="concluida">Concluir</button>` : ""}
            <button type="button" class="btn-primary-soft btn-historico-manutencao" data-id="${item.id}">Historico</button>
          </div>
        </td>
      </tr>
    `).join("");
    bindHistoricoManutencaoButtons(tbody);
    bindStatusManutencaoButtons(tbody, carregarManutencoesAdmin);
    tbody.querySelectorAll(".ocorrencia-responsavel-select").forEach((select) => {
      select.addEventListener("change", async () => {
        try {
          await atualizarResponsavelManutencao(select.dataset.id, { funcionario_responsavel_id: select.value });
          showToast("Responsavel atualizado");
          await carregarManutencoesAdmin();
        } catch (error) {
          console.error(error);
          showToast(error.message || "Erro ao atualizar responsavel", "error");
        }
      });
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar ordens.</td></tr>`;
    showToast(error.message || "Erro ao carregar manutencoes", "error");
  }
}

function bindStatusManutencaoButtons(scopeEl, refreshFn) {
  scopeEl.querySelectorAll(".btn-status-manutencao").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await atualizarStatusManutencao(button.dataset.id, { status: button.dataset.status });
        showToast("Status da ordem atualizado");
        await refreshFn();
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar status", "error");
      }
    });
  });
}

function bindHistoricoManutencaoButtons(scopeEl) {
  scopeEl.querySelectorAll(".btn-historico-manutencao").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await abrirHistoricoManutencao(button.dataset.id);
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao carregar historico", "error");
      }
    });
  });
}

async function abrirModalManutencao(contexto, prefill = {}) {
  const modal = document.getElementById("modalManutencao");
  if (!modal) return;

  let condominios = [];
  let condominioId = "";
  if (contexto === "admin") {
    condominios = await buscarCondominiosDoAdmin().catch(() => []);
    condominioId = prefill.condominio_id || condominios[0]?.id || "";
  } else {
    const perfil = await buscarMeuPerfil().catch(() => null);
    condominioId = prefill.condominio_id || perfil?.contexto?.condominio_id || "";
  }

  let areas = [];
  let torres = [];
  let unidades = [];
  let prestadores = [];
  let funcionarios = [];
  let ocorrencias = [];
  if (condominioId) {
    [areas, torres, unidades, prestadores, funcionarios, ocorrencias] = await Promise.all([
      buscarAreasComunsPorCondominio(condominioId),
      buscarTorresPorCondominio(condominioId).catch(() => []),
      buscarUnidadesPorCondominio(condominioId).catch(() => []),
      buscarPrestadoresServico({ condominio_id: condominioId }).catch(() => []),
      buscarFuncionarios({ condominio_id: condominioId }).catch(() => []),
      buscarOcorrencias({ condominio_id: condominioId, status: "aberta" }).catch(() => []),
    ]);
  }

  modal.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Nova ordem de servico</h3>
          <p>Formulario tecnico, conciso e com registro fotografico.</p>
        </div>
        <button type="button" class="modal-close" id="closeManutencaoModal">&times;</button>
      </div>
      <form id="formManutencao" novalidate>
        <div class="modal-section">
          <div class="modal-section-title">Dados principais</div>
          <div class="form-grid two-columns">
            ${contexto === "admin" ? `
              <label>Condominio
                <select name="condominio_id" id="manutencaoCondominioModal" required>
                  <option value="">Selecione</option>
                  ${condominios.map((item) => `<option value="${item.id}" ${item.id === condominioId ? "selected" : ""}>${item.nome_fantasia}</option>`).join("")}
                </select>
              </label>
            ` : `<input type="hidden" name="condominio_id" value="${condominioId}" />`}
            <label>Origem
              <select name="tipo_origem">${buildTipoOrigemManutencaoOptions(prefill.tipo_origem || "corretiva")}</select>
            </label>
            <label>Alvo tecnico
              <select name="alvo_tipo">${buildAlvoManutencaoOptions(prefill.alvo_tipo || "estrutura_geral")}</select>
            </label>
            <label>Prioridade
              <select name="prioridade">${buildPrioridadeOcorrenciaOptions(prefill.prioridade || "")}</select>
            </label>
            <label class="full-width">Titulo
              <input type="text" name="titulo" maxlength="180" value="${escapeMensagemHtml(prefill.titulo || "")}" required />
            </label>
            <label class="full-width">Local de referencia
              <input type="text" name="local_referencia" maxlength="180" value="${escapeMensagemHtml(prefill.local_referencia || "")}" placeholder="Ex.: elevador torre A, academia, casa de bombas..." />
            </label>
            <label class="full-width">Descricao tecnica
              <textarea name="descricao_tecnica" rows="4" required>${escapeMensagemHtml(prefill.descricao_tecnica || "")}</textarea>
            </label>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Vinculos e planejamento</div>
          <div class="form-grid two-columns">
            <label>Ocorrencia vinculada
              <select name="ocorrencia_id" id="manutencaoOcorrenciaModal">
                <option value="">Nenhuma</option>
                ${ocorrencias.map((item) => `<option value="${item.id}" ${prefill.ocorrencia_id === item.id ? "selected" : ""}>${item.titulo}</option>`).join("")}
              </select>
            </label>
            <label>Area comum
              <select name="area_comum_id" id="manutencaoAreaModal">
                <option value="">Nenhuma</option>
                ${areas.map((item) => `<option value="${item.id}" ${prefill.area_comum_id === item.id ? "selected" : ""}>${item.nome}</option>`).join("")}
              </select>
            </label>
            <label>Torre
              <select name="torre_id" id="manutencaoTorreModal">
                <option value="">Nenhuma</option>
                ${torres.map((item) => `<option value="${item.id}" ${prefill.torre_id === item.id ? "selected" : ""}>${item.nome}</option>`).join("")}
              </select>
            </label>
            <label>Unidade
              <select name="unidade_id" id="manutencaoUnidadeModal">
                <option value="">Nenhuma</option>
                ${unidades.map((item) => `<option value="${item.id}" ${prefill.unidade_id === item.id ? "selected" : ""}>${item.identificacao}</option>`).join("")}
              </select>
            </label>
            <label>Prestador
              <select name="prestador_servico_id" id="manutencaoPrestadorModal">
                <option value="">Nenhum</option>
                ${prestadores.map((item) => `<option value="${item.id}" ${prefill.prestador_servico_id === item.id ? "selected" : ""}>${item.nome_prestador}</option>`).join("")}
              </select>
            </label>
            ${contexto === "admin" ? `
              <label>Responsavel interno
                <select name="funcionario_responsavel_id" id="manutencaoResponsavelModal">
                  <option value="">Sem responsavel</option>
                  ${funcionarios.map((item) => `<option value="${item.id}" ${prefill.funcionario_responsavel_id === item.id ? "selected" : ""}>${item.nome_completo} - ${formatarAreaAtuacao(item.area_atuacao)}</option>`).join("")}
                </select>
              </label>
            ` : ""}
            <label>Data prevista
              <input type="datetime-local" name="data_prevista" value="${escapeMensagemHtml(prefill.data_prevista || "")}" />
            </label>
            <label>Prazo final
              <input type="datetime-local" name="prazo_final_em" value="${escapeMensagemHtml(prefill.prazo_final_em || "")}" />
            </label>
            <label>Custo previsto
              <input type="number" name="custo_previsto" min="0" step="0.01" value="${escapeMensagemHtml(prefill.custo_previsto || "")}" placeholder="0,00" />
            </label>
            <label class="acesso-urgente-toggle-field">
              <span>Bloqueia area</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="bloqueia_area" ${prefill.bloqueia_area ? "checked" : ""} />
                <small>Use quando a ordem retirar temporariamente a area de uso.</small>
              </div>
            </label>
            <label class="full-width">Observacoes internas
              <textarea name="observacoes_internas" rows="3">${escapeMensagemHtml(prefill.observacoes_internas || "")}</textarea>
            </label>
            <label class="full-width">Registro fotografico
              <input type="file" id="manutencaoFotosInput" accept="image/*" capture="environment" multiple />
              <small>Anexe ate 3 fotos para apoiar a analise e a consulta tecnica.</small>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelManutencaoModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Criar ordem</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const close = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("closeManutencaoModal")?.addEventListener("click", close);
  document.getElementById("cancelManutencaoModal")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.getElementById("manutencaoCondominioModal")?.addEventListener("change", async (event) => {
    const novoCondominioId = event.target.value;
    const [novasAreas, novasTorres, novasUnidades, novosPrestadores, novosFuncionarios, novasOcorrencias] = await Promise.all([
      buscarAreasComunsPorCondominio(novoCondominioId),
      buscarTorresPorCondominio(novoCondominioId).catch(() => []),
      buscarUnidadesPorCondominio(novoCondominioId).catch(() => []),
      buscarPrestadoresServico({ condominio_id: novoCondominioId }).catch(() => []),
      buscarFuncionarios({ condominio_id: novoCondominioId }).catch(() => []),
      buscarOcorrencias({ condominio_id: novoCondominioId, status: "aberta" }).catch(() => []),
    ]);

    document.getElementById("manutencaoOcorrenciaModal").innerHTML = `<option value="">Nenhuma</option>${novasOcorrencias.map((item) => `<option value="${item.id}">${item.titulo}</option>`).join("")}`;
    document.getElementById("manutencaoAreaModal").innerHTML = `<option value="">Nenhuma</option>${novasAreas.map((item) => `<option value="${item.id}">${item.nome}</option>`).join("")}`;
    document.getElementById("manutencaoTorreModal").innerHTML = `<option value="">Nenhuma</option>${novasTorres.map((item) => `<option value="${item.id}">${item.nome}</option>`).join("")}`;
    document.getElementById("manutencaoUnidadeModal").innerHTML = `<option value="">Nenhuma</option>${novasUnidades.map((item) => `<option value="${item.id}">${item.identificacao}</option>`).join("")}`;
    document.getElementById("manutencaoPrestadorModal").innerHTML = `<option value="">Nenhum</option>${novosPrestadores.map((item) => `<option value="${item.id}">${item.nome_prestador}</option>`).join("")}`;
    const responsavelSelect = document.getElementById("manutencaoResponsavelModal");
    if (responsavelSelect) {
      responsavelSelect.innerHTML = `<option value="">Sem responsavel</option>${novosFuncionarios.map((item) => `<option value="${item.id}">${item.nome_completo} - ${formatarAreaAtuacao(item.area_atuacao)}</option>`).join("")}`;
    }
  });

  document.getElementById("formManutencao")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) {
      showToast("Confira os campos obrigatorios da ordem de servico", "error");
      return;
    }

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const fotosInput = document.getElementById("manutencaoFotosInput");
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Criando...";
      }
      if (fotosInput?.files?.length) {
        payload.anexos = await lerArquivosComoDataUrl(fotosInput.files);
      }
      await criarManutencao(payload);
      showToast("Ordem de servico criada com sucesso");
      close();
      if (contexto === "admin") await carregarManutencoesAdmin();
      else await carregarManutencoesFuncionario();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao criar ordem", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Criar ordem";
      }
    }
  });
}

async function abrirHistoricoManutencao(id) {
  const resultado = await buscarHistoricoManutencao(id);
  const ordem = resultado?.ordem_servico || {};
  const eventos = Array.isArray(resultado?.eventos) ? resultado.eventos : [];
  const anexos = Array.isArray(resultado?.anexos) ? resultado.anexos : [];

  const existing = document.getElementById("modalHistoricoManutencao");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalHistoricoManutencao";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Historico da ordem</h3>
          <p>${ordem.titulo || "-"} - ${formatarTipoOrigemManutencao(ordem.tipo_origem)}</p>
        </div>
        <button type="button" class="modal-close" id="closeHistoricoManutencao">&times;</button>
      </div>
      <div class="modal-section">
        <div class="form-grid two-columns">
          <label>Titulo
            <input type="text" value="${ordem.titulo || ""}" disabled />
          </label>
          <label>Status
            <input type="text" value="${formatarStatusManutencao(ordem.status)}" disabled />
          </label>
          <label>Alvo
            <input type="text" value="${formatarAlvoManutencao(ordem.alvo_tipo)}" disabled />
          </label>
          <label>Responsavel
            <input type="text" value="${ordem.responsavel_nome || "-"}" disabled />
          </label>
          <label>Custo previsto
            <input type="text" value="${ordem.custo_previsto != null ? formatarMoeda(Number(ordem.custo_previsto)) : "-"}" disabled />
          </label>
          <label>Custo realizado
            <input type="text" value="${ordem.custo_realizado != null ? formatarMoeda(Number(ordem.custo_realizado)) : "-"}" disabled />
          </label>
          <label class="full-width">Descricao tecnica
            <textarea rows="3" disabled>${ordem.descricao_tecnica || ""}</textarea>
          </label>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Trilha operacional</div>
        <div class="portaria-sessoes-recentes-list acesso-historico-list">
          ${eventos.length ? eventos.map((evento) => `
            <div class="portaria-sessao-log-item acesso-historico-item">
              <strong>${formatarDataHora(evento.criado_em)}</strong>
              <span>${evento.tipo_evento || "-"}${evento.status_resultante ? ` - ${formatarStatusManutencao(evento.status_resultante)}` : ""}</span>
              <small>${evento.usuario_nome || "-"}${evento.funcionario_nome ? ` • ${evento.funcionario_nome}` : ""}</small>
              <small>${evento.descricao_evento || "-"}</small>
            </div>
          `).join("") : `<div class="portaria-sessao-log-item acesso-historico-item"><span>Sem eventos registrados.</span></div>`}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Registro fotografico</div>
        <div class="ocorrencia-anexos-grid">
          ${anexos.length ? anexos.map((anexo) => `
            <a href="${anexo.caminho_relativo}" target="_blank" rel="noopener noreferrer" class="ocorrencia-anexo-card">
              <img src="${anexo.caminho_relativo}" alt="${anexo.nome_original || "Foto"}" />
              <span>${anexo.nome_original || "Foto"}</span>
            </a>
          `).join("") : `<div class="portaria-sessao-log-item acesso-historico-item"><span>Sem fotos anexadas.</span></div>`}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeHistoricoManutencaoFooter">Fechar</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  document.body.appendChild(overlay);
  overlay.querySelector("#closeHistoricoManutencao")?.addEventListener("click", close);
  overlay.querySelector("#closeHistoricoManutencaoFooter")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}
