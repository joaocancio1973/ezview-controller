/* ==================================================
   EZVIEW CONTROLLER - DASHBOARD SUPER ADMIN
   Arquivo Unificado (SPA + Auth + Admins)
================================================== */

/* ===============================
   1ï¸âƒ£ AUTENTICAÃ‡ÃƒO
=============================== */
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const token = localStorage.getItem("token");

  if (!token || !user) {
    window.location.href = "/pages/login.html";
    return;
  }

  initHeader(user);
  applyMenuVisibility(user);
  initDarkMode();
  initLogout();
  startSessionHeartbeat(user);
  startMensagensPolling(user);
  initSPA();
  hydrateHeaderContext();
});

/* ===============================
   ðŸ”” TOAST GLOBAL
=============================== */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

/* ===============================
   2ï¸âƒ£ HEADER
=============================== */
function initHeader(user) {
  const userNameEl = document.getElementById("userName");
  const userProfileEl = document.getElementById("userProfile");
  const userAvatarEl = document.getElementById("userAvatar");

  if (userNameEl) userNameEl.textContent = user.nome;

  if (userProfileEl)
    userProfileEl.textContent = user.perfil.replace("_", " ").toUpperCase();

  if (userAvatarEl) {
    preencherAvatarUsuario(userAvatarEl, user);
  }

  document.getElementById("profileContextBtn")?.addEventListener("click", abrirModalMeuPerfil);
}

function getInitialsFromName(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "EZ";
  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "EZ";
}

function preencherAvatarUsuario(element, user) {
  if (!element) return;
  const foto = user?.foto_perfil_url;
  const nome = user?.nome || "";

  if (foto) {
    element.innerHTML = `<img src="${foto}" alt="${nome ? `Foto de ${nome}` : "Foto do perfil"}" />`;
    element.classList.add("has-image");
    return;
  }

  element.classList.remove("has-image");
  element.textContent = getInitialsFromName(nome);
}

function formatarPapelUnidadeHeader(papel) {
  const mapa = {
    titular: "Morador gestor",
    proprietario: "Residente proprietario",
    dependente: "Residente",
  };
  return mapa[papel] || "Morador";
}

function formatarAreaFuncionarioHeader(area) {
  const mapa = {
    portaria: "Portaria",
    limpeza: "Limpeza",
    manutencao: "Manutencao",
    administrativo: "Administrativo",
    outro: "Funcionario",
  };
  return mapa[area] || "Funcionario";
}

async function buscarMeuPerfil() {
  const response = await fetch("http://localhost:3000/auth/me", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar seu perfil");
  }
  return payload?.perfil || null;
}

async function atualizarMeuPerfil(payload) {
  const response = await fetch("http://localhost:3000/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar seu perfil");
  }
  return data?.perfil || null;
}

async function hydrateHeaderContext() {
  try {
    const perfil = await buscarMeuPerfil();
    if (!perfil) return;

    const user = JSON.parse(localStorage.getItem("usuario") || "{}");
    const merged = {
      ...user,
      nome: perfil.nome,
      email: perfil.email,
      perfil: perfil.perfil,
      phone_whatsapp: perfil.phone_whatsapp,
      documento_identificacao: perfil.documento_identificacao,
      foto_perfil_url: perfil.foto_perfil_url,
      contexto: perfil.contexto,
    };

    localStorage.setItem("usuario", JSON.stringify(merged));
    preencherHeaderComContexto(merged);
  } catch (error) {
    console.error("Erro ao hidratar contexto do cabecalho:", error);
  }
}

function preencherHeaderComContexto(user) {
  const userNameEl = document.getElementById("userName");
  const userProfileEl = document.getElementById("userProfile");
  const userAvatarEl = document.getElementById("userAvatar");
  if (userNameEl) userNameEl.textContent = user.nome || "";
  if (userAvatarEl) preencherAvatarUsuario(userAvatarEl, user);
  if (!userProfileEl) return;

  if (user?.perfil === "morador" && user?.contexto) {
    const linhaPerfil = formatarPapelUnidadeHeader(user.contexto.papel_unidade);
    const linhaUnidade = `${user.contexto.unidade_identificacao || "-"}${user.contexto.torre_nome ? ` • ${user.contexto.torre_nome}` : ""}`;
    userProfileEl.innerHTML = `
      <span class="profile-main">${linhaPerfil}</span>
      <span class="profile-context">${linhaUnidade}</span>
    `;
    return;
  }

  if (user?.perfil === "funcionario" && user?.contexto) {
    userProfileEl.innerHTML = `
      <span class="profile-main">${formatarAreaFuncionarioHeader(user.contexto.area_atuacao)}</span>
      <span class="profile-context">${user.contexto.condominio_nome || ""}</span>
    `;
    return;
  }

  if (user?.perfil === "admin" && user?.contexto?.condominio_nome) {
    userProfileEl.innerHTML = `
      <span class="profile-main">Administrador</span>
      <span class="profile-context">${user.contexto.condominio_nome}</span>
    `;
    return;
  }

  userProfileEl.textContent = (user?.perfil || "").replace("_", " ").toUpperCase();
}

async function abrirModalMeuPerfil() {
  const perfil = await buscarMeuPerfil().catch((error) => {
    showToast(error.message || "Erro ao carregar seu perfil", "error");
    return null;
  });

  if (!perfil) return;

  const existing = document.getElementById("modalMeuPerfil");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalMeuPerfil";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal perfil-modal">
      <div class="modal-header">
        <div>
          <h3>Meu perfil</h3>
          <p>Atualize seus dados pessoais e confirme seu contexto no condominio.</p>
        </div>
        <button type="button" class="modal-close" id="closeMeuPerfilModal">&times;</button>
      </div>
      <form id="formMeuPerfil">
        <div class="modal-section">
          <div class="perfil-resumo-card">
            <div class="perfil-resumo-avatar ${perfil.foto_perfil_url ? "has-image" : ""}" id="meuPerfilAvatarPreview">
              ${perfil.foto_perfil_url
                ? `<img src="${perfil.foto_perfil_url}" alt="Foto de ${escapeMensagemHtml(perfil.nome || "perfil")}" />`
                : escapeMensagemHtml(getInitialsFromName(perfil.nome))}
            </div>
            <div class="perfil-resumo-copy">
              <strong>${escapeMensagemHtml(perfil.nome || "-")}</strong>
              <span>${escapeMensagemHtml(perfil.email || "-")}</span>
              <small>${escapeMensagemHtml(perfil.phone_whatsapp || "WhatsApp ainda nao informado")}</small>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Nome
              <input type="text" name="nome" value="${escapeMensagemHtml(perfil.nome || "")}" maxlength="150" required />
            </label>
            <label>Email
              <input type="email" value="${escapeMensagemHtml(perfil.email || "")}" disabled />
            </label>
            <label>WhatsApp
              <input type="text" name="phone_whatsapp" value="${escapeMensagemHtml(perfil.phone_whatsapp || "")}" placeholder="(71) 99999-9999" />
            </label>
            <label>Documento
              <input type="text" name="documento_identificacao" value="${escapeMensagemHtml(perfil.documento_identificacao || "")}" placeholder="CPF ou identificacao" />
            </label>
            <label class="full-width">Foto de perfil
              <input type="file" id="meuPerfilFoto" accept="image/*" capture="environment" />
              <small>Voce pode tirar uma foto agora ou escolher uma imagem do aparelho.</small>
            </label>
          </div>
        </div>
        <div class="modal-section">
          <div class="mensagem-detail-meta-grid">
            <article>
              <span>Perfil</span>
              <strong>${escapeMensagemHtml(perfil.perfil || "-")}</strong>
              <small>${perfil.perfil === "morador" ? formatarPapelUnidadeHeader(perfil.contexto?.papel_unidade) : perfil.perfil === "funcionario" ? formatarAreaFuncionarioHeader(perfil.contexto?.area_atuacao) : "Contexto principal"}</small>
            </article>
            <article>
              <span>Contexto</span>
              <strong>${escapeMensagemHtml(perfil.contexto?.condominio_nome || "-")}</strong>
              <small>${escapeMensagemHtml(perfil.contexto?.unidade_identificacao || perfil.contexto?.matricula || perfil.contexto?.condominio_nome || "-")}${perfil.contexto?.torre_nome ? ` • ${escapeMensagemHtml(perfil.contexto.torre_nome)}` : ""}</small>
            </article>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelMeuPerfilModal">Cancelar</button>
          <button type="submit" class="btn-confirm" id="saveMeuPerfilBtn">Salvar perfil</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");

  const close = () => {
    overlay.remove();
    document.body.classList.remove("modal-open");
  };

  overlay.querySelector("#closeMeuPerfilModal")?.addEventListener("click", close);
  overlay.querySelector("#cancelMeuPerfilModal")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelector("#meuPerfilFoto")?.addEventListener("change", async (event) => {
    try {
      if (!event.target.files?.length) return;
      const [foto] = await lerArquivosComoDataUrl(event.target.files);
      const preview = overlay.querySelector("#meuPerfilAvatarPreview");
      if (preview && foto?.data_url) {
        preview.classList.add("has-image");
        preview.innerHTML = `<img src="${foto.data_url}" alt="Preview da foto de perfil" />`;
      }
    } catch (error) {
      showToast(error.message || "Nao foi possivel preparar a foto", "error");
    }
  });

  overlay.querySelector("#formMeuPerfil")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = overlay.querySelector("#saveMeuPerfilBtn");
    try {
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      const fotoInput = overlay.querySelector("#meuPerfilFoto");
      if (fotoInput?.files?.length) {
        const [foto] = await lerArquivosComoDataUrl(fotoInput.files);
        payload.foto_perfil = foto;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
      const perfilAtualizado = await atualizarMeuPerfil(payload);

      const user = JSON.parse(localStorage.getItem("usuario") || "{}");
      const merged = {
        ...user,
        nome: perfilAtualizado.nome,
        email: perfilAtualizado.email,
        perfil: perfilAtualizado.perfil,
        phone_whatsapp: perfilAtualizado.phone_whatsapp,
        documento_identificacao: perfilAtualizado.documento_identificacao,
        foto_perfil_url: perfilAtualizado.foto_perfil_url,
        contexto: perfilAtualizado.contexto,
      };
      localStorage.setItem("usuario", JSON.stringify(merged));
      preencherHeaderComContexto(merged);
      showToast("Perfil atualizado com sucesso");
      close();
    } catch (error) {
      showToast(error.message || "Erro ao salvar perfil", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar perfil";
    }
  });
}

/* ===============================
   3ï¸âƒ£ DARK MODE
=============================== */
function initDarkMode() {
  const btn = document.getElementById("darkModeToggle");

  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    btn.textContent = "â˜€ï¸";
  }

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark);
    btn.textContent = isDark ? "â˜€ï¸" : "ðŸŒ™";
  });
}

/* ===============================
   4ï¸âƒ£ LOGOUT
=============================== */
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.classList.add("modal-overlay");

    modal.innerHTML = `
      <div class="modal">
        <h3>Encerrar SessÃ£o</h3>
        <p style="margin-bottom:20px;">
          Tem certeza que deseja sair do sistema?
        </p>

        <div class="modal-actions">
          <button type="button" id="cancelLogout">Cancelar</button>
          <button type="button" id="confirmLogout" style="background:#dc2626;color:white;">
            Sair
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    function closeModal() {
      document.body.removeChild(modal);
      document.body.classList.remove("modal-open");
    }

    document
      .getElementById("cancelLogout")
      .addEventListener("click", closeModal);

    document.getElementById("confirmLogout").addEventListener("click", async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          await fetch("/auth/logout", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao encerrar sessao no servidor:", error);
      } finally {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "/pages/login.html";
      }
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  });
}

/* ===============================
   5ï¸âƒ£ SPA
=============================== */
function initSPA() {
  const menuItems = document.querySelectorAll(".menu li");

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page || "dashboard";
      navigate(page);

      menuItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    });
  });

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page") || "dashboard";
  const condominioId = params.get("condominio_id");
  navigate(page, condominioId ? { condominio_id: condominioId } : {});
}

function navigate(page, extraParams = {}) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const allowedPage = getAllowedPage(page, user);

  if (allowedPage !== page) {
    page = allowedPage;
  }

  const params = new URLSearchParams({ page });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  history.pushState({}, "", `?${params.toString()}`);
  syncActiveMenu(page);
  renderPage(page);
}

function getCurrentPage() {
  return new URLSearchParams(window.location.search).get("page") || "dashboard";
}

function syncActiveMenu(page) {
  const targetPage = page === "condominio-dashboard" ? "condominios" : page;
  document.querySelectorAll(".menu li").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === targetPage);
  });
}

function applyMenuVisibility(user) {
  const menuItems = document.querySelectorAll(".menu li[data-visible-for]");

  menuItems.forEach((item) => {
    const allowedProfiles = item.dataset.visibleFor
      .split(",")
      .map((profile) => profile.trim());

    if (!allowedProfiles.includes(user.perfil)) {
      item.remove();
    }
  });
}

function getAllowedPage(page, user) {
  if (page === "condominios" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "torres" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "unidades" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "moradores" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "colaboradores-unidade" && !["admin", "morador"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "residentes-unidade" && user?.perfil !== "morador") {
    return "dashboard";
  }

  if (page === "inbox-unidade" && !["admin", "morador"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "mensagens" && !["admin", "morador", "funcionario"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "funcionarios" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "prestadores-servico" && !["admin", "morador"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "ocorrencias" && !["admin", "morador", "funcionario"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "manutencoes" && !["admin", "funcionario"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "areas-comuns" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "reservas" && !["admin", "morador"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "acessos" && !["admin", "morador", "funcionario"].includes(user?.perfil)) {
    return "dashboard";
  }

  if (page === "veiculos" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "vagas-garagem" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "condominio-dashboard" && user?.perfil !== "admin") {
    return "dashboard";
  }

  if (page === "admins" && user?.perfil !== "super_admin") {
    return "dashboard";
  }

  if (page === "usuarios" && user?.perfil !== "super_admin") {
    return "dashboard";
  }

  return page;
}

function renderPage(page) {
  stopPortariaQueueRefresh();
  stopMoradorAcessosRefresh();
  const container = document.getElementById("spaContent");

  switch (page) {
    case "admins":
      renderAdmins(container);
      break;

    case "usuarios":
      renderUsuarios(container);
      break;

    case "condominios":
      renderCondominios(container);
      break;

    case "condominio-dashboard":
      renderCondominioDashboard(container);
      break;

    case "torres":
      renderTorres(container);
      break;

    case "unidades":
      renderUnidades(container);
      break;

    case "moradores":
      renderMoradores(container);
      break;

    case "colaboradores-unidade":
      renderColaboradoresUnidade(container);
      break;

    case "residentes-unidade":
      renderResidentesUnidade(container);
      break;

    case "inbox-unidade":
      renderInboxUnidade(container);
      break;

    case "mensagens":
      renderMensagens(container);
      break;

    case "funcionarios":
      renderFuncionarios(container);
      break;

    case "prestadores-servico":
      renderPrestadoresServico(container);
      break;

    case "ocorrencias":
      renderOcorrencias(container);
      break;

    case "manutencoes":
      renderManutencoes(container);
      break;

    case "areas-comuns":
      renderAreasComuns(container);
      break;

    case "reservas":
      renderReservas(container);
      break;

    case "acessos":
      renderAcessos(container);
      break;

    case "veiculos":
      renderVeiculos(container);
      break;

    case "vagas-garagem":
      renderVagasGaragem(container);
      break;

    default:
      renderDashboard(container);
  }
}

/* ===============================
   6ï¸âƒ£ DASHBOARD VIEW
=============================== */
function renderDashboard(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));

  if (user?.perfil === "admin") {
    renderDashboardAdmin(container, user);
    return;
  }

  if (user?.perfil === "morador") {
    renderDashboardMorador(container, user);
    return;
  }

  if (user?.perfil === "funcionario") {
    renderDashboardFuncionario(container, user);
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-heading-group">
        <h2>Dashboard</h2>
        <div class="page-subtitle">
          Visao inicial da operacao para acompanhar a estrutura do EzView.
        </div>
      </div>
    </div>

    <div class="panel">
      <p>Bem-vindo ao painel administrativo.</p>
    </div>
  `;
}

async function renderDashboardMorador(container, user) {
  container.innerHTML = `
    <div class="page-header admin-dashboard-header">
      <div class="page-heading-group">
        <h2>Painel do Morador</h2>
        <div class="page-subtitle">
          Acompanhe suas reservas e consulte as areas comuns do seu condominio com uma leitura mais direta.
        </div>
      </div>
    </div>

    <div id="moradorDashboardCards" class="admin-dashboard-grid">
      <div class="overview-card loading">
        <span class="overview-label">RESUMO</span>
        <strong>Carregando...</strong>
        <small>Organizando sua visao inicial no EzView.</small>
      </div>
    </div>

    <div class="panel admin-dashboard-panel">
      <div class="admin-dashboard-section-title">
        <h3>Proximo passo</h3>
        <span>Suas reservas e areas comuns ja podem ser consultadas.</span>
      </div>
      <div class="admin-dashboard-condos">
        <article class="admin-dashboard-condo-card">
          <div class="admin-dashboard-condo-head">
            <div>
              <h4>Central de Reservas</h4>
              <p>Veja areas disponiveis, taxas e o status das suas solicitacoes.</p>
            </div>
          </div>
          <div class="admin-dashboard-condo-meta">
            <span>Visao inicial do morador ja liberada nesta fase</span>
          </div>
          <div class="admin-dashboard-condo-stats">
            <div>
              <strong>Reservas</strong>
              <span>Siga pelo menu lateral para abrir esse modulo.</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  `;

  try {
    const [areas, reservas] = await Promise.all([
      buscarAreasComunsPorCondominio(),
      buscarMinhasReservas(),
    ]);
    const resumo = calcularResumoReservas(reservas);
    const cardsContainer = document.getElementById("moradorDashboardCards");
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="overview-card">
          <span class="overview-label">AREAS</span>
          <strong>${areas.length}</strong>
          <small>Espacos ativos no seu condominio</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">MINHAS RESERVAS</span>
          <strong>${resumo.total}</strong>
          <small>Solicitacoes ligadas ao seu acesso</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">PENDENTES</span>
          <strong>${resumo.pendentes}</strong>
          <small>Aguardando confirmacao</small>
        </div>
      `;
    }
  } catch (error) {
    console.error(error);
  }
}

async function renderDashboardAdmin(container, user) {
  container.innerHTML = `
    <div class="page-header admin-dashboard-header">
      <div class="page-heading-group">
        <h2>Painel do Admin</h2>
        <div class="page-subtitle">
          Resumo executivo do seu ecossistema condominial no EzView.
        </div>
      </div>
    </div>

    <div class="admin-dashboard-grid" id="adminDashboardCards">
      <div class="overview-card loading">
        <span class="overview-label">RESUMO</span>
        <strong>Carregando...</strong>
        <small>Organizando os indicadores do admin.</small>
      </div>
    </div>

    <div class="panel admin-dashboard-panel">
      <div class="admin-dashboard-section-title">
        <h3>Condominios Sob Sua Operacao</h3>
        <span>Leitura rapida dos ativos que ja fazem parte da sua carteira.</span>
      </div>
      <div id="adminDashboardCondos" class="admin-dashboard-condos">
        <p>Carregando condominios...</p>
      </div>
    </div>
  `;

  try {
    const [condominios, capacidade] = await Promise.all([
      buscarCondominiosDoAdmin(),
      fetchResumoCapacidadeAdmin().catch(() => null),
    ]);

    const detalhes = await Promise.all(
      condominios.map(async (condominio) => {
        const [torres, areas, reservas] = await Promise.all([
          buscarTorresPorCondominio(condominio.id).catch(() => []),
          buscarAreasComunsPorCondominio(condominio.id).catch(() => []),
          buscarReservasPorCondominio(condominio.id).catch(() => []),
        ]);

        return {
          ...condominio,
          torres,
          areas,
          reservas,
        };
      }),
    );

    const totalTorres = detalhes.reduce((acc, item) => acc + item.torres.length, 0);
    const totalAreas = detalhes.reduce((acc, item) => acc + item.areas.length, 0);
    const totalReservas = detalhes.reduce((acc, item) => acc + item.reservas.length, 0);
    const cidadesUnicas = new Set(
      detalhes.map((item) => `${item.cidade || ""}/${item.estado || ""}`).filter(Boolean),
    ).size;
    const condosComEndereco = detalhes.filter((item) => item.endereco).length;

    const cards = [
      {
        label: "STATUS DO ADMIN",
        value: formatarStatusUsuario(user?.status),
        meta: "Perfil operacional em atividade no painel atual.",
      },
      {
        label: "CONDOMINIOS",
        value: String(detalhes.length),
        meta: capacidade
          ? `${capacidade.total_condominios} de ${capacidade.limite_condominios} ocupados no plano`
          : "Carteira atual sob sua gestao.",
      },
      {
        label: "ENDERECOS MAPEADOS",
        value: String(condosComEndereco),
        meta: cidadesUnicas > 0 ? `${cidadesUnicas} cidade(s) atendida(s)` : "Base geografica inicial.",
      },
      {
        label: "TORRES CADASTRADAS",
        value: String(totalTorres),
        meta: "Estrutura fisica consolidada para evoluir unidades e moradores.",
      },
      {
        label: "AREAS COMUNS",
        value: String(totalAreas),
        meta: "Espacos compartilhados prontos para reservas.",
      },
      {
        label: "RESERVAS",
        value: String(totalReservas),
        meta: "Agenda operacional registrada ate agora.",
      },
    ];

    const cardsContainer = document.getElementById("adminDashboardCards");
    if (cardsContainer) {
      cardsContainer.innerHTML = cards
        .map(
          (card) => `
            <div class="overview-card">
              <span class="overview-label">${card.label}</span>
              <strong>${card.value}</strong>
              <small>${card.meta}</small>
            </div>
          `,
        )
        .join("");
    }

    const condosContainer = document.getElementById("adminDashboardCondos");
    if (!condosContainer) return;

    if (!detalhes.length) {
      condosContainer.innerHTML = `
        <div class="admin-dashboard-empty">
          Nenhum condominio criado ainda. O dashboard passara a ganhar corpo assim que sua carteira for crescendo.
        </div>
      `;
      return;
    }

    condosContainer.innerHTML = `
      <div class="admin-dashboard-condo-list">
        ${detalhes
          .map(
            (condominio) => {
              const statusOperacional = getStatusOperacionalCondominio(condominio);
              return `
              <article class="admin-dashboard-condo-card">
                <div class="admin-dashboard-condo-head">
                  <button
                    type="button"
                    class="condo-link-button"
                    data-condominio-id="${condominio.id}"
                    data-condominio-nome="${condominio.nome_fantasia}"
                  >
                    ${condominio.nome_fantasia}
                  </button>
                  <span class="admin-dashboard-condo-status ${statusOperacional.variant}">
                    ${statusOperacional.label}
                  </span>
                </div>
                <div class="admin-dashboard-condo-meta">
                  <span>${formatarLocalizacaoCondominio(condominio)}</span>
                  <span>${formatarEnderecoCurto(condominio)}</span>
                </div>
                <div class="admin-dashboard-condo-stats">
                  <div>
                    <strong>${condominio.torres.length}</strong>
                    <span>Torres</span>
                  </div>
                  <div>
                    <strong>${condominio.areas.length}</strong>
                    <span>Areas</span>
                  </div>
                  <div>
                    <strong>${condominio.reservas.length}</strong>
                    <span>Reservas</span>
                  </div>
                </div>
              </article>
            `;
            },
          )
          .join("")}
      </div>
    `;

    condosContainer.querySelectorAll(".condo-link-button").forEach((button) => {
      button.addEventListener("click", () => {
        navigate("condominio-dashboard", {
          condominio_id: button.dataset.condominioId,
        });
      });
    });
  } catch (error) {
    console.error(error);

    const cardsContainer = document.getElementById("adminDashboardCards");
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="overview-card muted">
          <span class="overview-label">RESUMO</span>
          <strong>Indisponivel</strong>
          <small>Nao foi possivel montar o painel do admin neste momento.</small>
        </div>
      `;
    }

    const condosContainer = document.getElementById("adminDashboardCondos");
    if (condosContainer) {
      condosContainer.innerHTML = `
        <div class="admin-dashboard-empty">
          Nao foi possivel carregar o resumo dos condominios agora.
        </div>
      `;
    }
  }
}

function normalizarListaTorres(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.torres)) return payload.torres;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function normalizarListaUnidades(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.unidades)) return payload.unidades;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function normalizarListaReservas(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.reservas)) return payload.reservas;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function formatarDataEscolhidaLabel(dateValue) {
  if (!dateValue) return "Nenhuma data selecionada";

  const [ano, mes, dia] = dateValue.split("-").map(Number);
  const data = new Date(ano, (mes || 1) - 1, dia || 1);

  if (Number.isNaN(data.getTime())) return "Data invalida";

  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function obterDataIsoComOffset(offsetDias = 0) {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + offsetDias);
  return data.toISOString().slice(0, 10);
}

function obterProximoSabadoIso() {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  const diaSemana = data.getDay();
  const diasAteSabado = (6 - diaSemana + 7) % 7 || 7;
  data.setDate(data.getDate() + diasAteSabado);
  return data.toISOString().slice(0, 10);
}

function abrirCalendarioNativo(input) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.focus();
  input.click();
}

function conectarAtalhosDataReserva(config = {}) {
  const {
    input,
    helper,
    openButton,
    quickTodayButton,
    quickTomorrowButton,
    quickSaturdayButton,
    onChange,
  } = config;

  if (!input) return;

  const atualizarHelper = () => {
    if (helper) helper.textContent = formatarDataEscolhidaLabel(input.value);
    if (typeof onChange === "function") onChange(input.value);
  };

  if (openButton) {
    openButton.addEventListener("click", () => abrirCalendarioNativo(input));
  }

  if (quickTodayButton) {
    quickTodayButton.addEventListener("click", () => {
      input.value = obterDataIsoComOffset(0);
      atualizarHelper();
      abrirCalendarioNativo(input);
    });
  }

  if (quickTomorrowButton) {
    quickTomorrowButton.addEventListener("click", () => {
      input.value = obterDataIsoComOffset(1);
      atualizarHelper();
    });
  }

  if (quickSaturdayButton) {
    quickSaturdayButton.addEventListener("click", () => {
      input.value = obterProximoSabadoIso();
      atualizarHelper();
    });
  }

  input.addEventListener("change", atualizarHelper);
  input.addEventListener("input", atualizarHelper);
  atualizarHelper();
}

function formatarDataReservaDia(data) {
  if (!data) return "Sem data";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return "Sem data";
  return parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function calcularResumoReservas(reservas = []) {
  const agora = new Date();
  return reservas.reduce(
    (acc, reserva) => {
      const status = reserva.status || "pendente";
      acc.total += 1;
      if (status === "pendente") acc.pendentes += 1;
      if (status === "confirmada") acc.confirmadas += 1;
      if (status === "cancelada") acc.canceladas += 1;
      if (Number(reserva.dia_inteiro) === 1) acc.diaTodo += 1;
      if (
        status === "pendente" &&
        reserva.data_limite_confirmacao &&
        new Date(reserva.data_limite_confirmacao) >= agora
      ) {
        acc.prazosAbertos += 1;
      }
      return acc;
    },
    {
      total: 0,
      pendentes: 0,
      confirmadas: 0,
      canceladas: 0,
      diaTodo: 0,
      prazosAbertos: 0,
    },
  );
}

function formatarStatusPagamentoReserva(status) {
  const mapa = {
    nao_aplicavel: "Nao se aplica",
    pendente: "Pagamento pendente",
    pago: "Pago",
    isento: "Isento",
    rejeitado: "Rejeitado",
  };

  return mapa[status] || "Nao informado";
}

function formatarStatusUsuario(status) {
  if (!status) return "Ativo";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatarEnderecoCurto(condominio) {
  if (!condominio) return "Endereco nao informado";

  const partes = [
    condominio.endereco,
    condominio.numero,
    condominio.bairro,
  ].filter(Boolean);

  return partes.length ? partes.join(", ") : "Endereco nao informado";
}

function formatarLocalizacaoCondominio(condominio) {
  if (!condominio) return "Localizacao em definicao";

  const partes = [condominio.cidade, condominio.estado].filter(Boolean);
  return partes.length ? partes.join(" / ") : "Localizacao em definicao";
}

function normalizarListaAreas(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.areas)) return payload.areas;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

/* ===============================
   7ï¸âƒ£ ADMINS VIEW
=============================== */
function renderAdmins(container) {
  container.innerHTML = `
    <div class="page-title">Administradores</div>

    <div style="margin-bottom: 15px;">
      <button id="btnNewAdmin">+ Novo Admin</button>
      <button id="btnLoadAdmins">Carregar Admins</button>
    </div>

    <div class="panel">
      <table id="adminsTable">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Plano</th>
            <th>Limite</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colspan="5">Clique em carregar</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div id="modalAdmin" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnLoadAdmins")
    .addEventListener("click", carregarAdmins);

  document
    .getElementById("btnNewAdmin")
    .addEventListener("click", openNewAdminModal);
}

async function openNewAdminModal() {
  const modal = document.getElementById("modalAdmin");

  modal.innerHTML = `
    <div class="modal large">
      <h3>Novo Admin</h3>

      <form id="formAdmin">
        <input
          type="text"
          name="nome_completo"
          placeholder="Nome completo"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          required
        />

        <input
          type="password"
          name="senha"
          placeholder="Senha"
          required
        />

        <select name="plano_id" id="adminPlano" required>
          <option value="">Carregando planos...</option>
        </select>

        <input
          type="number"
          name="limite_condominios"
          placeholder="Limite de condomÃ­nios"
          min="1"
        />

        <div class="modal-actions">
          <button type="button" id="cancelAdminModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Criar</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  document
    .getElementById("cancelAdminModal")
    .addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  try {
    const response = await fetch("http://localhost:3000/planos");
    const data = await response.json();
    const select = document.getElementById("adminPlano");

    if (!response.ok) {
      select.innerHTML = `<option value="">Erro ao carregar planos</option>`;
      return;
    }

    const planos = data.planos || [];

    if (!planos.length) {
      select.innerHTML = `<option value="">Nenhum plano disponÃ­vel</option>`;
      return;
    }

    select.innerHTML = `
      <option value="">Selecione um plano</option>
      ${planos
        .map((plano) => `<option value="${plano.id}">${plano.nome}</option>`)
        .join("")}
    `;
  } catch (error) {
    console.error(error);
    document.getElementById("adminPlano").innerHTML =
      `<option value="">Erro ao carregar planos</option>`;
  }

  document
    .getElementById("formAdmin")
    .addEventListener("submit", submitCriarAdmin);
}

async function submitCriarAdmin(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  if (!dados.limite_condominios) {
    delete dados.limite_condominios;
  }

  try {
    const response = await fetch("http://localhost:3000/admins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json();

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar admin", "error");
      return;
    }

    showToast("Admin criado com sucesso");

    const modal = document.getElementById("modalAdmin");
    modal.classList.add("hidden");
    modal.innerHTML = "";

    carregarAdmins();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexÃ£o ao criar admin", "error");
  }
}

/* ===============================
   8ï¸âƒ£ BUSCAR ADMINS
=============================== */
async function carregarAdmins() {
  const token = localStorage.getItem("token");
  const tbody = document.querySelector("#adminsTable tbody");

  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="spinner"></div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch("http://localhost:3000/admins", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.erro || "Erro ao buscar admins", "error");
      return;
    }

    tbody.innerHTML = "";

    data.admins.forEach((admin) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${admin.nome_completo}</td>
        <td>${admin.email}</td>
        <td>${admin.plano_nome}</td>
        <td>${admin.limite_condominios || "-"}</td>
        <td>
          <span class="status-badge status-${admin.admin_status}">
            ${admin.admin_status}
          </span>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    showToast("Erro ao carregar admins", "error");
  }
}

function renderUsuarios(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isSuperAdmin = user && user.perfil === "super_admin";

  if (!isSuperAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>Usuarios do Sistema</h2>

      <button id="btnLoadUsuarios">Carregar Usuarios</button>
    </div>

    <div class="panel">
      <table id="usersTable">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Criado em</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colspan="5">Clique em carregar</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  document
    .getElementById("btnLoadUsuarios")
    .addEventListener("click", carregarUsuarios);
}

async function carregarUsuarios() {
  const token = localStorage.getItem("token");
  const tbody = document.querySelector("#usersTable tbody");

  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="spinner"></div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch("http://localhost:3000/usuarios", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.erro || "Erro ao buscar usuarios", "error");
      return;
    }

    tbody.innerHTML = "";

    data.usuarios.forEach((usuario) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${usuario.nome_completo}</td>
        <td>${usuario.email}</td>
        <td>${formatarPerfil(usuario.perfil)}</td>
        <td>
          <span class="status-badge status-${usuario.status}">
            ${usuario.status}
          </span>
        </td>
        <td>${formatarData(usuario.criado_em)}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    showToast("Erro ao carregar usuarios", "error");
  }
}

function formatarPerfil(perfil) {
  if (!perfil) return "-";

  return perfil
    .split("_")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function formatarData(data) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function formatarFaixaAndares(andarInicial, andarFinal, quantidadeAndares) {
  if (andarInicial === null || andarInicial === undefined) return "-";

  const inicio = Number(andarInicial);
  const quantidade = Number(quantidadeAndares || 0);
  const fim =
    andarFinal === null || andarFinal === undefined
      ? inicio + Math.max(quantidade, 1) - 1
      : Number(andarFinal);

  if (quantidade <= 1 || inicio === fim) {
    return `Andar ${inicio}`;
  }

  return `${inicio} ao ${fim}`;
}

function formatarTipoUnidade(tipo) {
  const tipos = {
    casa: "Casa",
    apartamento: "Apartamento",
    sala: "Sala",
    outro: "Outro",
  };

  return tipos[tipo] || (tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "-");
}

/* ===============================
   9ï¸âƒ£ CONDOMÃNIOS
=============================== */

function renderCondominios(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header condos-page-header">
      <div class="page-heading-group">
        <h2>Condominios</h2>
        <div id="adminCapacityHint" class="capacity-hint">Consultando limite disponivel...</div>
      </div>

      <button id="btnNovoCondominio" class="btn-primary">
        + Novo Condominio
      </button>
    </div>

    <div id="condominiosList">
      <p>Carregando...</p>
    </div>

    <div id="modalCondominio" class="modal-overlay hidden"></div>
  `;

  const btn = document.getElementById("btnNovoCondominio");

  if (btn) {
    btn.addEventListener("click", abrirModalCriacaoCondominio);
  }

  carregarResumoCapacidadeAdmin();
  carregarCondominios();
}

async function carregarResumoCapacidadeAdmin() {
  const hint = document.getElementById("adminCapacityHint");

  if (!hint) return;

  try {
    const resumo = await fetchResumoCapacidadeAdmin();
    hint.textContent = `${resumo.total_condominios} de ${resumo.limite_condominios} usados - ${resumo.saldo_condominios} restantes`;
    hint.dataset.state = resumo.saldo_condominios > 0 ? "ok" : "full";
  } catch (error) {
    console.error(error);
    hint.textContent = "Limite de condominios indisponivel no momento.";
    hint.dataset.state = "error";
  }
}

async function fetchResumoCapacidadeAdmin() {
  const response = await fetch("http://localhost:3000/admins/me/capacidade", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.resumo) {
    throw new Error(data?.erro || "Limite de condominios indisponivel");
  }

  return data.resumo;
}

/* ===============================
   MODAL CRIAR CONDOMÃNIO
=============================== */

function abrirModalCriacaoCondominio() {
  const modal = document.getElementById("modalCondominio");

  modal.innerHTML = `
    <div class="modal large condominio-modal">
      <button
        type="button"
        class="modal-close"
        id="closeCondominioModal"
        aria-label="Fechar formulario"
      >
        x
      </button>

      <div class="condominio-modal-hero">
        <span class="modal-kicker">EzView | Estrutura Condominial</span>
        <h3>Novo Condominio</h3>
        <p>
          Cadastre o condominio principal com dados institucionais e endereco
          completo. O fluxo foi preparado para receber integracao com CEP na
          proxima etapa.
        </p>
      </div>

      <form id="formCondominio" class="condominio-form">
        <section class="condominio-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Identificacao do condominio</h4>
              <p>Dados juridicos e informacoes que definem a base do cadastro.</p>
            </div>
          </div>

          <div class="condominio-grid condominio-grid-2">
            <label class="field-block field-wide">
              <span>CNPJ</span>
              <input
                type="text"
                name="cnpj"
                id="cnpj"
                maxlength="18"
                placeholder="00.000.000/0000-00"
                required
              />
            </label>

            <label class="field-block">
              <span>Tipo</span>
              <select name="tipo" required>
                <option value="">Selecione o tipo</option>
                <option value="predio">Predio</option>
                <option value="casas">Casas</option>
                <option value="misto">Misto</option>
              </select>
            </label>

            <label class="field-block field-wide">
              <span>Razao social</span>
              <input
                name="razao_social"
                placeholder="Nome juridico do condominio"
                required
              />
            </label>

            <label class="field-block field-wide">
              <span>Nome fantasia</span>
              <input
                name="nome_fantasia"
                placeholder="Nome exibido no sistema"
                required
              />
            </label>
          </div>
        </section>

        <section class="condominio-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Endereco principal</h4>
              <p>Preencha o CEP e os campos do local do condominio.</p>
            </div>
          </div>

          <div class="condominio-grid condominio-grid-3">
            <label class="field-block">
              <span>CEP</span>
              <input name="cep" id="cep" placeholder="00000-000" required />
              <small id="cepStatus" class="field-help">Informe o CEP para preencher o endereco automaticamente.</small>
            </label>

            <label class="field-block field-span-2">
              <span>Endereco</span>
              <input
                name="endereco"
                id="endereco"
                placeholder="Rua, avenida ou logradouro"
                required
              />
            </label>

            <label class="field-block">
              <span>Numero</span>
              <input name="numero" placeholder="Numero" />
            </label>

            <label class="field-block field-span-2">
              <span>Complemento</span>
              <input name="complemento" placeholder="Bloco, portaria ou referencia" />
            </label>

            <label class="field-block">
              <span>Bairro</span>
              <input name="bairro" id="bairro" placeholder="Bairro" />
            </label>

            <label class="field-block">
              <span>Cidade</span>
              <input name="cidade" id="cidade" placeholder="Cidade" />
            </label>

            <label class="field-block">
              <span>Estado</span>
              <input name="estado" id="estado" placeholder="Estado" />
            </label>
          </div>
        </section>

        <div class="condominio-modal-footer">
          <div class="footer-note">
            O cadastro cria a base institucional do condominio para as proximas
            etapas de torres, unidades e moradores.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Criar condominio</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const inputCnpj = document.getElementById("cnpj");
  const inputCep = document.getElementById("cep");

  aplicarMascaraCNPJ(inputCnpj);
  aplicarMascaraCEP(inputCep);
  initCepAutocomplete();

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  document.getElementById("cancelModal").addEventListener("click", fecharModal);
  document
    .getElementById("closeCondominioModal")
    .addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  document
    .getElementById("formCondominio")
    .addEventListener("submit", submitCriarCondominio);
}

/* ===============================
   MÃSCARA CNPJ
=============================== */

function aplicarMascaraCNPJ(input) {
  input.addEventListener("input", (e) => {
    let valor = e.target.value.replace(/\D/g, "");

    valor = valor
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");

    e.target.value = valor.substring(0, 18);
  });
}

function formatarCNPJ(cnpj) {
  if (!cnpj) return "";

  cnpj = cnpj.replace(/\D/g, "");

  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

const UF_LABELS = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapa",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceara",
  DF: "Distrito Federal",
  ES: "Espirito Santo",
  GO: "Goias",
  MA: "Maranhao",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Para",
  PB: "Paraiba",
  PR: "Parana",
  PE: "Pernambuco",
  PI: "Piaui",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondonia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "Sao Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function aplicarMascaraCEP(input) {
  if (!input) return;

  input.addEventListener("input", (e) => {
    let valor = e.target.value.replace(/\D/g, "").slice(0, 8);

    if (valor.length > 5) {
      valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
    }

    e.target.value = valor;
  });
}

function getCepStatusElement() {
  return document.getElementById("cepStatus");
}

function updateCepStatus(message, state = "neutral") {
  const statusEl = getCepStatusElement();

  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setEnderecoLoadingState(isLoading) {
  ["endereco", "bairro", "cidade", "estado"].forEach((fieldId) => {
    const field = document.getElementById(fieldId);

    if (field) {
      field.disabled = isLoading;
    }
  });
}

function limparEnderecoAutopreenchido() {
  ["endereco", "bairro", "cidade", "estado"].forEach((fieldId) => {
    const field = document.getElementById(fieldId);

    if (field) {
      field.value = "";
    }
  });
}

function preencherEnderecoAutopreenchido(data) {
  const endereco = document.getElementById("endereco");
  const bairro = document.getElementById("bairro");
  const cidade = document.getElementById("cidade");
  const estado = document.getElementById("estado");

  if (endereco) endereco.value = data.logradouro || "";
  if (bairro) bairro.value = data.bairro || "";
  if (cidade) cidade.value = data.localidade || "";
  if (estado) estado.value = UF_LABELS[data.uf] || data.uf || "";
}

async function buscarEnderecoPorCep(cep) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

  if (!response.ok) {
    throw new Error("Nao foi possivel consultar o CEP agora");
  }

  const data = await response.json();

  if (data.erro) {
    throw new Error("CEP nao encontrado");
  }

  return data;
}

function initCepAutocomplete() {
  const inputCep = document.getElementById("cep");

  if (!inputCep) return;

  let lastFetchedCep = "";

  const consultarCep = async () => {
    const cep = inputCep.value.replace(/\D/g, "");

    if (cep.length === 0) {
      updateCepStatus("Informe o CEP para preencher o endereco automaticamente.");
      limparEnderecoAutopreenchido();
      lastFetchedCep = "";
      return;
    }

    if (cep.length < 8) {
      updateCepStatus("Digite um CEP valido com 8 numeros.", "warning");
      return;
    }

    if (cep === lastFetchedCep) {
      return;
    }

    updateCepStatus("Consultando CEP...", "loading");
    setEnderecoLoadingState(true);

    try {
      const data = await buscarEnderecoPorCep(cep);
      preencherEnderecoAutopreenchido(data);
      lastFetchedCep = cep;
      updateCepStatus("Endereco preenchido automaticamente. Voce pode ajustar se precisar.", "success");
    } catch (error) {
      limparEnderecoAutopreenchido();
      updateCepStatus(error.message || "Falha ao consultar o CEP.", "error");
      showToast(error.message || "Falha ao consultar o CEP", "error");
    } finally {
      setEnderecoLoadingState(false);
    }
  };

  inputCep.addEventListener("input", () => {
    const cep = inputCep.value.replace(/\D/g, "");

    if (cep.length < 8) {
      lastFetchedCep = "";
    }

    if (cep.length === 8) {
      consultarCep();
    }
  });

  inputCep.addEventListener("blur", consultarCep);
}

/* ===============================
   SUBMIT CRIAR CONDOMÃNIO
=============================== */

async function submitCriarCondominio(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  dados.cnpj = dados.cnpj.replace(/\D/g, "");

  try {
    const response = await fetch("http://localhost:3000/condominios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json();

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar condominio", "error");
      return;
    }

    showToast("CondomÃ­nio criado com sucesso");

    document.getElementById("modalCondominio").classList.add("hidden");
    document.getElementById("modalCondominio").innerHTML = "";

    carregarCondominios();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao criar condominio", "error");
  }
}

/* ===============================
   LISTAR CONDOMÃNIOS
=============================== */

async function carregarCondominios() {
  try {
    const response = await fetch("http://localhost:3000/condominios", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await response.json();
    const container = document.getElementById("condominiosList");

    if (!response.ok) {
      container.innerHTML = "<p>Erro ao carregar.</p>";
      return;
    }

    if (!data.length) {
      container.innerHTML = "<p>Nenhum condomÃ­nio cadastrado.</p>";
      return;
    }

    container.innerHTML = `
      <table class="table condos-table">

        <thead>
          <tr>
            <th>Nome</th>
            <th>CNPJ</th>
            <th>Cidade</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>

          ${data
            .map(
              (c) => `
              <tr>
                <td class="condos-name-cell">
                  <button
                    type="button"
                    class="condo-link-button"
                    data-condominio-id="${c.id}"
                    data-condominio-nome="${c.nome_fantasia}"
                  >
                    ${c.nome_fantasia}
                  </button>
                </td>
                <td class="condos-cnpj-cell">${formatarCNPJ(c.cnpj)}</td>
                <td>${c.cidade || "-"}</td>
                <td>${c.estado || "-"}</td>
              </tr>
          `,
            )
            .join("")}

        </tbody>

      </table>
    `;

    container.querySelectorAll(".condo-link-button").forEach((button) => {
      button.addEventListener("click", () => {
        navigate("condominio-dashboard", {
          condominio_id: button.dataset.condominioId,
        });
      });
    });
  } catch (err) {
    console.error(err);

    document.getElementById("condominiosList").innerHTML =
      "<p>Erro de conexÃ£o.</p>";
  }
}

async function renderCondominioDashboard(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const condominioId = params.get("condominio_id");

  if (!condominioId) {
    navigate("condominios");
    return;
  }

  container.innerHTML = `
    <div class="page-header condo-overview-header">
      <div class="page-heading-group">
        <button type="button" class="back-link-button" id="btnBackToCondominios">
          Voltar para Condominios
        </button>
        <h2 id="condominioOverviewTitle">Carregando condominio...</h2>
        <div class="page-subtitle" id="condominioOverviewSubtitle">
          Preparando o resumo estrutural do condominio.
        </div>
      </div>

      <div class="condo-overview-actions">
        <button type="button" class="btn-secondary-soft" id="btnOverviewTorres">
          Ver Torres
        </button>
        <button type="button" class="btn-primary" id="btnOverviewUnidades">
          Ver Unidades
        </button>
      </div>
    </div>

    <div class="condo-overview-grid" id="condominioOverviewCards">
      <div class="overview-card loading">Carregando resumo estrutural...</div>
    </div>

    <div class="panel condo-overview-panel">
      <div class="condo-overview-section">
        <h3>Visao Atual</h3>
        <p id="condominioOverviewNarrative">
          Este painel passa a concentrar o estado atual do condominio. Moradores, financeiro, reservas e pendencias entram aqui nas proximas etapas.
        </p>
      </div>

      <div class="condo-overview-section">
        <h3>Proximos Blocos</h3>
        <div class="condo-next-grid">
          <div class="condo-next-card">
            <strong>Moradores e Vinculos</strong>
            <span>Titular, dependentes e ocupacao real da unidade.</span>
          </div>
          <div class="condo-next-card">
            <strong>Financeiro</strong>
            <span>Adimplencia, recebimento, pendencias e leitura por unidade.</span>
          </div>
          <div class="condo-next-card">
            <strong>Reservas e Agenda</strong>
            <span>Areas comuns, horarios, taxa e agenda operacional.</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("btnBackToCondominios")
    .addEventListener("click", () => navigate("condominios"));

  document
    .getElementById("btnOverviewTorres")
    .addEventListener("click", () => navigate("torres"));

  document
    .getElementById("btnOverviewUnidades")
    .addEventListener("click", () => navigate("unidades"));

  await carregarResumoCondominio(condominioId);
}

async function carregarResumoCondominio(condominioId) {
  const title = document.getElementById("condominioOverviewTitle");
  const subtitle = document.getElementById("condominioOverviewSubtitle");
  const cards = document.getElementById("condominioOverviewCards");
  const narrative = document.getElementById("condominioOverviewNarrative");

  if (!title || !subtitle || !cards || !narrative) return;

  try {
    const [condominiosResponse, torresResponse, unidadesResponse] = await Promise.all([
      fetch("http://localhost:3000/condominios", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      }),
      fetch(
        `http://localhost:3000/torres?condominio_id=${encodeURIComponent(condominioId)}`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        },
      ),
      fetch(
        `http://localhost:3000/unidades?condominio_id=${encodeURIComponent(condominioId)}`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        },
      ),
    ]);

    const condominiosPayload = await condominiosResponse.json().catch(() => []);
    const torresPayload = await torresResponse.json().catch(() => ({}));
    const unidadesPayload = await unidadesResponse.json().catch(() => ({}));

    if (!condominiosResponse.ok || !torresResponse.ok || !unidadesResponse.ok) {
      throw new Error("Nao foi possivel carregar o resumo do condominio");
    }

    const condominios = normalizarListaCondominios(condominiosPayload);
    const torres = normalizarListaTorres(torresPayload);
    const unidades = normalizarListaUnidades(unidadesPayload);
    const condominio = condominios.find((item) => item.id === condominioId);

    if (!condominio) {
      throw new Error("Condominio nao encontrado no contexto do admin");
    }

    const totalAndaresMapeados = torres.reduce(
      (acc, torre) => acc + Number(torre.quantidade_andares || 0),
      0,
    );
    const ultimoPavimento = torres.reduce(
      (max, torre) => Math.max(max, Number(torre.andar_final || 0)),
      0,
    );
    const unidadesComTorre = unidades.filter((unidade) => unidade.torre_id).length;

    title.textContent = condominio.nome_fantasia;
    subtitle.textContent = `${condominio.cidade || "Cidade nao informada"} - ${condominio.estado || "Estado nao informado"}`;

    cards.innerHTML = `
      <div class="overview-card">
        <span class="overview-label">Torres</span>
        <strong>${torres.length}</strong>
        <small>Estruturas fisicas cadastradas</small>
      </div>
      <div class="overview-card">
        <span class="overview-label">Unidades</span>
        <strong>${unidades.length}</strong>
        <small>Base estrutural atualmente criada</small>
      </div>
      <div class="overview-card">
        <span class="overview-label">Andares Mapeados</span>
        <strong>${totalAndaresMapeados}</strong>
        <small>Soma das faixas de andares das torres</small>
      </div>
      <div class="overview-card">
        <span class="overview-label">Ultimo Pavimento</span>
        <strong>${ultimoPavimento || "-"}</strong>
        <small>Maior andar atualmente configurado</small>
      </div>
      <div class="overview-card">
        <span class="overview-label">Unidades em Torre</span>
        <strong>${unidadesComTorre}</strong>
        <small>Unidades vinculadas a torres</small>
      </div>
      <div class="overview-card muted">
        <span class="overview-label">Financeiro</span>
        <strong>Em preparacao</strong>
        <small>Resumo de adimplencia e recebimentos entra no proximo bloco</small>
      </div>
    `;

    narrative.textContent =
      `${condominio.nome_fantasia} ja possui ${torres.length} torre(s) e ${unidades.length} unidade(s) estruturadas. Este painel passa a ser a porta de entrada do contexto do condominio para moradores, financeiro, reservas e operacao.`;
  } catch (error) {
    console.error(error);
    title.textContent = "Condominio indisponivel";
    subtitle.textContent = "Nao foi possivel montar o resumo deste condominio agora.";
    cards.innerHTML = `
      <div class="overview-card muted">
        <span class="overview-label">Resumo</span>
        <strong>Indisponivel</strong>
        <small>Tente novamente em instantes.</small>
      </div>
    `;
    narrative.textContent =
      "A visao do condominio nao pode ser carregada agora, mas a estrutura da SPA ja esta pronta para virar o dashboard operacional dedicado.";
  }
}

async function buscarAreasComunsPorCondominio(condominioId) {
  try {
    const query = new URLSearchParams();
    if (condominioId) {
      query.set("condominio_id", condominioId);
    }

    const response = await fetch(`http://localhost:3000/areas-comuns${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return [];
    }

    return normalizarListaAreas(payload);
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarMinhasReservas(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);

    const response = await fetch(`http://localhost:3000/reservas${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.erro || "Erro ao consultar reservas");
    }

    return normalizarListaReservas(payload);
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarAgendaMorador(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.area_id) query.set("area_id", params.area_id);

    const response = await fetch(`http://localhost:3000/reservas/agenda${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.erro || "Erro ao consultar agenda");
    }

    if (Array.isArray(payload?.agenda)) return payload.agenda;
    if (Array.isArray(payload)) return payload;
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function montarDisponibilidadeAreas(agenda = []) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeIso = hoje.toISOString().slice(0, 10);
  const mapa = {};

  agenda.forEach((item) => {
    if (!item?.area_id) return;
    if (!mapa[item.area_id]) {
      mapa[item.area_id] = {
        totalEventos: 0,
        totalHoje: 0,
        proximaReferencia: null,
      };
    }

    mapa[item.area_id].totalEventos += Number(item.total_reservas || 0);

    const diaReferencia = item.dia_referencia
      ? new Date(item.dia_referencia).toISOString().slice(0, 10)
      : null;

    if (diaReferencia === hojeIso) {
      mapa[item.area_id].totalHoje += Number(item.total_reservas || 0);
    }

    if (
      item.proxima_ocupacao_inicio &&
      (!mapa[item.area_id].proximaReferencia ||
        new Date(item.proxima_ocupacao_inicio) < new Date(mapa[item.area_id].proximaReferencia))
    ) {
      mapa[item.area_id].proximaReferencia = item.proxima_ocupacao_inicio;
    }
  });

  return mapa;
}

function descreverDisponibilidadeArea(area, disponibilidade = {}) {
  if (Number(area.exige_reserva) !== 1) {
    return {
      tone: "neutral",
      title: "Uso livre",
      detail: "Nao depende de solicitacao formal",
    };
  }

  if (Number(disponibilidade.totalHoje || 0) > 0) {
    return {
      tone: "busy",
      title: "Com agenda hoje",
      detail: `${disponibilidade.totalHoje} reserva(s) no dia de hoje`,
    };
  }

  if (disponibilidade.proximaReferencia) {
    return {
      tone: "scheduled",
      title: "Proxima ocupacao",
      detail: formatarDataHoraReserva(disponibilidade.proximaReferencia, 0),
    };
  }

  return {
    tone: "free",
    title: "Livre hoje",
    detail: "Nenhuma ocupacao encontrada no periodo atual",
  };
}

async function buscarTorresPorCondominio(condominioId) {
  if (!condominioId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/torres?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const torres = normalizarListaTorres(payload);

    if (!response.ok) {
      return [];
    }

    return torres;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarReservasPorCondominio(condominioId) {
  if (!condominioId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/reservas?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const reservas = normalizarListaReservas(payload);

    if (!response.ok) {
      return [];
    }

    return reservas;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarMoradoresPorFiltro(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  try {
    const response = await fetch(`http://localhost:3000/moradores?${query.toString()}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const payload = await response.json().catch(() => ({}));
    const moradores = Array.isArray(payload?.moradores) ? payload.moradores : [];

    if (!response.ok) {
      return [];
    }

    return moradores;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarCatalogoVeiculoMarcas(tipo) {
  if (!tipo) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/veiculos/catalogo/marcas?tipo=${encodeURIComponent(tipo)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const marcas = Array.isArray(payload?.marcas) ? payload.marcas : [];

    if (!response.ok) {
      return [];
    }

    return marcas;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarCatalogoVeiculoModelos(marcaId) {
  if (!marcaId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/veiculos/catalogo/modelos?marca_id=${encodeURIComponent(marcaId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const modelos = Array.isArray(payload?.modelos) ? payload.modelos : [];

    if (!response.ok) {
      return [];
    }

    return modelos;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarCatalogoVeiculoAnos(modeloId) {
  if (!modeloId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/veiculos/catalogo/anos?modelo_id=${encodeURIComponent(modeloId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const anos = Array.isArray(payload?.anos) ? payload.anos : [];

    if (!response.ok) {
      return [];
    }

    return anos;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function buscarVeiculoPorId(veiculoId) {
  if (!veiculoId) return null;

  const response = await fetch(`http://localhost:3000/veiculos/${encodeURIComponent(veiculoId)}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar o veiculo");
  }

  return payload?.veiculo || null;
}

async function buscarVagasPorCondominio(condominioId) {
  if (!condominioId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/vagas-garagem?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const vagas = Array.isArray(payload?.vagas) ? payload.vagas : Array.isArray(payload) ? payload : [];

    if (!response.ok) {
      return [];
    }

    return vagas;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function formatarStatusConvite(status) {
  const map = {
    pendente: "Pendente",
    aceito: "Aceito",
    expirado: "Expirado",
    cancelado: "Cancelado",
  };

  return map[status] || "Sem convite";
}

function abrirResumoConviteMorador({ nome, email, link }) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal">
      <h3>Convite de Ativacao</h3>
      <p style="margin-bottom: 14px;">
        O morador <strong>${nome}</strong> foi preparado para ativacao.
      </p>
      <div class="invite-link-panel">
        <small>${email}</small>
        <code id="inviteLinkField">${link}</code>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeInvitePreview">Fechar</button>
        <button type="button" id="copyInviteLink" class="btn-confirm">Copiar Link</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.getElementById("closeInvitePreview").addEventListener("click", closeModal);
  document.getElementById("copyInviteLink").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link de ativacao copiado");
    } catch (error) {
      console.error(error);
      showToast("Nao foi possivel copiar o link automaticamente", "error");
    }
  });
}

async function buscarUnidadesPorCondominio(condominioId) {
  if (!condominioId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/unidades?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return [];
    }

    return normalizarListaUnidades(payload);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function formatarMoeda(valor) {
  if (valor === undefined || valor === null || valor === "") return "Nao informado";

  const numero = Number(valor);

  if (Number.isNaN(numero)) return "Nao informado";

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHoraReserva(data, diaInteiro = 0) {
  if (!data) return "-";

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) return "-";

  if (Number(diaInteiro) === 1) {
    return parsed.toLocaleDateString("pt-BR");
  }

  return parsed.toLocaleString("pt-BR");
}

async function renderAreasComuns(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header areas-page-header">
      <div class="page-heading-group">
        <h2>Areas Comuns</h2>
        <div class="page-subtitle">
          Catalogue os espacos compartilhados do condominio e prepare o fluxo de reservas.
        </div>
      </div>

      <button id="btnNovaAreaComum" class="btn-primary" disabled>
        + Nova Area
      </button>
    </div>

    <div class="panel areas-panel">
      <div class="areas-toolbar">
        <label class="areas-filter">
          <span>Condominio</span>
          <select id="areaCondominioFilter">
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <div class="areas-toolbar-actions">
          <button type="button" id="btnLoadAreas">Carregar Areas</button>
          <span id="areasStatus" class="areas-status">
            Selecione um condominio para continuar
          </span>
        </div>
      </div>

      <div id="areasList" class="areas-list">
        <div class="areas-empty">
          Aguardando selecao de um condominio para listar as areas comuns.
        </div>
      </div>
    </div>

    <div id="modalAreaComum" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnNovaAreaComum")
    .addEventListener("click", abrirModalCriacaoAreaComum);
  document
    .getElementById("btnLoadAreas")
    .addEventListener("click", carregarAreasComuns);
  document
    .getElementById("areaCondominioFilter")
    .addEventListener("change", carregarAreasComuns);

  await carregarCondominiosParaAreasComuns();
}

async function carregarCondominiosParaAreasComuns() {
  const select = document.getElementById("areaCondominioFilter");
  const status = document.getElementById("areasStatus");
  const button = document.getElementById("btnNovaAreaComum");
  const params = new URLSearchParams(window.location.search);
  const condominioIdPreSelecionado = params.get("condominio_id");

  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();

    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      if (button) button.disabled = true;
      if (status) status.textContent = "Cadastre um condominio antes de criar areas comuns";
      return;
    }

    select.disabled = false;
    if (button) button.disabled = false;
    select.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) => `
            <option value="${condominio.id}">
              ${condominio.nome_fantasia}
            </option>
          `,
        )
        .join("")}
    `;

    select.value =
      condominios.find((item) => item.id === condominioIdPreSelecionado)?.id ||
      condominios[0].id;
    await carregarAreasComuns();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
    if (button) button.disabled = true;
    if (status) status.textContent = "Erro ao carregar condominios";
  }
}

async function carregarAreasComuns() {
  const select = document.getElementById("areaCondominioFilter");
  const container = document.getElementById("areasList");
  const status = document.getElementById("areasStatus");

  if (!select || !container) return;

  const condominioId = select.value;

  if (!condominioId) {
    container.innerHTML = `
      <div class="areas-empty">
        Selecione um condominio para visualizar as areas comuns.
      </div>
    `;
    if (status) status.textContent = "Nenhum condominio selecionado";
    return;
  }

  container.innerHTML = `
    <div class="areas-loading">
      <div class="spinner"></div>
      <p>Carregando areas comuns...</p>
    </div>
  `;
  if (status) status.textContent = "Consultando areas comuns...";

  try {
    const response = await fetch(
      `http://localhost:3000/areas-comuns?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json().catch(() => ({}));
    const areas = normalizarListaAreas(payload);

    if (!response.ok) {
      throw new Error(payload.erro || "Erro ao carregar areas comuns");
    }

    if (!areas.length) {
      container.innerHTML = `
        <div class="areas-empty">
          Nenhuma area comum cadastrada para este condominio.
        </div>
      `;
      if (status) status.textContent = "Lista vazia";
      return;
    }

    container.innerHTML = `
      <table class="areas-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Reserva</th>
            <th>Taxa</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${areas
            .map(
              (area) => `
                <tr>
                  <td class="areas-name-cell">
                    <strong>${area.nome}</strong>
                    <small>${area.descricao || "Sem descricao complementar"}</small>
                  </td>
                  <td>${Number(area.exige_reserva) === 1 ? "Obrigatoria" : "Livre"}</td>
                  <td>${Number(area.exige_taxa) === 1 ? "Com taxa" : "Sem taxa"}</td>
                  <td>${Number(area.exige_taxa) === 1 ? formatarMoeda(area.valor_taxa) : "-"}</td>
                  <td>
                    <span class="areas-badge ${Number(area.ativo) === 1 ? "areas-badge-active" : "areas-badge-muted"}">
                      ${Number(area.ativo) === 1 ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    if (status) status.textContent = `${areas.length} area(s) comum(ns) carregada(s)`;
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="areas-empty">
        Nao foi possivel consultar as areas comuns agora.
      </div>
    `;
    if (status) status.textContent = "Erro ao consultar areas comuns";
  }
}

function abrirModalCriacaoAreaComum() {
  const modal = document.getElementById("modalAreaComum");
  const condominioSelect = document.getElementById("areaCondominioFilter");

  if (!modal) return;

  const optionsCondominio = condominioSelect
    ? Array.from(condominioSelect.options)
        .filter((option) => option.value)
        .map((option) => `<option value="${option.value}">${option.textContent}</option>`)
        .join("")
    : "";

  modal.innerHTML = `
    <div class="modal large area-modal">
      <button type="button" class="modal-close" id="closeAreaModal" aria-label="Fechar formulario">
        x
      </button>

      <div class="area-modal-hero">
        <span class="modal-kicker">EzView | Operacao Condominial</span>
        <h3>Nova Area Comum</h3>
        <p>
          Cadastre os espacos compartilhados do condominio e deixe a reserva preparada para a proxima etapa.
        </p>
      </div>

      <form id="formAreaComum" class="area-form">
        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Identificacao da area</h4>
              <p>Escolha o condominio e nomeie o espaco de forma clara para a operacao.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-2">
            <label class="field-block field-wide">
              <span>Condominio</span>
              <select name="condominio_id" required>
                <option value="">Selecione um condominio</option>
                ${optionsCondominio}
              </select>
            </label>

            <label class="field-block field-wide">
              <span>Nome da area</span>
              <input name="nome" placeholder="Ex: Salao de Festas 1, Piscina Adulto" required />
            </label>

            <label class="field-block field-span-2">
              <span>Descricao</span>
              <textarea name="descricao" rows="3" placeholder="Detalhes de uso, localizacao ou orientacoes operacionais"></textarea>
            </label>
          </div>
        </section>

        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Regras basicas</h4>
              <p>Defina se a area exige reserva, taxa e como ela se apresenta no catalogo.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-4">
            <label class="field-block">
              <span>Exige reserva</span>
              <select name="exige_reserva" required>
                <option value="1">Sim</option>
                <option value="0">Nao</option>
              </select>
            </label>

            <label class="field-block">
              <span>Exige taxa</span>
              <select name="exige_taxa" id="areaExigeTaxa" required>
                <option value="0">Nao</option>
                <option value="1">Sim</option>
              </select>
            </label>

            <label class="field-block">
              <span>Valor da taxa</span>
              <input name="valor_taxa" id="areaValorTaxa" type="number" min="0" step="0.01" placeholder="0,00" disabled />
            </label>

            <label class="field-block">
              <span>Status</span>
              <select name="ativo" required>
                <option value="1">Ativa</option>
                <option value="0">Inativa</option>
              </select>
            </label>
          </div>
        </section>

        <div class="unidade-modal-footer">
          <div class="footer-note">
            Areas bem nomeadas deixam a agenda mais clara, principalmente quando o condominio possui espacos repetidos como Salao 1 e Salao 2.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelAreaModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Criar area comum</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const form = document.getElementById("formAreaComum");
  const exigeTaxaSelect = document.getElementById("areaExigeTaxa");
  const valorTaxaInput = document.getElementById("areaValorTaxa");

  if (condominioSelect?.value) {
    form.querySelector('select[name="condominio_id"]').value = condominioSelect.value;
  }

  const sincronizarTaxa = () => {
    const exigeTaxa = exigeTaxaSelect.value === "1";
    valorTaxaInput.disabled = !exigeTaxa;
    if (!exigeTaxa) valorTaxaInput.value = "";
  };

  sincronizarTaxa();
  exigeTaxaSelect.addEventListener("change", sincronizarTaxa);

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  document.getElementById("cancelAreaModal").addEventListener("click", fecharModal);
  document.getElementById("closeAreaModal").addEventListener("click", fecharModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  form.addEventListener("submit", submitCriarAreaComum);
}

async function submitCriarAreaComum(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("http://localhost:3000/areas-comuns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar area comum", "error");
      return;
    }

    showToast("Area comum criada com sucesso");
    document.getElementById("modalAreaComum").classList.add("hidden");
    document.getElementById("modalAreaComum").innerHTML = "";
    carregarAreasComuns();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao criar area comum", "error");
  }
}

async function renderReservas(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";
  const isMorador = user && user.perfil === "morador";

  if (isMorador) {
    renderReservasMorador(container);
    return;
  }

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header reservas-page-header">
      <div class="page-heading-group">
        <h2>Reservas</h2>
        <div class="page-subtitle">
          Agenda operacional das areas comuns com leitura por periodo e criacao manual pelo admin.
        </div>
      </div>

      <button id="btnNovaReserva" class="btn-primary" disabled>
        + Nova Reserva
      </button>
    </div>

    <div class="panel reservas-panel">
      <div class="reservas-toolbar">
        <label class="reservas-filter">
          <span>Condominio</span>
          <select id="reservaCondominioFilter">
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <label class="reservas-filter">
          <span>Area</span>
          <select id="reservaAreaFilter">
            <option value="">Todas as areas</option>
          </select>
        </label>

        <label class="reservas-filter">
          <span>Inicio</span>
          <div class="reservas-date-field">
            <input type="date" id="reservaDataInicioFilter" />
            <button type="button" class="btn-open-calendar" id="btnOpenReservaDataInicio" aria-label="Abrir calendario inicial">Calendario</button>
          </div>
        </label>

        <label class="reservas-filter">
          <span>Fim</span>
          <div class="reservas-date-field">
            <input type="date" id="reservaDataFimFilter" />
            <button type="button" class="btn-open-calendar" id="btnOpenReservaDataFim" aria-label="Abrir calendario final">Calendario</button>
          </div>
        </label>

        <div class="reservas-toolbar-actions">
          <button type="button" id="btnLoadReservas">Carregar Reservas</button>
          <span id="reservasStatus" class="reservas-status">
            Selecione um condominio para continuar
          </span>
        </div>
      </div>

      <div id="reservasList" class="reservas-list">
        <div class="reservas-empty">
          Aguardando selecao de um condominio para consultar a agenda de reservas.
        </div>
      </div>
    </div>

    <div id="modalReserva" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnNovaReserva")
    .addEventListener("click", abrirModalCriacaoReserva);
  document
    .getElementById("btnLoadReservas")
    .addEventListener("click", carregarReservas);
  document
    .getElementById("reservaCondominioFilter")
    .addEventListener("change", async () => {
      await carregarAreasParaReservas();
      carregarReservas();
    });
  document
    .getElementById("reservaAreaFilter")
    .addEventListener("change", carregarReservas);
  conectarAtalhosDataReserva({
    input: document.getElementById("reservaDataInicioFilter"),
    openButton: document.getElementById("btnOpenReservaDataInicio"),
  });
  conectarAtalhosDataReserva({
    input: document.getElementById("reservaDataFimFilter"),
    openButton: document.getElementById("btnOpenReservaDataFim"),
  });

  await carregarCondominiosParaReservas();
}

async function renderReservasMorador(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));

  if (!user || user.perfil !== "morador") {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header reservas-page-header reservas-morador-header">
      <div class="page-heading-group">
        <h2>Minhas Reservas</h2>
        <div class="page-subtitle">
          Reserve e acompanhe os espacos do seu condominio com uma leitura mais leve.
        </div>
      </div>
    </div>

    <div class="reservas-morador-grid">
      <section class="panel reservas-morador-panel">
        <div class="reservas-morador-section-header">
          <div>
            <h3>Areas disponiveis</h3>
            <p>Veja reserva, taxa e disponibilidade.</p>
          </div>
        </div>
        <div id="moradorAreasComuns" class="morador-areas-grid">
          <div class="reservas-loading">
            <div class="spinner"></div>
            <p>Carregando areas comuns...</p>
          </div>
        </div>
      </section>

      <section class="panel reservas-morador-panel">
        <div class="reservas-morador-section-header">
          <div>
            <h3>Minhas solicitacoes</h3>
            <p>Status das reservas do seu acesso.</p>
          </div>
        </div>
        <div id="moradorReservasOverview" class="reservas-overview-grid reservas-overview-grid-compact">
          <article class="reservas-overview-card loading">
            <span>Resumo</span>
            <strong>...</strong>
            <small>Organizando seu historico de reservas.</small>
          </article>
        </div>
        <div id="moradorReservasList" class="reservas-card-list">
          <div class="reservas-loading">
            <div class="spinner"></div>
            <p>Carregando suas reservas...</p>
          </div>
        </div>
      </section>
    </div>

    <div id="modalReservaMorador" class="modal-overlay hidden"></div>
  `;

  try {
    const hoje = obterDataIsoComOffset(0);
    const daquiSeteDias = obterDataIsoComOffset(7);

    const [areas, reservas, agenda] = await Promise.all([
      buscarAreasComunsPorCondominio(),
      buscarMinhasReservas(),
      buscarAgendaMorador({
        data_inicio: `${hoje}T00:00:00`,
        data_fim: `${daquiSeteDias}T23:59:59`,
      }),
    ]);

    const areasContainer = document.getElementById("moradorAreasComuns");
    const overviewContainer = document.getElementById("moradorReservasOverview");
    const reservasContainer = document.getElementById("moradorReservasList");
    const resumo = calcularResumoReservas(reservas);
    const disponibilidadePorArea = montarDisponibilidadeAreas(agenda);

    if (areasContainer) {
      areasContainer.innerHTML = areas.length
        ? areas
            .map(
              (area) => {
                const disponibilidade = descreverDisponibilidadeArea(
                  area,
                  disponibilidadePorArea[area.id],
                );

                return `
                <article class="morador-area-card">
                  <div class="morador-area-card-head">
                    <h4>${area.nome}</h4>
                    <span class="areas-badge ${Number(area.ativo) === 1 ? "areas-badge-active" : "areas-badge-muted"}">
                      ${Number(area.ativo) === 1 ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div class="morador-area-availability morador-area-availability-${disponibilidade.tone}">
                    <strong>${disponibilidade.title}</strong>
                    <span>${disponibilidade.detail}</span>
                  </div>
                  <div class="morador-area-card-meta">
                    <div>
                      <span>Reserva</span>
                      <strong>${Number(area.exige_reserva) === 1 ? "Necessaria" : "Livre"}</strong>
                    </div>
                    <div>
                      <span>Taxa</span>
                      <strong>${Number(area.exige_taxa) === 1 ? formatarMoeda(area.valor_taxa) : "Sem taxa"}</strong>
                    </div>
                  </div>
                  <div class="morador-area-card-actions">
                    ${
                      Number(area.exige_reserva) === 1
                        ? `<button type="button" class="btn-primary-soft" data-action="solicitar-reserva-morador" data-area-id="${area.id}" data-area-nome="${area.nome.replace(/"/g, "&quot;")}" data-exige-taxa="${Number(area.exige_taxa) === 1 ? "1" : "0"}" data-valor-taxa="${area.valor_taxa || ""}">
                            Solicitar reserva
                          </button>`
                        : `<span class="morador-area-inline-note">Uso livre no condominio</span>`
                    }
                  </div>
                </article>
              `;
              },
            )
            .join("")
        : `<div class="reservas-empty">Nenhuma area comum ativa foi encontrada para seu condominio.</div>`;

      areasContainer.querySelectorAll("[data-action='solicitar-reserva-morador']").forEach((button) => {
        button.addEventListener("click", () =>
          abrirModalReservaMorador({
            id: button.dataset.areaId,
            nome: button.dataset.areaNome,
            exige_taxa: button.dataset.exigeTaxa,
            valor_taxa: button.dataset.valorTaxa,
          }),
        );
      });
    }

    if (overviewContainer) {
      overviewContainer.innerHTML = `
        <article class="reservas-overview-card">
          <span>Total</span>
          <strong>${resumo.total}</strong>
          <small>Reservas vinculadas ao seu acesso</small>
        </article>
        <article class="reservas-overview-card">
          <span>Pendentes</span>
          <strong>${resumo.pendentes}</strong>
          <small>Aguardando confirmacao</small>
        </article>
        <article class="reservas-overview-card">
          <span>Confirmadas</span>
          <strong>${resumo.confirmadas}</strong>
          <small>Uso validado</small>
        </article>
      `;
    }

    if (reservasContainer) {
      reservasContainer.innerHTML = reservas.length
        ? reservas
            .map(
              (reserva) => `
                <article class="reserva-card-item reserva-card-item-morador">
                  <div class="reserva-card-day">
                    <strong>${formatarDataReservaDia(reserva.data_inicio)}</strong>
                    <span>${Number(reserva.dia_inteiro) === 1 ? "Dia todo" : "Horario"}</span>
                  </div>
                  <div class="reserva-card-main">
                    <div class="reserva-card-title-row">
                      <div>
                        <h4>${reserva.area_nome || "-"}</h4>
                        <p>Unidade ${reserva.unidade_identificacao || "-"}</p>
                      </div>
                      <div class="reserva-card-statuses">
                        <span class="reservas-badge reservas-badge-${reserva.status}">
                          ${reserva.status}
                        </span>
                        <span class="reservas-payment-badge reservas-payment-badge-${reserva.status_pagamento || "nao_aplicavel"}">
                          ${formatarStatusPagamentoReserva(reserva.status_pagamento)}
                        </span>
                      </div>
                    </div>
                    <div class="reserva-card-meta">
                      <div>
                        <span>Uso</span>
                        <strong>
                          ${formatarDataHoraReserva(reserva.data_inicio, reserva.dia_inteiro)}
                          ${Number(reserva.dia_inteiro) === 1 ? "" : ` ate ${formatarDataHoraReserva(reserva.data_fim, reserva.dia_inteiro)}`}
                        </strong>
                      </div>
                      <div>
                        <span>Prazo confirmacao</span>
                        <strong>${reserva.data_limite_confirmacao ? formatarDataHoraReserva(reserva.data_limite_confirmacao, 0) : "-"}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              `,
            )
            .join("")
        : `<div class="reservas-empty">Voce ainda nao possui reservas registradas.</div>`;
    }
  } catch (error) {
    console.error(error);
    const areasContainer = document.getElementById("moradorAreasComuns");
    const overviewContainer = document.getElementById("moradorReservasOverview");
    const reservasContainer = document.getElementById("moradorReservasList");

    if (areasContainer) {
      areasContainer.innerHTML = `<div class="reservas-empty">Nao foi possivel carregar as areas comuns agora.</div>`;
    }

    if (overviewContainer) {
      overviewContainer.innerHTML = `
        <article class="reservas-overview-card muted">
          <span>Resumo</span>
          <strong>Indisponivel</strong>
          <small>Tente novamente em instantes.</small>
        </article>
      `;
    }

    if (reservasContainer) {
      reservasContainer.innerHTML = `<div class="reservas-empty">Nao foi possivel carregar suas reservas agora.</div>`;
    }
  }
}

function abrirModalReservaMorador(area) {
  const modal = document.getElementById("modalReservaMorador");
  if (!modal || !area?.id) return;

  modal.innerHTML = `
    <div class="modal reserva-modal reserva-modal-morador">
      <button type="button" class="modal-close" id="closeReservaMoradorModal" aria-label="Fechar formulario">x</button>

      <div class="reserva-modal-hero">
        <span class="modal-kicker">EzView | Reserva do Morador</span>
        <h3>Solicitar reserva</h3>
        <p>
          Sua solicitacao entra como pendente para validacao do condominio. ${Number(area.exige_taxa) === 1 ? `Esta area possui taxa de ${formatarMoeda(area.valor_taxa)}.` : "Esta area nao possui taxa no momento."}
        </p>
      </div>

      <form id="formReservaMorador" class="reserva-form">
        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Area escolhida</h4>
              <p>Seu vinculo com a unidade sera aplicado automaticamente pelo sistema.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-2">
            <label class="field-block field-span-2">
              <span>Area comum</span>
              <input type="text" value="${area.nome}" readonly />
            </label>
          </div>
        </section>

        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Janela desejada</h4>
              <p>Escolha o melhor dia e horario. A reserva nascera em status pendente.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-4 reserva-schedule-grid">
            <label class="field-block field-span-3 reserva-date-field-block">
              <span>Data</span>
              <div class="reserva-date-stack">
                <div class="reservas-date-field reservas-date-field-modal">
                  <input type="date" name="reserva_data_base" id="reservaMoradorDataBase" required />
                  <button type="button" class="btn-open-calendar" id="btnOpenReservaMoradorDataBase" aria-label="Abrir calendario da reserva">Calendario</button>
                </div>
                <div class="reserva-quick-actions">
                  <button type="button" class="btn-reserva-quick-date" id="reservaMoradorHojeBtn">Hoje</button>
                  <button type="button" class="btn-reserva-quick-date" id="reservaMoradorAmanhaBtn">Amanha</button>
                  <button type="button" class="btn-reserva-quick-date" id="reservaMoradorSabadoBtn">Proximo sabado</button>
                </div>
                <small class="reserva-date-helper" id="reservaMoradorDataHelper">Nenhuma data selecionada</small>
              </div>
            </label>

            <label class="field-block">
              <span>Hora inicial</span>
              <input type="time" name="reserva_hora_inicio" id="reservaMoradorHoraInicio" required />
            </label>

            <label class="field-block">
              <span>Hora final</span>
              <input type="time" name="reserva_hora_fim" id="reservaMoradorHoraFim" required />
            </label>

            <label class="field-block">
              <span>Dia todo</span>
              <select name="dia_inteiro" id="reservaMoradorDiaInteiro" required>
                <option value="0">Nao</option>
                <option value="1">Sim</option>
              </select>
            </label>
          </div>
        </section>

        <div class="unidade-modal-footer">
          <div class="footer-note">
            Sua reserva sera registrada no contexto da sua unidade e seguira para validacao do condominio.
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelReservaMoradorModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Enviar solicitacao</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const diaInteiroSelect = document.getElementById("reservaMoradorDiaInteiro");
  const horaInicioInput = document.getElementById("reservaMoradorHoraInicio");
  const horaFimInput = document.getElementById("reservaMoradorHoraFim");
  const dataBaseInput = document.getElementById("reservaMoradorDataBase");

  const fecharModal = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  };

  const sincronizarDiaInteiro = () => {
    const diaInteiro = diaInteiroSelect.value === "1";
    horaInicioInput.disabled = diaInteiro;
    horaFimInput.disabled = diaInteiro;

    if (diaInteiro) {
      horaInicioInput.value = "00:00";
      horaFimInput.value = "23:59";
    }
  };

  sincronizarDiaInteiro();
  diaInteiroSelect.addEventListener("change", sincronizarDiaInteiro);
  conectarAtalhosDataReserva({
    input: dataBaseInput,
    helper: document.getElementById("reservaMoradorDataHelper"),
    openButton: document.getElementById("btnOpenReservaMoradorDataBase"),
    quickTodayButton: document.getElementById("reservaMoradorHojeBtn"),
    quickTomorrowButton: document.getElementById("reservaMoradorAmanhaBtn"),
    quickSaturdayButton: document.getElementById("reservaMoradorSabadoBtn"),
  });

  document.getElementById("cancelReservaMoradorModal").addEventListener("click", fecharModal);
  document.getElementById("closeReservaMoradorModal").addEventListener("click", fecharModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) fecharModal();
  });

  document.getElementById("formReservaMorador").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const dados = Object.fromEntries(formData.entries());
    const dataBase = dados.reserva_data_base;
    const horaInicio = dados.reserva_hora_inicio || "00:00";
    const horaFim = dados.reserva_hora_fim || "23:59";
    const diaInteiro = dados.dia_inteiro === "1";

    const payload = {
      area_id: area.id,
      data_inicio: `${dataBase}T${diaInteiro ? "00:00" : horaInicio}:00`,
      data_fim: `${dataBase}T${diaInteiro ? "23:59" : horaFim}:00`,
      dia_inteiro: diaInteiro,
      status: "pendente",
    };

    try {
      const response = await fetch("http://localhost:3000/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify(payload),
      });

      const resultado = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast(resultado.erro || "Nao foi possivel enviar a solicitacao", "error");
        return;
      }

      showToast("Solicitacao de reserva enviada com sucesso");
      fecharModal();
      renderReservas(document.getElementById("spaContent"));
    } catch (error) {
      console.error(error);
      showToast("Erro ao enviar solicitacao de reserva", "error");
    }
  });
}

async function carregarCondominiosParaReservas() {
  const select = document.getElementById("reservaCondominioFilter");
  const button = document.getElementById("btnNovaReserva");
  const status = document.getElementById("reservasStatus");
  const params = new URLSearchParams(window.location.search);
  const condominioIdPreSelecionado = params.get("condominio_id");

  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();

    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      if (button) button.disabled = true;
      if (status) status.textContent = "Cadastre um condominio antes de operar reservas";
      return;
    }

    select.disabled = false;
    if (button) button.disabled = false;
    select.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) => `
            <option value="${condominio.id}">
              ${condominio.nome_fantasia}
            </option>
          `,
        )
        .join("")}
    `;

    select.value =
      condominios.find((item) => item.id === condominioIdPreSelecionado)?.id ||
      condominios[0].id;
    await carregarAreasParaReservas();
    await carregarReservas();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
    if (button) button.disabled = true;
    if (status) status.textContent = "Erro ao carregar condominios";
  }
}

async function carregarAreasParaReservas() {
  const condominioSelect = document.getElementById("reservaCondominioFilter");
  const areaSelect = document.getElementById("reservaAreaFilter");
  const status = document.getElementById("reservasStatus");

  if (!condominioSelect || !areaSelect) return;

  const condominioId = condominioSelect.value;

  if (!condominioId) {
    areaSelect.innerHTML = `<option value="">Todas as areas</option>`;
    if (status) status.textContent = "Selecione um condominio para carregar as areas";
    return;
  }

  areaSelect.innerHTML = `<option value="">Carregando areas...</option>`;
  areaSelect.disabled = true;

  const areas = await buscarAreasComunsPorCondominio(condominioId);

  areaSelect.innerHTML = `
    <option value="">Todas as areas</option>
    ${areas
      .map(
        (area) => `
          <option value="${area.id}">
            ${area.nome}
          </option>
        `,
      )
      .join("")}
  `;
  areaSelect.disabled = false;

  if (status) {
    status.textContent = areas.length
      ? `${areas.length} area(s) comum(ns) disponivel(is) para reserva`
      : "Este condominio ainda nao possui areas comuns cadastradas";
  }
}

async function carregarReservas() {
  const condominioSelect = document.getElementById("reservaCondominioFilter");
  const areaSelect = document.getElementById("reservaAreaFilter");
  const dataInicioInput = document.getElementById("reservaDataInicioFilter");
  const dataFimInput = document.getElementById("reservaDataFimFilter");
  const status = document.getElementById("reservasStatus");
  const container = document.getElementById("reservasList");

  if (!condominioSelect || !container) return;

  const condominioId = condominioSelect.value;

  if (!condominioId) {
    container.innerHTML = `
      <div class="reservas-empty">
        Selecione um condominio para consultar a agenda de reservas.
      </div>
    `;
    if (status) status.textContent = "Nenhum condominio selecionado";
    return;
  }

  container.innerHTML = `
    <div class="reservas-loading">
      <div class="spinner"></div>
      <p>Carregando reservas...</p>
    </div>
  `;
  if (status) status.textContent = "Consultando agenda de reservas...";

  try {
    const query = new URLSearchParams({ condominio_id: condominioId });

    if (areaSelect?.value) query.set("area_id", areaSelect.value);
    if (dataInicioInput?.value) query.set("data_inicio", `${dataInicioInput.value}T00:00:00`);
    if (dataFimInput?.value) query.set("data_fim", `${dataFimInput.value}T23:59:59`);

    const response = await fetch(`http://localhost:3000/reservas?${query.toString()}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const payload = await response.json().catch(() => ({}));
    const reservas = Array.isArray(payload?.reservas) ? payload.reservas : [];

    if (!response.ok) {
      throw new Error(payload.erro || "Erro ao carregar reservas");
    }

    if (!reservas.length) {
      container.innerHTML = `
        <div class="reservas-empty">
          Nenhuma reserva encontrada para este recorte.
        </div>
      `;
      if (status) status.textContent = "Lista vazia";
      return;
    }

    const resumo = calcularResumoReservas(reservas);

    container.innerHTML = `
      <div class="reservas-overview-grid">
        <article class="reservas-overview-card">
          <span>Total</span>
          <strong>${resumo.total}</strong>
          <small>Reservas neste recorte</small>
        </article>
        <article class="reservas-overview-card">
          <span>Pendentes</span>
          <strong>${resumo.pendentes}</strong>
          <small>Aguardando tratativa</small>
        </article>
        <article class="reservas-overview-card">
          <span>Confirmadas</span>
          <strong>${resumo.confirmadas}</strong>
          <small>Agenda validada</small>
        </article>
        <article class="reservas-overview-card">
          <span>Dia todo</span>
          <strong>${resumo.diaTodo}</strong>
          <small>Uso integral da area</small>
        </article>
        <article class="reservas-overview-card">
          <span>Prazos abertos</span>
          <strong>${resumo.prazosAbertos}</strong>
          <small>Com limite de confirmacao</small>
        </article>
      </div>

      <div class="reservas-card-list">
        ${reservas
          .map(
            (reserva) => `
              <article class="reserva-card-item">
                <div class="reserva-card-day">
                  <strong>${formatarDataReservaDia(reserva.data_inicio)}</strong>
                  <span>${Number(reserva.dia_inteiro) === 1 ? "Dia todo" : "Horario"}</span>
                </div>
                <div class="reserva-card-main">
                  <div class="reserva-card-title-row">
                    <div>
                      <h4>${reserva.area_nome || "-"}</h4>
                      <p>Unidade ${reserva.unidade_identificacao || "-"} - ${reserva.usuario_nome || "Responsavel nao informado"}</p>
                    </div>
                    <div class="reserva-card-statuses">
                      <span class="reservas-badge reservas-badge-${reserva.status}">
                        ${reserva.status}
                      </span>
                      <span class="reservas-payment-badge reservas-payment-badge-${reserva.status_pagamento || "nao_aplicavel"}">
                        ${formatarStatusPagamentoReserva(reserva.status_pagamento)}
                      </span>
                    </div>
                  </div>
                  <div class="reserva-card-meta">
                    <div>
                      <span>Uso</span>
                      <strong>
                        ${formatarDataHoraReserva(reserva.data_inicio, reserva.dia_inteiro)}
                        ${Number(reserva.dia_inteiro) === 1 ? "" : ` ate ${formatarDataHoraReserva(reserva.data_fim, reserva.dia_inteiro)}`}
                      </strong>
                    </div>
                    <div>
                      <span>Prazo confirmacao</span>
                      <strong>${reserva.data_limite_confirmacao ? formatarDataHoraReserva(reserva.data_limite_confirmacao, 0) : "-"}</strong>
                    </div>
                  </div>
                  <div class="reserva-card-actions">
                    ${
                      reserva.status !== "confirmada"
                        ? `<button type="button" class="btn-inline-action" data-action="confirmar-reserva" data-reserva-id="${reserva.id}" data-exige-taxa="${Number(reserva.exige_taxa) === 1 ? "1" : "0"}" data-status-pagamento="${reserva.status_pagamento || "nao_aplicavel"}">
                            ${Number(reserva.exige_taxa) === 1 && !["pago", "isento"].includes(reserva.status_pagamento) ? "Marcar pago e confirmar" : "Confirmar reserva"}
                          </button>`
                        : ""
                    }
                    ${
                      reserva.status !== "cancelada"
                        ? `<button type="button" class="btn-inline-action" data-action="cancelar-reserva" data-reserva-id="${reserva.id}">
                            Cancelar
                          </button>`
                        : ""
                    }
                  </div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      <details class="reservas-table-disclosure">
        <summary>Ver grade detalhada</summary>
        <table class="reservas-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Unidade</th>
              <th>Responsavel</th>
              <th>Uso</th>
              <th>Prazo confirmacao</th>
              <th>Pagamento</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            ${reservas
              .map(
                (reserva) => `
                  <tr>
                    <td class="reservas-name-cell">${reserva.area_nome || "-"}</td>
                    <td>${reserva.unidade_identificacao || "-"}</td>
                    <td>${reserva.usuario_nome || "-"}</td>
                    <td>
                      <strong>${Number(reserva.dia_inteiro) === 1 ? "Dia todo" : "Horario"}</strong>
                      <small>
                        ${formatarDataHoraReserva(reserva.data_inicio, reserva.dia_inteiro)}
                        ${Number(reserva.dia_inteiro) === 1 ? "" : ` ate ${formatarDataHoraReserva(reserva.data_fim, reserva.dia_inteiro)}`}
                      </small>
                    </td>
                    <td>
                      ${reserva.data_limite_confirmacao ? formatarDataHoraReserva(reserva.data_limite_confirmacao, 0) : "-"}
                    </td>
                    <td>
                      <span class="reservas-payment-badge reservas-payment-badge-${reserva.status_pagamento || "nao_aplicavel"}">
                        ${formatarStatusPagamentoReserva(reserva.status_pagamento)}
                      </span>
                    </td>
                    <td>
                      <span class="reservas-badge reservas-badge-${reserva.status}">
                        ${reserva.status}
                      </span>
                    </td>
                    <td>
                      <div class="reservas-table-actions">
                        ${
                          reserva.status !== "confirmada"
                            ? `<button type="button" class="btn-table-action" data-action="confirmar-reserva" data-reserva-id="${reserva.id}" data-exige-taxa="${Number(reserva.exige_taxa) === 1 ? "1" : "0"}" data-status-pagamento="${reserva.status_pagamento || "nao_aplicavel"}">
                                Confirmar
                              </button>`
                            : ""
                        }
                        ${
                          reserva.status !== "cancelada"
                            ? `<button type="button" class="btn-table-action" data-action="cancelar-reserva" data-reserva-id="${reserva.id}">
                                Cancelar
                              </button>`
                            : ""
                        }
                      </div>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </details>
    `;

    container.querySelectorAll("[data-action='confirmar-reserva']").forEach((button) => {
      button.addEventListener("click", () => atualizarStatusReserva(button.dataset.reservaId, {
        status: "confirmada",
        status_pagamento:
          button.dataset.exigeTaxa === "1" && !["pago", "isento"].includes(button.dataset.statusPagamento)
            ? "pago"
            : undefined,
      }));
    });

    container.querySelectorAll("[data-action='cancelar-reserva']").forEach((button) => {
      button.addEventListener("click", () =>
        atualizarStatusReserva(button.dataset.reservaId, {
          status: "cancelada",
        }),
      );
    });

    if (status) status.textContent = `${reservas.length} reserva(s) carregada(s)`;
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="reservas-empty">
        Nao foi possivel consultar as reservas agora.
      </div>
    `;
    if (status) status.textContent = "Erro ao consultar reservas";
  }
}

async function atualizarStatusReserva(reservaId, payload) {
  if (!reservaId) return;

  try {
    const response = await fetch(`http://localhost:3000/reservas/${encodeURIComponent(reservaId)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(resultado.erro || "Nao foi possivel atualizar a reserva", "error");
      return;
    }

    showToast(resultado.mensagem || "Reserva atualizada com sucesso");
    carregarReservas();
  } catch (error) {
    console.error(error);
    showToast("Erro ao atualizar reserva", "error");
  }
}

function abrirModalCriacaoReserva() {
  const modal = document.getElementById("modalReserva");
  const condominioSelect = document.getElementById("reservaCondominioFilter");

  if (!modal) return;

  modal.innerHTML = `
    <div class="modal large reserva-modal">
      <button type="button" class="modal-close" id="closeReservaModal" aria-label="Fechar formulario">
        x
      </button>

      <div class="reserva-modal-hero">
        <span class="modal-kicker">EzView | Agenda Operacional</span>
        <h3>Nova Reserva</h3>
        <p>
          Reserve uma area comum dentro do contexto do condominio. Enquanto nao ha moradores, o admin logado entra como responsavel operacional.
        </p>
      </div>

      <form id="formReserva" class="reserva-form">
        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Contexto da reserva</h4>
              <p>Selecione o condominio, a area e a unidade que usara o espaco.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-3">
            <label class="field-block">
              <span>Condominio</span>
              <select name="condominio_id" id="reservaCondominioModal" required></select>
            </label>

            <label class="field-block">
              <span>Area comum</span>
              <select name="area_id" id="reservaAreaModal" required></select>
            </label>

            <label class="field-block">
              <span>Unidade</span>
              <select name="unidade_id" id="reservaUnidadeModal" required></select>
            </label>
          </div>
        </section>

        <section class="area-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Janela de uso</h4>
              <p>Defina o intervalo da reserva e o status inicial da solicitacao.</p>
            </div>
          </div>

          <div class="areas-grid areas-grid-4 reserva-schedule-grid">
            <label class="field-block field-span-3 reserva-date-field-block">
              <span>Data</span>
              <div class="reserva-date-stack">
                <div class="reservas-date-field reservas-date-field-modal">
                  <input type="date" name="reserva_data_base" id="reservaDataBase" required />
                  <button type="button" class="btn-open-calendar" id="btnOpenReservaDataBase" aria-label="Abrir calendario da reserva">Calendario</button>
                </div>
                <div class="reserva-quick-actions">
                  <button type="button" class="btn-reserva-quick-date" id="reservaHojeBtn">Hoje</button>
                  <button type="button" class="btn-reserva-quick-date" id="reservaAmanhaBtn">Amanha</button>
                  <button type="button" class="btn-reserva-quick-date" id="reservaSabadoBtn">Proximo sabado</button>
                </div>
                <small class="reserva-date-helper" id="reservaDataHelper">Nenhuma data selecionada</small>
              </div>
            </label>

            <label class="field-block">
              <span>Hora inicial</span>
              <input type="time" name="reserva_hora_inicio" id="reservaHoraInicio" required />
            </label>

            <label class="field-block">
              <span>Hora final</span>
              <input type="time" name="reserva_hora_fim" id="reservaHoraFim" required />
            </label>

            <label class="field-block">
              <span>Dia todo</span>
              <select name="dia_inteiro" id="reservaDiaInteiro" required>
                <option value="0">Nao</option>
                <option value="1">Sim</option>
              </select>
            </label>

            <label class="field-block">
              <span>Status</span>
              <select name="status" required>
                <option value="pendente">Pendente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
          </div>
        </section>

        <div class="unidade-modal-footer">
          <div class="footer-note">
            Esta fase usa o admin logado como responsavel operacional da reserva. Quando a area exigir taxa, o sistema ja define um prazo limite de confirmacao em ate 7 dias antes do evento.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelReservaModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Criar reserva</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const condominioModalSelect = document.getElementById("reservaCondominioModal");
  const areaModalSelect = document.getElementById("reservaAreaModal");
  const unidadeModalSelect = document.getElementById("reservaUnidadeModal");
  const diaInteiroSelect = document.getElementById("reservaDiaInteiro");
  const horaInicioInput = document.getElementById("reservaHoraInicio");
  const horaFimInput = document.getElementById("reservaHoraFim");
  const dataBaseInput = document.getElementById("reservaDataBase");
  const condominioIdPreSelecionado = condominioSelect?.value || "";

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  async function carregarDependenciasReservaModal() {
    const condominioId = condominioModalSelect.value;

    if (!condominioId) {
      areaModalSelect.innerHTML = `<option value="">Selecione um condominio</option>`;
      unidadeModalSelect.innerHTML = `<option value="">Selecione um condominio</option>`;
      return;
    }

    const [areas, unidades] = await Promise.all([
      buscarAreasComunsPorCondominio(condominioId),
      buscarUnidadesPorCondominio(condominioId),
    ]);

    areaModalSelect.innerHTML = `
      <option value="">Selecione uma area</option>
      ${areas
        .map(
          (area) => `
            <option value="${area.id}">
              ${area.nome}
            </option>
          `,
        )
        .join("")}
    `;

    unidadeModalSelect.innerHTML = `
      <option value="">Selecione uma unidade</option>
      ${unidades
        .map(
          (unidade) => `
            <option value="${unidade.id}">
              ${unidade.identificacao}
            </option>
          `,
        )
        .join("")}
    `;
  }

  document.getElementById("cancelReservaModal").addEventListener("click", fecharModal);
  document.getElementById("closeReservaModal").addEventListener("click", fecharModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  const sincronizarDiaInteiro = () => {
    const diaInteiro = diaInteiroSelect.value === "1";
    horaInicioInput.disabled = diaInteiro;
    horaFimInput.disabled = diaInteiro;

    if (diaInteiro) {
      horaInicioInput.value = "00:00";
      horaFimInput.value = "23:59";
    }
  };

  sincronizarDiaInteiro();
  diaInteiroSelect.addEventListener("change", sincronizarDiaInteiro);
  conectarAtalhosDataReserva({
    input: dataBaseInput,
    helper: document.getElementById("reservaDataHelper"),
    openButton: document.getElementById("btnOpenReservaDataBase"),
    quickTodayButton: document.getElementById("reservaHojeBtn"),
    quickTomorrowButton: document.getElementById("reservaAmanhaBtn"),
    quickSaturdayButton: document.getElementById("reservaSabadoBtn"),
  });

  condominioModalSelect.addEventListener("change", carregarDependenciasReservaModal);
  document.getElementById("formReserva").addEventListener("submit", submitCriarReserva);

  buscarCondominiosDoAdmin()
    .then(async (condominios) => {
      condominioModalSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}">
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;

      if (condominioIdPreSelecionado) {
        condominioModalSelect.value = condominioIdPreSelecionado;
      } else if (condominios.length) {
        condominioModalSelect.value = condominios[0].id;
      }

      await carregarDependenciasReservaModal();
    })
    .catch((error) => {
      console.error(error);
      condominioModalSelect.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
      showToast("Erro ao carregar dados da reserva", "error");
    });
}

async function submitCriarReserva(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  const dataBase = dados.reserva_data_base;
  const horaInicio = dados.reserva_hora_inicio || "00:00";
  const horaFim = dados.reserva_hora_fim || "23:59";
  const diaInteiro = dados.dia_inteiro === "1";

  dados.data_inicio = `${dataBase}T${diaInteiro ? "00:00" : horaInicio}:00`;
  dados.data_fim = `${dataBase}T${diaInteiro ? "23:59" : horaFim}:00`;
  dados.dia_inteiro = diaInteiro;
  delete dados.reserva_data_base;
  delete dados.reserva_hora_inicio;
  delete dados.reserva_hora_fim;

  try {
    const response = await fetch("http://localhost:3000/reservas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar reserva", "error");
      return;
    }

    showToast("Reserva criada com sucesso");
    document.getElementById("modalReserva").classList.add("hidden");
    document.getElementById("modalReserva").innerHTML = "";
    carregarReservas();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao criar reserva", "error");
  }
}

function renderMoradores(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header moradores-page-header">
      <div class="page-heading-group">
        <h2>Moradores</h2>
        <div class="page-subtitle">
          Cadastro do morador principal por unidade com convite seguro para ativacao da conta.
        </div>
      </div>

      <button id="btnNovoMorador" class="btn-primary" disabled>
        + Novo Morador
      </button>
    </div>

    <div class="panel moradores-panel">
      <div class="moradores-toolbar">
        <label class="moradores-filter">
          <span>Condominio</span>
          <select id="moradoresCondominioFilter" disabled>
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <label class="moradores-filter">
          <span>Unidade</span>
          <select id="moradoresUnidadeFilter" disabled>
            <option value="">Selecione primeiro o condominio</option>
          </select>
        </label>

        <button id="btnLoadMoradores" class="btn-secondary-soft" disabled>
          Carregar Moradores
        </button>
      </div>

      <div id="moradoresStatus" class="page-subtitle">
        Preparando o contexto estrutural do condominio.
      </div>

      <div id="moradoresList" class="moradores-list">
        <div class="moradores-empty">
          Selecione um condominio para visualizar os moradores.
        </div>
      </div>
    </div>

    <div id="modalMorador" class="modal-overlay hidden"></div>
  `;

  const condominioFilter = document.getElementById("moradoresCondominioFilter");
  const unidadeFilter = document.getElementById("moradoresUnidadeFilter");
  const btnLoad = document.getElementById("btnLoadMoradores");
  const btnNovo = document.getElementById("btnNovoMorador");
  const status = document.getElementById("moradoresStatus");
  let condominiosCache = [];

  async function carregarCondominiosParaMoradores() {
    try {
      const condominios = await buscarCondominiosDoAdmin();
      condominiosCache = condominios;

      if (!condominios.length) {
        condominioFilter.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
        condominioFilter.disabled = true;
        unidadeFilter.disabled = true;
        btnLoad.disabled = true;
        btnNovo.disabled = true;
        status.textContent = "Cadastre um condominio antes de operar moradores.";
        return;
      }

      condominioFilter.disabled = false;
      btnLoad.disabled = false;
      btnNovo.disabled = false;
      condominioFilter.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}">
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;
      status.textContent = "Escolha um condominio para listar ou cadastrar moradores.";
    } catch (error) {
      console.error(error);
      condominioFilter.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
      condominioFilter.disabled = true;
      unidadeFilter.disabled = true;
      btnLoad.disabled = true;
      btnNovo.disabled = true;
      status.textContent = "Nao foi possivel carregar os condominios.";
    }
  }

  async function carregarUnidadesFiltro(condominioId) {
    unidadeFilter.disabled = true;
    unidadeFilter.innerHTML = `<option value="">Carregando unidades...</option>`;

    if (!condominioId) {
      unidadeFilter.innerHTML = `<option value="">Selecione primeiro o condominio</option>`;
      return;
    }

    const unidades = await buscarUnidadesPorCondominio(condominioId);

    if (!unidades.length) {
      unidadeFilter.innerHTML = `<option value="">Nenhuma unidade disponivel</option>`;
      return;
    }

    unidadeFilter.disabled = false;
    unidadeFilter.innerHTML = `
      <option value="">Todas as unidades</option>
      ${unidades
        .map(
          (unidade) => `
            <option value="${unidade.id}">
              ${unidade.identificacao}${unidade.torre_nome ? ` - ${unidade.torre_nome}` : ""}
            </option>
          `,
        )
        .join("")}
    `;
  }

  async function carregarMoradores() {
    const condominioId = condominioFilter.value;
    const unidadeId = unidadeFilter.value;
    const list = document.getElementById("moradoresList");

    if (!condominioId) {
      list.innerHTML = `<div class="moradores-empty">Selecione um condominio para visualizar os moradores.</div>`;
      status.textContent = "Selecione um condominio para carregar os moradores.";
      return;
    }

    list.innerHTML = `<div class="moradores-loading">Carregando moradores...</div>`;

    const moradores = await buscarMoradoresPorFiltro({
      condominio_id: condominioId,
      unidade_id: unidadeId || "",
    });

    if (!moradores.length) {
      list.innerHTML = `<div class="moradores-empty">Nenhum morador encontrado para este contexto.</div>`;
      status.textContent = "Nenhum morador encontrado para os filtros atuais.";
      return;
    }

    list.innerHTML = `
      <table class="table moradores-table">
        <thead>
          <tr>
            <th>Morador</th>
            <th>Contato</th>
            <th>Vinculo</th>
            <th>Unidade</th>
            <th>Convite</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${moradores
            .map(
              (morador) => `
                <tr>
                  <td>
                    <strong>${morador.nome_completo}</strong>
                    <small>${morador.usuario_status || "-"}</small>
                  </td>
                  <td>
                    <strong>${morador.email || "-"}</strong>
                    <small>${morador.phone_whatsapp || "Sem telefone"}</small>
                  </td>
                  <td>
                    <strong>${morador.papel || "-"}</strong>
                    <small>${morador.condominio_nome || "-"}</small>
                  </td>
                  <td>
                    <strong>${morador.unidade_identificacao || "-"}</strong>
                    <small>${morador.torre_nome || "Sem torre"}</small>
                  </td>
                  <td>
                    <strong>${formatarStatusConvite(morador.convite_status)}</strong>
                    <small>${morador.convite_expira_em ? `Expira em ${formatarData(morador.convite_expira_em)}` : "Sem convite ativo"}</small>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-inline-action"
                      data-reenviar-convite="${morador.id}"
                      ${morador.usuario_status === "ativo" ? "disabled" : ""}
                    >
                      Reenviar convite
                    </button>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    list.querySelectorAll("[data-reenviar-convite]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `http://localhost:3000/moradores/${button.dataset.reenviarConvite}/enviar-convite`,
            {
              method: "POST",
              headers: {
                Authorization: "Bearer " + localStorage.getItem("token"),
              },
            },
          );

          const resultado = await response.json().catch(() => ({}));

          if (!response.ok) {
            showToast(resultado.erro || "Erro ao reenviar convite", "error");
            return;
          }

          showToast("Convite reenviado com sucesso");
          abrirResumoConviteMorador({
            nome: resultado.resultado.morador.nome_completo,
            email: resultado.resultado.morador.email,
            link: resultado.resultado.convite.link_ativacao_temporario,
          });
          carregarMoradores();
        } catch (error) {
          console.error(error);
          showToast("Erro de conexao ao reenviar convite", "error");
        }
      });
    });

    status.textContent = `${moradores.length} morador(es) encontrados.`;
  }

  function abrirModalCriacaoMorador() {
    const condominioAtual = condominioFilter.value;
    const modal = document.getElementById("modalMorador");

    modal.innerHTML = `
      <div class="modal large">
        <h3>Novo Morador</h3>

        <form id="formMorador">
          <label>Condominio</label>
          <select id="moradorCondominio" name="condominio_id" required>
            <option value="">Selecione um condominio</option>
          </select>

          <label>Unidade</label>
          <select id="moradorUnidade" name="unidade_id" required disabled>
            <option value="">Selecione primeiro o condominio</option>
          </select>

          <label>Nome completo</label>
          <input type="text" name="nome_completo" placeholder="Nome completo do morador" required />

          <label>Email</label>
          <input type="email" name="email" placeholder="morador@email.com" required />

          <label>WhatsApp</label>
          <input type="text" name="phone_whatsapp" placeholder="71999999999" />

          <label>Papel na unidade</label>
          <select name="papel" required>
            <option value="titular">Titular</option>
            <option value="proprietario">Proprietario</option>
            <option value="dependente">Dependente</option>
          </select>

          <div class="modal-actions">
            <button type="button" id="cancelMoradorModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Criar Morador</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");

    const condominioModalSelect = document.getElementById("moradorCondominio");
    const unidadeModalSelect = document.getElementById("moradorUnidade");
    const papelSelect = modal.querySelector('select[name="papel"]');

    function fecharModal() {
      modal.classList.add("hidden");
      modal.innerHTML = "";
    }

    document.getElementById("cancelMoradorModal").addEventListener("click", fecharModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) fecharModal();
    });

    Promise.resolve(condominiosCache.length ? condominiosCache : buscarCondominiosDoAdmin()).then((condominios) => {
      condominiosCache = condominios;
      condominioModalSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}" ${condominio.id === condominioAtual ? "selected" : ""}>
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;

      if (condominioAtual) {
        carregarUnidadesModalMorador(condominioAtual, papelSelect.value);
      }
    });

    async function carregarUnidadesModalMorador(condominioId, papel = "titular") {
      unidadeModalSelect.disabled = true;
      unidadeModalSelect.innerHTML = `<option value="">Carregando unidades...</option>`;

      const [unidades, titulares] = await Promise.all([
        buscarUnidadesPorCondominio(condominioId),
        buscarMoradoresPorFiltro({ condominio_id: condominioId, papel: "titular" }),
      ]);

      const unidadesComTitular = new Set(
        titulares
          .filter((morador) => Number(morador.vinculo_ativo) === 1)
          .map((morador) => morador.unidade_id),
      );

      if (!unidades.length) {
        unidadeModalSelect.innerHTML = `<option value="">Nenhuma unidade disponivel</option>`;
        return;
      }

      unidadeModalSelect.disabled = false;
      unidadeModalSelect.innerHTML = `
        <option value="">Selecione uma unidade</option>
        ${unidades
          .map((unidade) => {
            const bloqueada = papel === "titular" && unidadesComTitular.has(unidade.id);
            const sufixo = bloqueada
              ? " - ja possui titular"
              : unidade.torre_nome
                ? ` - ${unidade.torre_nome}`
                : "";

            return `
              <option value="${unidade.id}" ${bloqueada ? "disabled" : ""}>
                ${unidade.identificacao}${sufixo}
              </option>
            `;
          })
          .join("")}
      `;
    }

    condominioModalSelect.addEventListener("change", () => {
      const condominioId = condominioModalSelect.value;

      if (!condominioId) {
        unidadeModalSelect.disabled = true;
        unidadeModalSelect.innerHTML = `<option value="">Selecione primeiro o condominio</option>`;
        return;
      }

      carregarUnidadesModalMorador(condominioId, papelSelect.value);
    });

    papelSelect.addEventListener("change", () => {
      const condominioId = condominioModalSelect.value;

      if (!condominioId) return;

      carregarUnidadesModalMorador(condominioId, papelSelect.value);
    });

    document.getElementById("formMorador").addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);
      const dados = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("http://localhost:3000/moradores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(dados),
        });

        const resultado = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(resultado.erro || "Erro ao criar morador", "error");
          return;
        }

        showToast("Morador criado com sucesso");
        fecharModal();
        abrirResumoConviteMorador({
          nome: resultado.resultado.usuario.nome_completo,
          email: resultado.resultado.usuario.email,
          link: resultado.resultado.convite.link_ativacao_temporario,
        });
        carregarMoradores();
      } catch (error) {
        console.error(error);
        showToast("Erro de conexao ao criar morador", "error");
      }
    });
  }

  condominioFilter.addEventListener("change", async () => {
    await carregarUnidadesFiltro(condominioFilter.value);
    carregarMoradores();
  });
  unidadeFilter.addEventListener("change", carregarMoradores);
  btnLoad.addEventListener("click", carregarMoradores);
  btnNovo.addEventListener("click", abrirModalCriacaoMorador);

  carregarCondominiosParaMoradores();
}

function renderVagasGaragem(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header vagas-page-header">
      <div class="page-heading-group">
        <h2>Vagas de Garagem</h2>
        <div class="page-subtitle">
          Estruture as vagas do condominio para vincular unidades e veiculos com mais precisao.
        </div>
      </div>

      <button id="btnNovaVaga" class="btn-primary" disabled>
        + Nova Vaga
      </button>
    </div>

    <div class="panel vagas-panel">
      <div class="vagas-toolbar">
        <label class="vagas-filter">
          <span>Condominio</span>
          <select id="vagasCondominioFilter" disabled>
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <button id="btnLoadVagas" class="btn-secondary-soft" disabled>
          Carregar Vagas
        </button>
      </div>

      <div id="vagasStatus" class="page-subtitle">
        Preparando o contexto das vagas de garagem.
      </div>

      <div id="vagasList" class="vagas-list">
        <div class="veiculos-empty">
          Selecione um condominio para consultar as vagas.
        </div>
      </div>
    </div>

    <div id="modalVagaGaragem" class="modal-overlay hidden"></div>
  `;

  const condominioSelect = document.getElementById("vagasCondominioFilter");
  const btnLoad = document.getElementById("btnLoadVagas");
  const btnNovo = document.getElementById("btnNovaVaga");
  const status = document.getElementById("vagasStatus");
  let condominiosCache = [];

  async function carregarCondominiosParaVagas() {
    try {
      const condominios = await buscarCondominiosDoAdmin();
      condominiosCache = condominios;

      if (!condominios.length) {
        condominioSelect.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
        condominioSelect.disabled = true;
        btnLoad.disabled = true;
        btnNovo.disabled = true;
        status.textContent = "Cadastre um condominio antes de gerenciar vagas.";
        return;
      }

      condominioSelect.disabled = false;
      btnLoad.disabled = false;
      btnNovo.disabled = false;
      condominioSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}">
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;
      status.textContent = "Escolha um condominio para listar ou cadastrar vagas.";
    } catch (error) {
      console.error(error);
      condominioSelect.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
      condominioSelect.disabled = true;
      btnLoad.disabled = true;
      btnNovo.disabled = true;
      status.textContent = "Nao foi possivel carregar os condominios.";
    }
  }

  async function carregarVagas() {
    const condominioId = condominioSelect.value;
    const list = document.getElementById("vagasList");

    if (!condominioId) {
      list.innerHTML = `<div class="veiculos-empty">Selecione um condominio para continuar.</div>`;
      status.textContent = "Selecione um condominio para carregar as vagas.";
      return;
    }

    list.innerHTML = `<div class="veiculos-loading">Carregando vagas...</div>`;

    try {
      const vagas = await buscarVagasPorCondominio(condominioId);

      if (!vagas.length) {
        list.innerHTML = `
          <div class="veiculos-empty">
            Nenhuma vaga cadastrada para este condominio.
          </div>
        `;
        status.textContent = "Nenhuma vaga cadastrada para o condominio selecionado.";
        return;
      }

      list.innerHTML = `
        <table class="table vagas-table">
          <thead>
            <tr>
              <th>Identificacao</th>
              <th>Tipo</th>
              <th>Unidade</th>
              <th>Coberta</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${vagas
              .map(
                (vaga) => `
                  <tr>
                    <td><strong>${vaga.identificacao}</strong></td>
                    <td>${vaga.tipo || "-"}</td>
                    <td>${vaga.unidade_identificacao || "Sem unidade vinculada"}</td>
                    <td>${Number(vaga.coberta) === 1 ? "Sim" : "Nao"}</td>
                    <td>${Number(vaga.ativa) === 1 ? "Ativa" : "Inativa"}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `;

      status.textContent = `${vagas.length} vaga(s) encontradas.`;
    } catch (error) {
      console.error(error);
      list.innerHTML = `<div class="veiculos-empty">Nao foi possivel carregar as vagas.</div>`;
      status.textContent = "Erro ao carregar as vagas.";
    }
  }

  async function abrirModalCriacaoVaga() {
    const condominioAtual = condominioSelect.value;
    const modal = document.getElementById("modalVagaGaragem");

    modal.innerHTML = `
      <div class="modal">
        <h3>Nova Vaga de Garagem</h3>

        <form id="formVagaGaragem">
          <label>Condominio</label>
          <select id="vagaCondominio" name="condominio_id" required>
            <option value="">Selecione um condominio</option>
          </select>

          <label>Unidade</label>
          <select id="vagaUnidade" name="unidade_id" disabled>
            <option value="">Sem unidade vinculada</option>
          </select>

          <label>Identificacao</label>
          <input type="text" name="identificacao" maxlength="30" placeholder="Ex.: G1-12" required />

          <label>Tipo</label>
          <select name="tipo" required>
            <option value="">Selecione o tipo</option>
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
            <option value="bicicleta">Bicicleta</option>
          </select>

          <label class="inline-check">
            <input type="checkbox" name="coberta" value="1" checked />
            Vaga coberta
          </label>

          <label class="inline-check">
            <input type="checkbox" name="ativa" value="1" checked />
            Vaga ativa
          </label>

          <div class="modal-actions">
            <button type="button" id="cancelVagaModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Salvar</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");

    const condominioModalSelect = document.getElementById("vagaCondominio");
    const unidadeModalSelect = document.getElementById("vagaUnidade");

    function fecharModal() {
      modal.classList.add("hidden");
      modal.innerHTML = "";
    }

    document.getElementById("cancelVagaModal").addEventListener("click", fecharModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) fecharModal();
    });

    const condominios = condominiosCache.length ? condominiosCache : await buscarCondominiosDoAdmin();
    condominiosCache = condominios;
    condominioModalSelect.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) => `
            <option value="${condominio.id}" ${condominio.id === condominioAtual ? "selected" : ""}>
              ${condominio.nome_fantasia}
            </option>
          `,
        )
        .join("")}
    `;

    async function carregarUnidadesDoModal(condominioId) {
      unidadeModalSelect.disabled = true;
      unidadeModalSelect.innerHTML = `<option value="">Carregando unidades...</option>`;

      const unidades = await buscarUnidadesPorCondominio(condominioId);

      unidadeModalSelect.disabled = false;
      unidadeModalSelect.innerHTML = `
        <option value="">Sem unidade vinculada</option>
        ${unidades
          .map(
            (unidade) => `
              <option value="${unidade.id}">
                ${unidade.identificacao}${unidade.torre_nome ? ` - ${unidade.torre_nome}` : ""}
              </option>
            `,
          )
          .join("")}
      `;
    }

    if (condominioAtual) {
      carregarUnidadesDoModal(condominioAtual);
    }

    condominioModalSelect.addEventListener("change", () => {
      const condominioId = condominioModalSelect.value;

      if (!condominioId) {
        unidadeModalSelect.disabled = true;
        unidadeModalSelect.innerHTML = `<option value="">Sem unidade vinculada</option>`;
        return;
      }

      carregarUnidadesDoModal(condominioId);
    });

    document.getElementById("formVagaGaragem").addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);
      const dados = Object.fromEntries(formData.entries());

      if (!dados.condominio_id || !dados.identificacao || !dados.tipo) {
        showToast("Preencha condominio, identificacao e tipo da vaga", "error");
        return;
      }

      if (!dados.unidade_id) delete dados.unidade_id;
      if (!dados.coberta) delete dados.coberta;
      if (!dados.ativa) delete dados.ativa;

      try {
        const response = await fetch("http://localhost:3000/vagas-garagem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(dados),
        });

        const resultado = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(resultado.erro || "Erro ao criar vaga de garagem", "error");
          return;
        }

        showToast("Vaga de garagem criada com sucesso");
        fecharModal();
        carregarVagas();
      } catch (error) {
        console.error(error);
        showToast("Erro de conexao ao criar vaga de garagem", "error");
      }
    });
  }

  condominioSelect.addEventListener("change", carregarVagas);
  btnLoad.addEventListener("click", carregarVagas);
  btnNovo.addEventListener("click", abrirModalCriacaoVaga);

  carregarCondominiosParaVagas();
}

function renderVeiculos(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header veiculos-page-header">
      <div class="page-heading-group">
        <h2>Veiculos</h2>
        <div class="page-subtitle">
          Cadastro inteligente com selecao encadeada por tipo, marca, modelo e ano.
        </div>
      </div>

      <button id="btnNovoVeiculo" class="btn-primary" disabled>
        + Novo Veiculo
      </button>
    </div>

    <div class="panel veiculos-panel">
      <div class="veiculos-toolbar">
        <label class="veiculos-filter">
          <span>Condominio</span>
          <select id="veiculosCondominioFilter" disabled>
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <label class="veiculos-filter">
          <span>Buscar placa</span>
          <input type="text" id="veiculosPlacaFilter" placeholder="ABC1D23" maxlength="10" />
        </label>

        <button id="btnLoadVeiculos" class="btn-secondary-soft" disabled>
          Carregar Veiculos
        </button>
      </div>

      <div id="veiculosStatus" class="page-subtitle">
        Preparando o catalogo e o contexto do condominio.
      </div>

      <div id="veiculosList" class="veiculos-list">
        <div class="veiculos-empty">
          Selecione um condominio para consultar os veiculos.
        </div>
      </div>
    </div>

    <div id="modalVeiculo" class="modal-overlay hidden"></div>
  `;

  const condominioSelect = document.getElementById("veiculosCondominioFilter");
  const btnLoad = document.getElementById("btnLoadVeiculos");
  const btnNovo = document.getElementById("btnNovoVeiculo");
  const status = document.getElementById("veiculosStatus");
  let condominiosCache = [];

  async function carregarCondominiosParaVeiculos() {
    try {
      const condominios = await buscarCondominiosDoAdmin();
      condominiosCache = condominios;

      if (!condominios.length) {
        condominioSelect.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
        condominioSelect.disabled = true;
        btnLoad.disabled = true;
        btnNovo.disabled = true;
        status.textContent = "Cadastre um condominio antes de gerenciar veiculos.";
        return;
      }

      condominioSelect.disabled = false;
      btnLoad.disabled = false;
      btnNovo.disabled = false;
      condominioSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}">
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;
      status.textContent = "Escolha um condominio para listar ou cadastrar veiculos.";
    } catch (error) {
      console.error(error);
      condominioSelect.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
      condominioSelect.disabled = true;
      btnLoad.disabled = true;
      btnNovo.disabled = true;
      status.textContent = "Nao foi possivel carregar os condominios.";
    }
  }

  async function carregarVeiculos() {
    const condominioId = condominioSelect.value;
    const placa = document.getElementById("veiculosPlacaFilter").value.trim();
    const list = document.getElementById("veiculosList");

    if (!condominioId) {
      list.innerHTML = `<div class="veiculos-empty">Selecione um condominio para continuar.</div>`;
      status.textContent = "Selecione um condominio para carregar os veiculos.";
      return;
    }

    list.innerHTML = `<div class="veiculos-loading">Carregando veiculos...</div>`;

    try {
      const query = new URLSearchParams({ condominio_id: condominioId });

      if (placa) {
        query.set("placa", placa);
      }

      const response = await fetch(`http://localhost:3000/veiculos?${query.toString()}`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      const payload = await response.json().catch(() => ({}));
      const veiculos = Array.isArray(payload?.veiculos) ? payload.veiculos : [];

      if (!response.ok) {
        throw new Error(payload.erro || "Erro ao carregar veiculos");
      }

      if (!veiculos.length) {
        list.innerHTML = `
          <div class="veiculos-empty">
            Nenhum veiculo encontrado para este condominio.
          </div>
        `;
        status.textContent = "Nenhum veiculo encontrado para os filtros atuais.";
        return;
      }

      list.innerHTML = `
        <table class="table veiculos-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Veiculo</th>
              <th>Morador</th>
              <th>Unidade</th>
              <th>Acesso</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            ${veiculos
              .map(
                (veiculo) => `
                  <tr>
                    <td class="veiculo-placa-cell">${veiculo.placa || veiculo.placa_normalizada}</td>
                    <td>
                      <strong>${veiculo.marca} ${veiculo.modelo}</strong>
                      <small>${veiculo.tipo} - ${veiculo.ano_modelo || "-"}${veiculo.cor ? ` - ${veiculo.cor}` : ""}</small>
                    </td>
                    <td>${veiculo.usuario_nome || "-"}</td>
                    <td>
                      <strong>${veiculo.unidade_identificacao || "-"}</strong>
                      <small>${veiculo.vaga_identificacao ? `Vaga ${veiculo.vaga_identificacao}` : "Sem vaga vinculada"}</small>
                    </td>
                    <td>${veiculo.modo_acesso_preferencial || "-"}</td>
                    <td>${veiculo.status || "-"}</td>
                    <td>
                      <button
                        type="button"
                        class="btn-table-action"
                        data-veiculo-edit="${veiculo.id}"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `;

      list.querySelectorAll("[data-veiculo-edit]").forEach((button) => {
        button.addEventListener("click", () => abrirModalCriacaoVeiculo(button.dataset.veiculoEdit));
      });

      status.textContent = `${veiculos.length} veiculo(s) encontrados.`;
    } catch (error) {
      console.error(error);
      list.innerHTML = `<div class="veiculos-empty">Nao foi possivel carregar os veiculos.</div>`;
      status.textContent = error.message || "Erro ao carregar veiculos.";
    }
  }

  async function abrirModalCriacaoVeiculo(veiculoId = null) {
    const condominioAtual = condominioSelect.value;
    const modal = document.getElementById("modalVeiculo");
    const isEdit = Boolean(veiculoId);
    let veiculoAtual = null;

    if (isEdit) {
      try {
        veiculoAtual = await buscarVeiculoPorId(veiculoId);
      } catch (error) {
        showToast(error.message || "Nao foi possivel carregar o veiculo", "error");
        return;
      }
    }

    const condominioPadrao = veiculoAtual?.condominio_id || condominioAtual || "";
    const unidadePadrao = veiculoAtual?.unidade_id || "";
    const moradorPadrao = veiculoAtual?.usuario_id || "";
    const vagaPadrao = veiculoAtual?.vaga_id || "";
    const tipoPadrao = veiculoAtual?.tipo || "";
    const marcaPadrao = veiculoAtual?.marca_id || "";
    const modeloPadrao = veiculoAtual?.modelo_id || "";
    const anoPadrao = veiculoAtual?.modelo_ano_id || "";
    const placaPadrao = veiculoAtual?.placa || "";
    const corPadrao = veiculoAtual?.cor || "";
    const acessoPadrao = veiculoAtual?.modo_acesso_preferencial || "ambos";
    const statusPadrao = veiculoAtual?.status || "ativo";
    const principalPadrao = Boolean(Number(veiculoAtual?.principal || 0));
    const observacoesPadrao = veiculoAtual?.observacoes || "";

    modal.innerHTML = `
      <div class="modal large">
        <h3>${isEdit ? "Editar Veiculo" : "Novo Veiculo"}</h3>

        <form id="formVeiculo">
          <label>Condominio</label>
          <select id="veiculoCondominio" name="condominio_id" required>
            <option value="">Selecione um condominio</option>
          </select>

          <label>Unidade</label>
          <select id="veiculoUnidade" name="unidade_id" required disabled>
            <option value="">Selecione primeiro o condominio</option>
          </select>

          <label>Morador</label>
          <select id="veiculoMorador" name="usuario_id" required disabled>
            <option value="">Selecione primeiro a unidade</option>
          </select>

          <label>Vaga de garagem</label>
          <select id="veiculoVaga" name="vaga_id" disabled>
            <option value="">Sem vaga vinculada</option>
          </select>

          <label>Tipo</label>
          <select id="veiculoTipo" name="tipo" required>
            <option value="">Selecione o tipo</option>
            <option value="carro" ${tipoPadrao === "carro" ? "selected" : ""}>Carro</option>
            <option value="moto" ${tipoPadrao === "moto" ? "selected" : ""}>Moto</option>
            <option value="camionete" ${tipoPadrao === "camionete" ? "selected" : ""}>Camionete</option>
            <option value="utilitario" ${tipoPadrao === "utilitario" ? "selected" : ""}>Utilitario</option>
            <option value="bicicleta" ${tipoPadrao === "bicicleta" ? "selected" : ""}>Bicicleta</option>
            <option value="outro" ${tipoPadrao === "outro" ? "selected" : ""}>Outro</option>
          </select>

          <label>Marca</label>
          <select id="veiculoMarca" name="marca_id" required disabled>
            <option value="">Selecione primeiro o tipo</option>
          </select>

          <label>Modelo</label>
          <select id="veiculoModelo" name="modelo_id" required disabled>
            <option value="">Selecione primeiro a marca</option>
          </select>

          <label>Ano modelo</label>
          <select id="veiculoAno" name="modelo_ano_id" required disabled>
            <option value="">Selecione primeiro o modelo</option>
          </select>

          <label>Placa</label>
          <input type="text" id="veiculoPlaca" name="placa" maxlength="10" placeholder="ABC1D23" value="${placaPadrao}" required />

          <label>Cor</label>
          <input type="text" name="cor" placeholder="Prata" value="${corPadrao}" />

          <label>Modo de acesso preferencial</label>
          <select name="modo_acesso_preferencial">
            <option value="ambos" ${acessoPadrao === "ambos" ? "selected" : ""}>Ambos</option>
            <option value="placa" ${acessoPadrao === "placa" ? "selected" : ""}>Placa</option>
            <option value="qrcode" ${acessoPadrao === "qrcode" ? "selected" : ""}>QRCode</option>
          </select>

          <label class="inline-check">
            <input type="checkbox" name="principal" value="1" ${principalPadrao ? "checked" : ""} />
            Definir como veiculo principal
          </label>

          <label>Status</label>
          <select name="status">
            <option value="ativo" ${statusPadrao === "ativo" ? "selected" : ""}>Ativo</option>
            <option value="inativo" ${statusPadrao === "inativo" ? "selected" : ""}>Inativo</option>
            <option value="bloqueado" ${statusPadrao === "bloqueado" ? "selected" : ""}>Bloqueado</option>
          </select>

          <label>Observacoes</label>
          <textarea name="observacoes" rows="3" placeholder="Informacoes uteis para portaria e controle">${observacoesPadrao}</textarea>

          <div class="modal-actions">
            <button type="button" id="cancelVeiculoModal">Cancelar</button>
            <button type="submit" class="btn-confirm">${isEdit ? "Atualizar" : "Salvar"}</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove("hidden");

    const condominioModalSelect = document.getElementById("veiculoCondominio");
    const unidadeModalSelect = document.getElementById("veiculoUnidade");
    const moradorModalSelect = document.getElementById("veiculoMorador");
    const vagaModalSelect = document.getElementById("veiculoVaga");
    const tipoSelect = document.getElementById("veiculoTipo");
    const marcaSelect = document.getElementById("veiculoMarca");
    const modeloSelect = document.getElementById("veiculoModelo");
    const anoSelect = document.getElementById("veiculoAno");
    const placaInput = document.getElementById("veiculoPlaca");

    function fecharModal() {
      modal.classList.add("hidden");
      modal.innerHTML = "";
    }

    document.getElementById("cancelVeiculoModal").addEventListener("click", fecharModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) fecharModal();
    });

    buscarCondominiosDoAdmin().then((condominios) => {
      condominioModalSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}" ${condominio.id === condominioAtual ? "selected" : ""}>
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;

      if (condominioPadrao) {
        carregarUnidadesDoModal(condominioPadrao, unidadePadrao, vagaPadrao).then(() => {
          if (unidadePadrao) {
            carregarMoradoresDoModal(unidadePadrao, moradorPadrao);
          }
        });
      }
    });

    async function carregarUnidadesDoModal(condominioId, unidadeSelecionada = "", vagaSelecionada = "") {
      unidadeModalSelect.disabled = true;
      moradorModalSelect.disabled = true;
      vagaModalSelect.disabled = true;
      unidadeModalSelect.innerHTML = `<option value="">Carregando unidades...</option>`;
      moradorModalSelect.innerHTML = `<option value="">Selecione primeiro a unidade</option>`;
      vagaModalSelect.innerHTML = `<option value="">Carregando vagas...</option>`;

      const [unidades, vagas] = await Promise.all([
        buscarUnidadesPorCondominio(condominioId),
        buscarVagasPorCondominio(condominioId),
      ]);

      if (!unidades.length) {
        unidadeModalSelect.innerHTML = `<option value="">Nenhuma unidade disponivel</option>`;
      } else {
        unidadeModalSelect.disabled = false;
        unidadeModalSelect.innerHTML = `
          <option value="">Selecione uma unidade</option>
          ${unidades
            .map(
              (unidade) => `
                <option value="${unidade.id}">
                  ${unidade.identificacao}${unidade.torre_nome ? ` - ${unidade.torre_nome}` : ""}
                </option>
              `,
            )
            .join("")}
        `;

        if (unidadeSelecionada) {
          unidadeModalSelect.value = unidadeSelecionada;
        }
      }

      vagaModalSelect.disabled = false;
      vagaModalSelect.innerHTML = `
        <option value="">Sem vaga vinculada</option>
        ${vagas
          .map(
            (vaga) => `
              <option value="${vaga.id}">
                ${vaga.identificacao}${vaga.unidade_identificacao ? ` - Unidade ${vaga.unidade_identificacao}` : ""}
              </option>
            `,
            )
            .join("")}
      `;

      if (vagaSelecionada) {
        vagaModalSelect.value = vagaSelecionada;
      }
    }

    async function carregarMoradoresDoModal(unidadeId, moradorSelecionado = "") {
      moradorModalSelect.disabled = true;
      moradorModalSelect.innerHTML = `<option value="">Carregando moradores...</option>`;

      const moradores = await buscarMoradoresPorFiltro({ unidade_id: unidadeId });

      if (!moradores.length) {
        moradorModalSelect.innerHTML = `<option value="">Nenhum morador disponivel</option>`;
        return;
      }

      moradorModalSelect.disabled = false;
      moradorModalSelect.innerHTML = `
        <option value="">Selecione um morador</option>
        ${moradores
          .map(
            (morador) => `
              <option value="${morador.id}">
                ${morador.nome_completo} - ${morador.papel}
              </option>
            `,
            )
            .join("")}
      `;

      if (moradorSelecionado) {
        moradorModalSelect.value = moradorSelecionado;
      }
    }

    async function carregarMarcasDoModal(tipo, marcaSelecionada = "") {
      marcaSelect.disabled = true;
      modeloSelect.disabled = true;
      anoSelect.disabled = true;
      marcaSelect.innerHTML = `<option value="">Carregando marcas...</option>`;
      modeloSelect.innerHTML = `<option value="">Selecione primeiro a marca</option>`;
      anoSelect.innerHTML = `<option value="">Selecione primeiro o modelo</option>`;

      const marcas = await buscarCatalogoVeiculoMarcas(tipo);

      if (!marcas.length) {
        marcaSelect.innerHTML = `<option value="">Nenhuma marca disponivel</option>`;
        return;
      }

      marcaSelect.disabled = false;
      marcaSelect.innerHTML = `
        <option value="">Selecione uma marca</option>
        ${marcas.map((marca) => `<option value="${marca.id}">${marca.nome}</option>`).join("")}
      `;

      if (marcaSelecionada) {
        marcaSelect.value = marcaSelecionada;
      }
    }

    async function carregarModelosDoModal(marcaId, modeloSelecionado = "") {
      modeloSelect.disabled = true;
      anoSelect.disabled = true;
      modeloSelect.innerHTML = `<option value="">Carregando modelos...</option>`;
      anoSelect.innerHTML = `<option value="">Selecione primeiro o modelo</option>`;

      const modelos = await buscarCatalogoVeiculoModelos(marcaId);

      if (!modelos.length) {
        modeloSelect.innerHTML = `<option value="">Nenhum modelo disponivel</option>`;
        return;
      }

      modeloSelect.disabled = false;
      modeloSelect.innerHTML = `
        <option value="">Selecione um modelo</option>
        ${modelos.map((modelo) => `<option value="${modelo.id}">${modelo.nome}</option>`).join("")}
      `;

      if (modeloSelecionado) {
        modeloSelect.value = modeloSelecionado;
      }
    }

    async function carregarAnosDoModal(modeloId, anoSelecionado = "") {
      anoSelect.disabled = true;
      anoSelect.innerHTML = `<option value="">Carregando anos...</option>`;

      const anos = await buscarCatalogoVeiculoAnos(modeloId);

      if (!anos.length) {
        anoSelect.innerHTML = `<option value="">Nenhum ano disponivel</option>`;
        return;
      }

      anoSelect.disabled = false;
      anoSelect.innerHTML = `
        <option value="">Selecione um ano</option>
        ${anos
          .map(
            (ano) => `
              <option value="${ano.id}">
                ${ano.ano_modelo}${ano.combustivel ? ` - ${ano.combustivel}` : ""}
              </option>
            `,
            )
            .join("")}
      `;

      if (anoSelecionado) {
        anoSelect.value = anoSelecionado;
      }
    }

    condominioModalSelect.addEventListener("change", () => {
      const condominioId = condominioModalSelect.value;
      if (!condominioId) {
        unidadeModalSelect.disabled = true;
        moradorModalSelect.disabled = true;
        vagaModalSelect.disabled = true;
        unidadeModalSelect.innerHTML = `<option value="">Selecione primeiro o condominio</option>`;
        moradorModalSelect.innerHTML = `<option value="">Selecione primeiro a unidade</option>`;
        vagaModalSelect.innerHTML = `<option value="">Sem vaga vinculada</option>`;
        return;
      }

      carregarUnidadesDoModal(condominioId);
    });

    unidadeModalSelect.addEventListener("change", () => {
      const unidadeId = unidadeModalSelect.value;
      if (!unidadeId) {
        moradorModalSelect.disabled = true;
        moradorModalSelect.innerHTML = `<option value="">Selecione primeiro a unidade</option>`;
        return;
      }

      carregarMoradoresDoModal(unidadeId);
    });

    tipoSelect.addEventListener("change", () => {
      const tipo = tipoSelect.value;
      if (!tipo) {
        marcaSelect.disabled = true;
        modeloSelect.disabled = true;
        anoSelect.disabled = true;
        marcaSelect.innerHTML = `<option value="">Selecione primeiro o tipo</option>`;
        modeloSelect.innerHTML = `<option value="">Selecione primeiro a marca</option>`;
        anoSelect.innerHTML = `<option value="">Selecione primeiro o modelo</option>`;
        return;
      }

      carregarMarcasDoModal(tipo);
    });

    marcaSelect.addEventListener("change", () => {
      const marcaId = marcaSelect.value;
      if (!marcaId) {
        modeloSelect.disabled = true;
        anoSelect.disabled = true;
        modeloSelect.innerHTML = `<option value="">Selecione primeiro a marca</option>`;
        anoSelect.innerHTML = `<option value="">Selecione primeiro o modelo</option>`;
        return;
      }

      carregarModelosDoModal(marcaId);
    });

    modeloSelect.addEventListener("change", () => {
      const modeloId = modeloSelect.value;
      if (!modeloId) {
        anoSelect.disabled = true;
        anoSelect.innerHTML = `<option value="">Selecione primeiro o modelo</option>`;
        return;
      }

      carregarAnosDoModal(modeloId);
    });

    placaInput.addEventListener("input", () => {
      placaInput.value = placaInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });

    if (tipoPadrao) {
      carregarMarcasDoModal(tipoPadrao, marcaPadrao).then(() => {
        if (marcaPadrao) {
          carregarModelosDoModal(marcaPadrao, modeloPadrao).then(() => {
            if (modeloPadrao) {
              carregarAnosDoModal(modeloPadrao, anoPadrao);
            }
          });
        }
      });
    }

    document.getElementById("formVeiculo").addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);
      const dados = Object.fromEntries(formData.entries());

      if (!dados.principal) {
        delete dados.principal;
      }

      try {
        const response = await fetch(
          isEdit
            ? `http://localhost:3000/veiculos/${encodeURIComponent(veiculoId)}`
            : "http://localhost:3000/veiculos",
          {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(dados),
          },
        );

        const resultado = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(resultado.erro || `Erro ao ${isEdit ? "atualizar" : "criar"} veiculo`, "error");
          return;
        }

        showToast(`Veiculo ${isEdit ? "atualizado" : "criado"} com sucesso`);
        fecharModal();
        carregarVeiculos();
      } catch (error) {
        console.error(error);
        showToast(`Erro de conexao ao ${isEdit ? "atualizar" : "criar"} veiculo`, "error");
      }
    });
  }

  condominioSelect.addEventListener("change", carregarVeiculos);
  btnLoad.addEventListener("click", carregarVeiculos);
  btnNovo.addEventListener("click", () => abrirModalCriacaoVeiculo());

  carregarCondominiosParaVeiculos();
}

function renderTorres(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header torres-page-header">
      <div class="page-heading-group">
        <h2>Torres</h2>
        <div class="page-subtitle">
          Estrutura fisica do condominio, preparada para vincular unidades.
        </div>
      </div>

      <button id="btnNovaTorre" class="btn-primary">
        + Nova Torre
      </button>
    </div>

    <div class="panel torres-panel">
      <div class="torres-toolbar">
        <label class="torres-filter">
          <span>Condominio</span>
          <select id="torreCondominioFilter">
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <div class="torres-toolbar-actions">
          <button type="button" id="btnLoadTorres">Carregar Torres</button>
          <span id="torresStatus" class="torres-status">
            Selecione um condominio para continuar
          </span>
        </div>
      </div>

      <div id="torresList" class="torres-list">
        <div class="torres-empty">
          Aguardando selecao de um condominio para listar as torres.
        </div>
      </div>
    </div>

    <div id="modalTorre" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnNovaTorre")
    .addEventListener("click", abrirModalCriacaoTorre);

  document
    .getElementById("btnLoadTorres")
    .addEventListener("click", carregarTorres);

  document
    .getElementById("torreCondominioFilter")
    .addEventListener("change", carregarTorres);

  carregarCondominiosParaTorres();
}

async function carregarCondominiosParaTorres() {
  const select = document.getElementById("torreCondominioFilter");
  const status = document.getElementById("torresStatus");

  if (!select) return;

  try {
    const response = await fetch("http://localhost:3000/condominios", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      select.innerHTML = `<option value="">Nao foi possivel carregar os condominios</option>`;
      select.disabled = true;
      if (status) status.textContent = "Lista de condominios indisponivel no momento";
      return;
    }

    const condominios = Array.isArray(data) ? data : [];

    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      if (status) status.textContent = "Cadastre um condominio para criar torres";
      return;
    }

    select.disabled = false;
    select.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) => `
            <option value="${condominio.id}">
              ${condominio.nome_fantasia}
            </option>
          `,
        )
        .join("")}
    `;

    select.value = condominios[0].id;
    carregarTorres();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
    if (status) status.textContent = "Erro ao carregar condominios";
  }
}

async function carregarTorres() {
  const select = document.getElementById("torreCondominioFilter");
  const status = document.getElementById("torresStatus");
  const container = document.getElementById("torresList");

  if (!select || !container) return;

  const condominioId = select.value;

  if (!condominioId) {
    container.innerHTML = `
      <div class="torres-empty">
        Selecione um condominio para visualizar as torres.
      </div>
    `;
    if (status) status.textContent = "Nenhum condominio selecionado";
    return;
  }

  container.innerHTML = `
    <div class="torres-loading">
      <div class="spinner"></div>
      <p>Carregando torres...</p>
    </div>
  `;

  if (status) status.textContent = "Consultando torres...";

  try {
    const response = await fetch(
      `http://localhost:3000/torres?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json();
    const torres = Array.isArray(payload) ? payload : payload.torres || [];

    if (!response.ok) {
      container.innerHTML = `
        <div class="torres-empty">
          O contrato de torres ainda esta sendo preparado no backend.
          A interface ja esta pronta para consumir <code>GET /torres</code>.
        </div>
      `;
      if (status) status.textContent = "Backend de torres ainda nao respondeu";
      return;
    }

    if (!torres.length) {
      container.innerHTML = `
        <div class="torres-empty">
          Nenhuma torre cadastrada para este condominio.
        </div>
      `;
      if (status) status.textContent = "Lista vazia";
      return;
    }

    container.innerHTML = `
      <table class="torres-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Condominio</th>
            <th>Faixa de andares</th>
            <th>Status</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          ${torres
            .map(
              (torre) => `
                <tr>
                  <td class="torres-name-cell">${torre.nome || "-"}</td>
                  <td>${torre.nome_fantasia || torre.condominio_nome || "-"}</td>
                  <td>${formatarFaixaAndares(torre.andar_inicial, torre.andar_final, torre.quantidade_andares)}</td>
                  <td>
                    <span class="torres-badge ${
                      torre.ativo === 0 || torre.ativo === false
                        ? "torres-badge-muted"
                        : "torres-badge-active"
                    }">
                      ${torre.ativo === 0 || torre.ativo === false ? "Inativa" : "Ativa"}
                    </span>
                  </td>
                  <td>${torre.criado_em ? formatarData(torre.criado_em) : "-"}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    if (status) {
      status.textContent = `${torres.length} torre(s) carregada(s)`;
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="torres-empty">
        Nao foi possivel consultar as torres agora. A tela permanece pronta para o proximo passo.
      </div>
    `;
    if (status) status.textContent = "Erro ao consultar torres";
  }
}

function abrirModalCriacaoTorre() {
  const modal = document.getElementById("modalTorre");
  const selectCondominios = document.getElementById("torreCondominioFilter");

  if (!modal) return;

  const optionsHtml = selectCondominios
    ? Array.from(selectCondominios.options)
        .filter((option) => option.value)
        .map((option) => `<option value="${option.value}">${option.textContent}</option>`)
        .join("")
    : "";

  modal.innerHTML = `
    <div class="modal large torre-modal">
      <button type="button" class="modal-close" id="closeTorreModal" aria-label="Fechar formulario">
        x
      </button>

      <div class="torre-modal-hero">
        <span class="modal-kicker">EzView | Estrutura Condominial</span>
        <h3>Nova Torre</h3>
        <p>
          Defina a faixa de andares da torre para preparar o cadastro correto das unidades.
        </p>
      </div>

      <form id="formTorre" class="torre-form">
        <label class="field-block">
          <span>Condominio</span>
          <select name="condominio_id" required>
            <option value="">Selecione um condominio</option>
            ${optionsHtml}
          </select>
        </label>

        <div class="torres-grid">
          <label class="field-block">
            <span>Nome da torre</span>
            <input name="nome" placeholder="Ex: Torre A" required />
          </label>

          <label class="field-block">
            <span>Primeiro andar</span>
            <input type="number" name="andar_inicial" min="0" value="1" />
          </label>

          <label class="field-block">
            <span>Quantidade de andares</span>
            <input type="number" name="quantidade_andares" min="1" value="1" />
          </label>
        </div>

        <label class="field-block">
          <span>Descricao</span>
          <textarea name="descricao" rows="3" placeholder="Observacoes opcionais da torre"></textarea>
        </label>

        <label class="field-block">
          <span>Status</span>
          <select name="ativo" required>
            <option value="1">Ativa</option>
            <option value="0">Inativa</option>
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="cancelTorreModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Criar torre</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  document
    .getElementById("cancelTorreModal")
    .addEventListener("click", fecharModal);

  document
    .getElementById("closeTorreModal")
    .addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  document
    .getElementById("formTorre")
    .addEventListener("submit", submitCriarTorre);
}

async function submitCriarTorre(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  dados.andar_inicial = Number(dados.andar_inicial || 1);
  dados.quantidade_andares = Number(dados.quantidade_andares || 1);
  dados.ativo = dados.ativo === "1";

  try {
    const response = await fetch("http://localhost:3000/torres", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json();

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar torre", "error");
      return;
    }

    showToast("Torre criada com sucesso");
    document.getElementById("modalTorre").classList.add("hidden");
    document.getElementById("modalTorre").innerHTML = "";
    carregarTorres();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao criar torre", "error");
  }
}

function renderUnidades(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));
  const isAdmin = user && user.perfil === "admin";

  if (!isAdmin) {
    renderDashboard(container);
    return;
  }

  container.innerHTML = `
    <div class="page-header unidades-page-header">
      <div class="page-heading-group">
        <h2>Unidades</h2>
        <div class="page-subtitle">
          Estrutura real do condominio para apartamentos, casas e lojas.
        </div>
      </div>

      <div class="unidades-header-actions">
        <button id="btnGerarUnidadesTorre" class="btn-secondary-soft" disabled>
          Gerar por Torre
        </button>
        <button id="btnNovaUnidade" class="btn-primary" disabled>
          + Nova Unidade
        </button>
      </div>
    </div>

    <div class="panel unidades-panel">
      <div class="unidades-toolbar">
        <label class="unidades-filter">
          <span>Condominio</span>
          <select id="unidadeCondominioFilter">
            <option value="">Carregando condominios...</option>
          </select>
        </label>

        <label class="unidades-filter">
          <span>Torre</span>
          <select id="unidadeTorreFilter">
            <option value="">Todas as torres</option>
          </select>
        </label>

        <label class="unidades-filter unidades-filter-compact">
          <span>Ocupacao</span>
          <select id="unidadeOcupacaoFilter">
            <option value="todas">Todas</option>
            <option value="habitadas">Habitadas</option>
            <option value="disponiveis">Disponiveis</option>
          </select>
        </label>

        <div class="unidades-toolbar-actions">
          <button type="button" id="btnLoadUnidades">Carregar Unidades</button>
          <span id="unidadesStatus" class="unidades-status">
            Selecione um condominio para continuar
          </span>
        </div>
      </div>

      <div id="unidadesList" class="unidades-list">
        <div class="unidades-empty">
          Aguardando selecao de um condominio para listar as unidades.
        </div>
      </div>
    </div>

    <div id="modalUnidade" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnNovaUnidade")
    .addEventListener("click", abrirModalCriacaoUnidade);

  document
    .getElementById("btnGerarUnidadesTorre")
    .addEventListener("click", abrirModalGeracaoUnidades);

  document
    .getElementById("btnLoadUnidades")
    .addEventListener("click", carregarUnidades);

  document
    .getElementById("unidadeCondominioFilter")
    .addEventListener("change", async () => {
      await carregarTorresParaUnidades();
      carregarUnidades();
    });

  document
    .getElementById("unidadeTorreFilter")
    .addEventListener("change", carregarUnidades);

  document
    .getElementById("unidadeOcupacaoFilter")
    .addEventListener("change", carregarUnidades);

  carregarCondominiosParaUnidades();
}

function normalizarListaCondominios(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.condominios)) return payload.condominios;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function atualizarEstadoCriacaoUnidade(permitido, mensagem = "") {
  ["btnNovaUnidade", "btnGerarUnidadesTorre"].forEach((id) => {
    const button = document.getElementById(id);

    if (!button) return;

    button.disabled = !permitido;
    button.title = permitido ? "" : mensagem;
  });
}

async function buscarCondominiosDoAdmin() {
  const response = await fetch("http://localhost:3000/condominios", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => []);
  const condominios = normalizarListaCondominios(data);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os condominios do admin");
  }

  return condominios;
}

async function carregarCondominiosParaUnidades() {
  const select = document.getElementById("unidadeCondominioFilter");
  const torreSelect = document.getElementById("unidadeTorreFilter");
  const status = document.getElementById("unidadesStatus");

  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();

    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      atualizarEstadoCriacaoUnidade(
        false,
        "Cadastre um condominio antes de criar unidades",
      );
      if (status) status.textContent = "Cadastre um condominio para criar unidades";
      return;
    }

    select.disabled = false;
    atualizarEstadoCriacaoUnidade(true);
    select.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) => `
            <option value="${condominio.id}">
              ${condominio.nome_fantasia}
            </option>
          `,
        )
        .join("")}
    `;

    select.value = condominios[0].id;
    await carregarTorresParaUnidades();
    carregarUnidades();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
    atualizarEstadoCriacaoUnidade(
      false,
      "Nao foi possivel carregar os condominios agora",
    );
    if (torreSelect) torreSelect.innerHTML = `<option value="">Todas as torres</option>`;
    if (status) status.textContent = "Erro ao carregar condominios";
    showToast("Nao foi possivel carregar os condominios para unidades", "error");
  }
}

async function buscarTorresPorCondominio(condominioId) {
  if (!condominioId) return [];

  try {
    const response = await fetch(
      `http://localhost:3000/torres?condominio_id=${encodeURIComponent(condominioId)}`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const payload = await response.json();
    const torres = Array.isArray(payload) ? payload : payload.torres || [];

    if (!response.ok) {
      return [];
    }

    return torres;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function popularSelectTorres(select, torres, options = {}) {
  if (!select) return;

  const {
    placeholder = "Todas as torres",
    allowEmpty = true,
    emptyLabel = "Sem torre",
    selectedValue = "",
  } = options;

  const firstLabel = allowEmpty ? placeholder : emptyLabel;

  select.innerHTML = `
    <option value="">${firstLabel}</option>
    ${torres
      .map(
        (torre) => `
          <option value="${torre.id}">
            ${torre.nome}
          </option>
        `,
      )
      .join("")}
  `;

  select.value = selectedValue;
}

function definirAjudaVinculoUnidade({ torres = [], tipo = "", hintEl, torreSelect, andarInput }) {
  if (!hintEl) return;

  const possuiTorres = torres.length > 0;
  const tipoNormalizado = (tipo || "").trim();
  const torreSelecionada = Boolean(torreSelect?.value);

  if (!possuiTorres) {
    hintEl.dataset.state = "success";
    hintEl.textContent =
      "Este condominio ainda nao possui torres. A unidade pode ser cadastrada sem torre.";
    if (torreSelect) torreSelect.required = false;
    if (andarInput) andarInput.required = false;
    return;
  }

  if (tipoNormalizado === "apartamento") {
    if (torreSelect) torreSelect.required = true;
    if (andarInput) andarInput.required = torreSelecionada;

    hintEl.dataset.state = torreSelecionada ? "success" : "warning";
    hintEl.textContent = torreSelecionada
      ? "Apartamento vinculado a torre. Informe o andar correspondente."
      : "Para apartamento, selecione a torre. Casas, salas e excecoes podem seguir sem torre.";
    return;
  }

  if (torreSelect) torreSelect.required = false;
  if (andarInput) andarInput.required = torreSelecionada;
  hintEl.dataset.state = "success";
  hintEl.textContent =
    "Torre opcional. Use a torre para unidades em bloco; deixe sem torre para casas, lojas ou configuracoes horizontais.";
}

async function carregarTorresParaUnidades() {
  const condominioSelect = document.getElementById("unidadeCondominioFilter");
  const torreSelect = document.getElementById("unidadeTorreFilter");
  const status = document.getElementById("unidadesStatus");

  if (!condominioSelect || !torreSelect) return;

  const condominioId = condominioSelect.value;
  const requestKey = condominioId || "__empty__";

  torreSelect.dataset.condominioRequest = requestKey;

  if (!condominioId) {
    popularSelectTorres(torreSelect, [], {
      placeholder: "Todas as torres",
      allowEmpty: true,
      emptyLabel: "Sem torre",
    });
    torreSelect.disabled = false;
    if (status) status.textContent = "Selecione um condominio para carregar as torres";
    return;
  }

  popularSelectTorres(torreSelect, [], {
    placeholder: "Carregando torres...",
    allowEmpty: true,
    emptyLabel: "Sem torre",
  });
  torreSelect.disabled = true;
  if (status) status.textContent = "Atualizando torres do condominio...";

  const torres = await buscarTorresPorCondominio(condominioId);

  if (torreSelect.dataset.condominioRequest !== requestKey) {
    return;
  }

  popularSelectTorres(torreSelect, torres, {
    placeholder: "Todas as torres",
    allowEmpty: true,
    emptyLabel: "Sem torre",
  });
  torreSelect.disabled = false;

  if (status) {
    status.textContent = torres.length
      ? `${torres.length} torre(s) disponivel(is) para este condominio`
      : "Condominio sem torres cadastradas, use unidades sem torre";
  }
}

async function carregarUnidades() {
  const condominioSelect = document.getElementById("unidadeCondominioFilter");
  const torreSelect = document.getElementById("unidadeTorreFilter");
  const ocupacaoSelect = document.getElementById("unidadeOcupacaoFilter");
  const status = document.getElementById("unidadesStatus");
  const container = document.getElementById("unidadesList");

  if (!condominioSelect || !container) return;

  const condominioId = condominioSelect.value;
  const torreId = torreSelect ? torreSelect.value : "";
  const filtroOcupacao = ocupacaoSelect ? ocupacaoSelect.value : "todas";

  if (!condominioId) {
    container.innerHTML = `
      <div class="unidades-empty">
        Selecione um condominio para visualizar as unidades.
      </div>
    `;
    if (status) status.textContent = "Nenhum condominio selecionado";
    return;
  }

  container.innerHTML = `
    <div class="unidades-loading">
      <div class="spinner"></div>
      <p>Carregando unidades...</p>
    </div>
  `;

  if (status) status.textContent = "Consultando unidades...";

  try {
    const query = new URLSearchParams({ condominio_id: condominioId });

    if (torreId) {
      query.set("torre_id", torreId);
    }

    const [response, moradores] = await Promise.all([
      fetch(`http://localhost:3000/unidades?${query.toString()}`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      }),
      buscarMoradoresPorFiltro({ condominio_id: condominioId }).catch(() => []),
    ]);

    const payload = await response.json().catch(() => ({}));
    const unidades = Array.isArray(payload) ? payload : payload.unidades || [];
    const moradoresAtivos = Array.isArray(moradores)
      ? moradores.filter((morador) => Number(morador.vinculo_ativo) === 1)
      : [];
    const ocupacaoPorUnidade = moradoresAtivos.reduce((acc, morador) => {
      const unidadeId = morador.unidade_id;
      if (!unidadeId) return acc;
      acc[unidadeId] = (acc[unidadeId] || 0) + 1;
      return acc;
    }, {});

    if (!response.ok) {
      container.innerHTML = `
        <div class="unidades-empty">
          O contrato de unidades ainda esta sendo preparado no backend.
          A interface ja esta pronta para consumir <code>GET /unidades</code>.
        </div>
      `;
      if (status) status.textContent = "Backend de unidades ainda nao respondeu";
      return;
    }

    const unidadesFiltradas = unidades.filter((unidade) => {
      const totalMoradores = Number(ocupacaoPorUnidade[unidade.id] || 0);

      if (filtroOcupacao === "habitadas") {
        return totalMoradores > 0;
      }

      if (filtroOcupacao === "disponiveis") {
        return totalMoradores === 0;
      }

      return true;
    });

    if (!unidadesFiltradas.length) {
      container.innerHTML = `
        <div class="unidades-empty">
          Nenhuma unidade encontrada para este recorte.
        </div>
      `;
      if (status) status.textContent = "Lista vazia";
      return;
    }

    container.innerHTML = `
      <table class="unidades-table">
        <thead>
          <tr>
            <th>Identificacao</th>
            <th>Tipo</th>
            <th>Condominio</th>
            <th>Torre</th>
            <th>Andar</th>
            <th>Vaga</th>
            <th>Ocupacao</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${unidadesFiltradas
            .map(
              (unidade) => {
                const totalMoradores = Number(ocupacaoPorUnidade[unidade.id] || 0);
                const ocupada = totalMoradores > 0;
                return `
                <tr>
                  <td class="unidades-name-cell">
                    <strong>${unidade.identificacao || "-"}</strong>
                    <small class="unidades-occupancy-inline ${ocupada ? "occupied" : "vacant"}">
                      <span class="occupancy-dot"></span>
                      ${ocupada ? "Habitada" : "Disponivel"}
                    </small>
                  </td>
                  <td>${formatarTipoUnidade(unidade.tipo)}</td>
                  <td>${unidade.condominio_nome || unidade.nome_fantasia || "-"}</td>
                  <td>${unidade.torre_nome || unidade.torre_nome_exibicao || unidade.torre_identificacao || (unidade.torre_id ? "Com torre" : "Sem torre")}</td>
                  <td>${unidade.andar ?? "-"}</td>
                  <td>${unidade.vaga || "-"}</td>
                  <td>
                    <span class="unidades-occupancy-badge ${ocupada ? "occupied" : "vacant"}">
                      ${ocupada ? `${totalMoradores} residente(s)` : "Sem moradores"}
                    </span>
                  </td>
                  <td>
                    <span class="unidades-badge ${unidade.ativo === 0 || unidade.ativo === false ? "unidades-badge-muted" : "unidades-badge-active"}">
                      ${unidade.ativo === 0 || unidade.ativo === false ? "Inativa" : "Ativa"}
                    </span>
                  </td>
                </tr>
              `;
              },
            )
            .join("")}
        </tbody>
      </table>
    `;

    if (status) {
      status.textContent = `${unidadesFiltradas.length} unidade(s) carregada(s)`;
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="unidades-empty">
        Nao foi possivel consultar as unidades agora. A tela permanece pronta para o proximo passo.
      </div>
    `;
    if (status) status.textContent = "Erro ao consultar unidades";
  }
}

function abrirModalCriacaoUnidade() {
  const modal = document.getElementById("modalUnidade");
  const condominioSelect = document.getElementById("unidadeCondominioFilter");

  if (!modal) return;

  let optionsCondominio = condominioSelect
    ? Array.from(condominioSelect.options)
        .filter((option) => option.value)
        .map((option) => `<option value="${option.value}">${option.textContent}</option>`)
        .join("")
    : "";
  const condominioPreSelecionado = condominioSelect?.value || "";


  modal.innerHTML = `
    <div class="modal large unidade-modal">
      <button type="button" class="modal-close" id="closeUnidadeModal" aria-label="Fechar formulario">
        x
      </button>

      <div class="unidade-modal-hero">
        <span class="modal-kicker">EzView | Estrutura Condominial</span>
        <h3>Nova Unidade</h3>
        <p>
          Cadastre unidades com ou sem torre. Casas, salas e lojas podem seguir sem bloco quando fizer sentido.
        </p>
      </div>

      <form id="formUnidade" class="unidade-form">
        <section class="unidade-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Vinculo principal</h4>
              <p>Defina o condominio e, quando aplicavel, a torre de origem da unidade.</p>
            </div>
          </div>

          <div class="unidades-grid unidades-grid-2">
            <label class="field-block field-wide">
              <span>Condominio</span>
              <select name="condominio_id" id="unidadeCondominioModal" required>
                <option value="">Selecione um condominio</option>
                ${optionsCondominio}
              </select>
              <small class="field-help" id="unidadeCondominioHint">
                Escolha primeiro o condominio. A torre sera carregada conforme a estrutura ja cadastrada.
              </small>
            </label>

            <label class="field-block field-wide">
              <span>Torre</span>
              <select name="torre_id" id="unidadeTorreModal">
                <option value="">Sem torre</option>
              </select>
              <small class="field-help" id="unidadeVinculoHint">
                Deixe em branco para casas, lojas ou unidades sem torre.
              </small>
            </label>
          </div>
        </section>

        <section class="unidade-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Identificacao da unidade</h4>
              <p>Utilize a identificacao que sera vista pelos moradores e pela operacao.</p>
            </div>
          </div>

          <div class="unidades-grid unidades-grid-3">
            <label class="field-block">
              <span>Tipo</span>
              <select name="tipo" required>
                <option value="">Selecione</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="sala">Sala</option>
                <option value="outro">Outro</option>
              </select>
            </label>

            <label class="field-block">
              <span>Identificacao</span>
              <input name="identificacao" placeholder="Ex: 101, Casa 12, Loja 02" required />
            </label>

            <label class="field-block">
              <span>Andar</span>
              <input type="number" name="andar" min="0" placeholder="Opcional" />
            </label>

            <label class="field-block field-span-2">
              <span>Vaga</span>
              <input name="vaga" placeholder="Opcional" />
            </label>

            <label class="field-block">
              <span>Status</span>
              <select name="ativo" required>
                <option value="1">Ativa</option>
                <option value="0">Inativa</option>
              </select>
            </label>
          </div>
        </section>

        <div class="unidade-modal-footer">
          <div class="footer-note">
            A unidade e a base de ocupacao. Moradores, titulares e dependentes entram depois, vinculados a este cadastro.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelUnidadeModal">Cancelar</button>
            <button type="submit" class="btn-confirm">Criar unidade</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const condominioModalSelect = document.getElementById("unidadeCondominioModal");
  const torreModalSelect = document.getElementById("unidadeTorreModal");
  const tipoSelect = document.querySelector('#formUnidade select[name="tipo"]');
  const andarInput = document.querySelector('#formUnidade input[name="andar"]');
  const vinculoHint = document.getElementById("unidadeVinculoHint");

  let torresDisponiveisNoModal = [];

  if (condominioPreSelecionado && condominioModalSelect) {
    condominioModalSelect.value = condominioPreSelecionado;
  }

  if (!optionsCondominio) {
    buscarCondominiosDoAdmin()
      .then((condominios) => {
        if (!condominioModalSelect) return;

        if (!condominios.length) {
          condominioModalSelect.innerHTML =
            `<option value="">Nenhum condominio disponivel</option>`;
          showToast("Cadastre um condominio antes de criar unidades", "error");
          return;
        }

        condominioModalSelect.innerHTML = `
          <option value="">Selecione um condominio</option>
          ${condominios
            .map(
              (condominio) => `
                <option value="${condominio.id}">
                  ${condominio.nome_fantasia}
                </option>
              `,
            )
            .join("")}
        `;

        if (condominios.length) {
          condominioModalSelect.value =
            condominioPreSelecionado || condominios[0].id;
          atualizarTorresDoModal();
        }
      })
      .catch((error) => {
        console.error(error);
        if (condominioModalSelect) {
          condominioModalSelect.innerHTML = `<option value="">Nao foi possivel carregar os condominios</option>`;
        }
        showToast("Erro ao carregar condominios no formulario de unidades", "error");
      });
  }


  async function atualizarTorresDoModal() {
    if (!condominioModalSelect || !torreModalSelect) return;

    const requestKey = condominioModalSelect.value || "__empty__";
    torreModalSelect.dataset.condominioRequest = requestKey;
    popularSelectTorres(torreModalSelect, [], {
      placeholder: condominioModalSelect.value ? "Carregando torres..." : "Sem torre",
      allowEmpty: false,
      emptyLabel: "Sem torre",
    });
    torreModalSelect.disabled = true;

    torresDisponiveisNoModal = await buscarTorresPorCondominio(
      condominioModalSelect.value,
    );

    if (torreModalSelect.dataset.condominioRequest !== requestKey) {
      return;
    }

    popularSelectTorres(torreModalSelect, torresDisponiveisNoModal, {
      placeholder: "Sem torre",
      allowEmpty: false,
      emptyLabel: "Sem torre",
    });
    torreModalSelect.disabled = false;
    definirAjudaVinculoUnidade({
      torres: torresDisponiveisNoModal,
      tipo: tipoSelect?.value,
      hintEl: vinculoHint,
      torreSelect: torreModalSelect,
      andarInput,
    });
  }

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  document.getElementById("cancelUnidadeModal").addEventListener("click", fecharModal);
  document.getElementById("closeUnidadeModal").addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  if (condominioModalSelect) {
    condominioModalSelect.addEventListener("change", atualizarTorresDoModal);
  }

  if (torreModalSelect) {
    torreModalSelect.addEventListener("change", () =>
      definirAjudaVinculoUnidade({
        torres: torresDisponiveisNoModal,
        tipo: tipoSelect?.value,
        hintEl: vinculoHint,
        torreSelect: torreModalSelect,
        andarInput,
      }),
    );
  }

  if (tipoSelect) {
    tipoSelect.addEventListener("change", () =>
      definirAjudaVinculoUnidade({
        torres: torresDisponiveisNoModal,
        tipo: tipoSelect.value,
        hintEl: vinculoHint,
        torreSelect: torreModalSelect,
        andarInput,
      }),
    );
  }

  if (condominioModalSelect?.value) {
    atualizarTorresDoModal();
  } else {
    definirAjudaVinculoUnidade({
      torres: [],
      tipo: "",
      hintEl: vinculoHint,
      torreSelect: torreModalSelect,
      andarInput,
    });
  }

  document.getElementById("formUnidade").addEventListener("submit", submitCriarUnidade);
}

function gerarPreviewIdentificacoes({
  andarInicio,
  andarFim,
  unidadesPorAndar,
  sequencialInicial,
}) {
  if (
    !Number.isInteger(andarInicio) ||
    !Number.isInteger(andarFim) ||
    !Number.isInteger(unidadesPorAndar) ||
    !Number.isInteger(sequencialInicial) ||
    andarInicio < 0 ||
    andarFim < andarInicio ||
    unidadesPorAndar < 1 ||
    sequencialInicial < 1
  ) {
    return null;
  }

  const larguraSequencial = Math.max(
    2,
    String(sequencialInicial + unidadesPorAndar - 1).length,
  );
  const primeira = `${andarInicio}${String(sequencialInicial).padStart(
    larguraSequencial,
    "0",
  )}`;
  const ultima = `${andarFim}${String(
    sequencialInicial + unidadesPorAndar - 1,
  ).padStart(larguraSequencial, "0")}`;

  return { primeira, ultima };
}

function abrirModalGeracaoUnidades() {
  const modal = document.getElementById("modalUnidade");
  const condominioSelect = document.getElementById("unidadeCondominioFilter");
  const torreSelectAtiva = document.getElementById("unidadeTorreFilter");

  if (!modal) return;

  const condominioPreSelecionado = condominioSelect?.value || "";
  const torrePreSelecionada = torreSelectAtiva?.value || "";

  modal.innerHTML = `
    <div class="modal large unidade-modal geracao-unidades-modal">
      <button type="button" class="modal-close" id="closeGeracaoUnidadesModal" aria-label="Fechar formulario">
        x
      </button>

      <div class="unidade-modal-hero">
        <span class="modal-kicker">EzView | Estrutura Condominial</span>
        <h3>Gerar Unidades por Torre</h3>
        <p>
          Crie a estrutura fisica da torre em lote. Depois os moradores entram como vinculo sobre as unidades geradas.
        </p>
      </div>

      <form id="formGeracaoUnidades" class="unidade-form">
        <section class="unidade-section">
          <div class="condominio-section-header">
            <span class="section-index">01</span>
            <div>
              <h4>Contexto da geracao</h4>
              <p>Escolha o condominio, a torre e a faixa de andares que recebera as unidades.</p>
            </div>
          </div>

          <div class="unidades-grid unidades-grid-2">
            <label class="field-block field-wide">
              <span>Condominio</span>
              <select name="condominio_id" id="geracaoCondominioModal" required>
                <option value="">Carregando condominios...</option>
              </select>
            </label>

            <label class="field-block field-wide">
              <span>Torre</span>
              <select name="torre_id" id="geracaoTorreModal" required>
                <option value="">Selecione uma torre</option>
              </select>
              <small class="field-help" id="geracaoTorreHint">
                Selecione um condominio para carregar as torres disponiveis.
              </small>
            </label>
          </div>
        </section>

        <section class="unidade-section">
          <div class="condominio-section-header">
            <span class="section-index">02</span>
            <div>
              <h4>Padrao estrutural</h4>
              <p>Defina quantas unidades cada andar tera e como a numeracao sera iniciada.</p>
            </div>
          </div>

          <div class="unidades-grid unidades-grid-4">
            <label class="field-block">
              <span>Tipo</span>
              <select name="tipo" id="geracaoTipoModal" required>
                <option value="apartamento">Apartamento</option>
                <option value="sala">Sala</option>
                <option value="casa">Casa</option>
                <option value="outro">Outro</option>
              </select>
            </label>

            <label class="field-block">
              <span>Unidades por andar</span>
              <input type="number" name="unidades_por_andar" id="geracaoUnidadesPorAndar" min="1" max="40" value="4" required />
            </label>

            <label class="field-block">
              <span>Sequencial inicial</span>
              <input type="number" name="sequencial_inicial" id="geracaoSequencialInicial" min="1" value="1" required />
            </label>

            <label class="field-block">
              <span>Status</span>
              <select name="ativo" required>
                <option value="1">Ativas</option>
                <option value="0">Inativas</option>
              </select>
            </label>

            <label class="field-block">
              <span>Andar inicial da geracao</span>
              <input type="number" name="andar_inicio" id="geracaoAndarInicio" min="0" required />
            </label>

            <label class="field-block">
              <span>Andar final da geracao</span>
              <input type="number" name="andar_fim" id="geracaoAndarFim" min="0" required />
            </label>

            <div class="field-block field-span-2 geracao-preview-card">
              <span>Preview da numeracao</span>
              <div id="geracaoPreviewSummary" class="geracao-preview-summary">
                Aguarde a selecao da torre para montar a previsao.
              </div>
            </div>
          </div>
        </section>

        <div class="unidade-modal-footer">
          <div class="footer-note">
            Use esta geracao para estruturar torres inteiras. Se houver andares tecnicos, lazer ou excecoes, gere por faixa e complemente manualmente depois.
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancelGeracaoUnidadesModal">Cancelar</button>
            <button type="submit" class="btn-confirm" id="submitGeracaoUnidades">Gerar unidades</button>
          </div>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");

  const form = document.getElementById("formGeracaoUnidades");
  const condominioModalSelect = document.getElementById("geracaoCondominioModal");
  const torreModalSelect = document.getElementById("geracaoTorreModal");
  const torreHint = document.getElementById("geracaoTorreHint");
  const andarInicioInput = document.getElementById("geracaoAndarInicio");
  const andarFimInput = document.getElementById("geracaoAndarFim");
  const unidadesPorAndarInput = document.getElementById("geracaoUnidadesPorAndar");
  const sequencialInicialInput = document.getElementById("geracaoSequencialInicial");
  const previewSummary = document.getElementById("geracaoPreviewSummary");
  const submitButton = document.getElementById("submitGeracaoUnidades");

  let torresDisponiveis = [];

  function fecharModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
  }

  function atualizarPreviewGeracao() {
    const torre = torresDisponiveis.find((item) => item.id === torreModalSelect.value);

    if (!torre) {
      previewSummary.textContent =
        "Selecione uma torre valida para visualizar a previsao de numeracao.";
      submitButton.disabled = true;
      return;
    }

    const andarInicio = Number.parseInt(andarInicioInput.value, 10);
    const andarFim = Number.parseInt(andarFimInput.value, 10);
    const unidadesPorAndar = Number.parseInt(unidadesPorAndarInput.value, 10);
    const sequencialInicial = Number.parseInt(sequencialInicialInput.value, 10);

    const preview = gerarPreviewIdentificacoes({
      andarInicio,
      andarFim,
      unidadesPorAndar,
      sequencialInicial,
    });

    if (!preview || andarInicio < Number(torre.andar_inicial) || andarFim > Number(torre.andar_final)) {
      previewSummary.textContent =
        `A faixa deve permanecer entre os andares ${torre.andar_inicial} e ${torre.andar_final}.`;
      submitButton.disabled = true;
      return;
    }

    const totalAndares = andarFim - andarInicio + 1;
    const totalUnidades = totalAndares * unidadesPorAndar;

    previewSummary.innerHTML = `
      <strong>${totalUnidades} unidade(s)</strong> serao geradas de <strong>${preview.primeira}</strong> ate <strong>${preview.ultima}</strong>.
      <br />
      Faixa da torre: andares ${torre.andar_inicial} a ${torre.andar_final}.
    `;
    submitButton.disabled = false;
  }

  async function carregarTorresParaGeracao() {
    const condominioId = condominioModalSelect.value;
    const requestKey = condominioId || "__empty__";
    torreModalSelect.dataset.condominioRequest = requestKey;

    if (!condominioId) {
      torreModalSelect.innerHTML = `<option value="">Selecione uma torre</option>`;
      torreModalSelect.disabled = true;
      torreHint.dataset.state = "warning";
      torreHint.textContent = "Selecione um condominio para carregar as torres disponiveis.";
      previewSummary.textContent =
        "Selecione uma torre valida para visualizar a previsao de numeracao.";
      submitButton.disabled = true;
      return;
    }

    torreModalSelect.innerHTML = `<option value="">Carregando torres...</option>`;
    torreModalSelect.disabled = true;
    torreHint.dataset.state = "loading";
    torreHint.textContent = "Consultando torres ativas do condominio...";

    torresDisponiveis = await buscarTorresPorCondominio(condominioId);

    if (torreModalSelect.dataset.condominioRequest !== requestKey) {
      return;
    }

    if (!torresDisponiveis.length) {
      torreModalSelect.innerHTML = `<option value="">Nenhuma torre disponivel</option>`;
      torreModalSelect.disabled = true;
      torreHint.dataset.state = "warning";
      torreHint.textContent =
        "Este condominio ainda nao possui torres ativas. Use a criacao manual para casas ou crie a torre antes.";
      previewSummary.textContent =
        "Nao ha torres disponiveis para geracao automatica neste condominio.";
      submitButton.disabled = true;
      return;
    }

    torreModalSelect.innerHTML = `
      <option value="">Selecione uma torre</option>
      ${torresDisponiveis
        .map(
          (torre) => `
            <option value="${torre.id}">
              ${torre.nome}
            </option>
          `,
        )
        .join("")}
    `;
    torreModalSelect.disabled = false;

    const torrePreferida =
      torresDisponiveis.find((torre) => torre.id === torrePreSelecionada) ||
      torresDisponiveis[0];

    if (torrePreferida) {
      torreModalSelect.value = torrePreferida.id;
      andarInicioInput.value = torrePreferida.andar_inicial;
      andarFimInput.value = torrePreferida.andar_final;
      torreHint.dataset.state = "success";
      torreHint.textContent = `Torre ${torrePreferida.nome}: andares ${torrePreferida.andar_inicial} a ${torrePreferida.andar_final}.`;
    }

    atualizarPreviewGeracao();
  }

  function sincronizarFaixaPelaTorre() {
    const torre = torresDisponiveis.find((item) => item.id === torreModalSelect.value);

    if (!torre) {
      torreHint.dataset.state = "warning";
      torreHint.textContent = "Selecione uma torre valida para continuar.";
      previewSummary.textContent =
        "Selecione uma torre valida para visualizar a previsao de numeracao.";
      submitButton.disabled = true;
      return;
    }

    if (!andarInicioInput.value) {
      andarInicioInput.value = torre.andar_inicial;
    }

    if (!andarFimInput.value) {
      andarFimInput.value = torre.andar_final;
    }

    andarInicioInput.min = torre.andar_inicial;
    andarInicioInput.max = torre.andar_final;
    andarFimInput.min = torre.andar_inicial;
    andarFimInput.max = torre.andar_final;

    torreHint.dataset.state = "success";
    torreHint.textContent = `Torre ${torre.nome}: faixa estrutural de ${torre.andar_inicial} a ${torre.andar_final}.`;
    atualizarPreviewGeracao();
  }

  document
    .getElementById("cancelGeracaoUnidadesModal")
    .addEventListener("click", fecharModal);
  document
    .getElementById("closeGeracaoUnidadesModal")
    .addEventListener("click", fecharModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  condominioModalSelect.addEventListener("change", carregarTorresParaGeracao);
  torreModalSelect.addEventListener("change", sincronizarFaixaPelaTorre);
  [andarInicioInput, andarFimInput, unidadesPorAndarInput, sequencialInicialInput].forEach(
    (input) => input.addEventListener("input", atualizarPreviewGeracao),
  );

  form.addEventListener("submit", submitGerarUnidadesPorTorre);

  buscarCondominiosDoAdmin()
    .then((condominios) => {
      condominioModalSelect.innerHTML = `
        <option value="">Selecione um condominio</option>
        ${condominios
          .map(
            (condominio) => `
              <option value="${condominio.id}">
                ${condominio.nome_fantasia}
              </option>
            `,
          )
          .join("")}
      `;

      if (condominioPreSelecionado) {
        condominioModalSelect.value = condominioPreSelecionado;
      } else if (condominios.length) {
        condominioModalSelect.value = condominios[0].id;
      }

      carregarTorresParaGeracao();
    })
    .catch((error) => {
      console.error(error);
      condominioModalSelect.innerHTML =
        `<option value="">Nao foi possivel carregar os condominios</option>`;
      showToast("Erro ao carregar condominios para geracao de unidades", "error");
    });
}

async function submitGerarUnidadesPorTorre(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  dados.unidades_por_andar = Number(dados.unidades_por_andar);
  dados.sequencial_inicial = Number(dados.sequencial_inicial);
  dados.andar_inicio = Number(dados.andar_inicio);
  dados.andar_fim = Number(dados.andar_fim);
  dados.ativo = dados.ativo === "1";

  try {
    const response = await fetch("http://localhost:3000/unidades/gerar-por-torre", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      const duplicidades = resultado?.detalhes?.identificacoes?.length
        ? ` Identificacoes ja existentes: ${resultado.detalhes.identificacoes.join(", ")}`
        : "";
      showToast(`${resultado.erro || "Erro ao gerar unidades"}${duplicidades}`, "error");
      return;
    }

    showToast(
      `${resultado.resultado.total_unidades_criadas} unidade(s) gerada(s) com sucesso`,
    );
    document.getElementById("modalUnidade").classList.add("hidden");
    document.getElementById("modalUnidade").innerHTML = "";
    carregarUnidades();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao gerar unidades por torre", "error");
  }
}

async function submitCriarUnidade(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  dados.andar = dados.andar ? Number(dados.andar) : null;
  dados.ativo = dados.ativo === "1";

  if (!dados.torre_id) {
    delete dados.torre_id;
  }

  if (dados.torre_id && (dados.andar === null || Number.isNaN(dados.andar))) {
    showToast("Informe o andar da unidade ao selecionar uma torre", "error");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/unidades", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(dados),
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(resultado.erro || "Erro ao criar unidade", "error");
      return;
    }

    showToast("Unidade criada com sucesso");
    document.getElementById("modalUnidade").classList.add("hidden");
    document.getElementById("modalUnidade").innerHTML = "";
    carregarUnidades();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao ao criar unidade", "error");
  }
}




const AREA_ATUACAO_LABELS = {
  portaria: "Portaria",
  limpeza: "Limpeza",
  manutencao: "Manutencao",
  administrativo: "Administrativo",
  outro: "Outro",
};

function formatarAreaAtuacao(area) {
  return AREA_ATUACAO_LABELS[area] || "Outro";
}

async function buscarFuncionarios(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/funcionarios${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar os funcionarios");
  }

  return Array.isArray(data.funcionarios) ? data.funcionarios : [];
}

async function buscarMeuCadastroFuncionario() {
  const response = await fetch("http://localhost:3000/funcionarios/me", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar seu cadastro funcional");
  }

  return data.funcionario || null;
}

function abrirResumoConviteFuncionario({ nome, email, link }) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal">
      <h3>Convite do Funcionario</h3>
      <p style="margin-bottom: 14px;">
        O funcionario <strong>${nome}</strong> foi preparado para ativacao.
      </p>
      <div class="invite-link-panel">
        <small>${email}</small>
        <code>${link}</code>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeFuncionarioInvite">Fechar</button>
        <button type="button" id="copyFuncionarioInvite" class="btn-confirm">Copiar Link</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document
    .getElementById("closeFuncionarioInvite")
    .addEventListener("click", closeModal);
  document
    .getElementById("copyFuncionarioInvite")
    .addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link);
        showToast("Link de ativacao copiado");
      } catch (error) {
        console.error(error);
        showToast("Nao foi possivel copiar o link automaticamente", "error");
      }
    });
}

async function renderDashboardFuncionario(container, user) {
  container.innerHTML = `
    <div class="page-header admin-dashboard-header">
      <div class="page-heading-group">
        <h2>Painel Operacional</h2>
        <div class="page-subtitle">
          Seu acesso esta restrito ao condominio e a rotina funcional do seu trabalho.
        </div>
      </div>
    </div>

    <div id="funcionarioDashboardCards" class="admin-dashboard-grid">
      <div class="overview-card loading">
        <span class="overview-label">ROTINA</span>
        <strong>Carregando...</strong>
        <small>Organizando seu contexto operacional.</small>
      </div>
    </div>

    <div class="panel admin-dashboard-panel">
      <div class="admin-dashboard-section-title">
        <h3>Rotina do funcionario</h3>
        <span>Controle de acesso e fila da portaria entram na proxima etapa operacional.</span>
      </div>
      <div class="admin-dashboard-condos">
        <article class="admin-dashboard-condo-card">
          <div class="admin-dashboard-condo-head">
            <div>
              <h4>Ambiente de trabalho</h4>
              <p>Seu login ja esta separado do admin e do morador, pronto para a rotina operacional do condominio.</p>
            </div>
          </div>
          <div id="funcionarioDashboardMeta" class="admin-dashboard-condo-meta">
            <span>Carregando cadastro funcional...</span>
          </div>
        </article>
      </div>
    </div>
  `;

  const cardsContainer = document.getElementById("funcionarioDashboardCards");
  const metaContainer = document.getElementById("funcionarioDashboardMeta");

  try {
    const funcionario = await buscarMeuCadastroFuncionario();

    cardsContainer.innerHTML = `
      <article class="overview-card">
        <span class="overview-label">AREA</span>
        <strong>${formatarAreaAtuacao(funcionario.area_atuacao)}</strong>
        <small>Area funcional principal.</small>
      </article>
      <article class="overview-card">
        <span class="overview-label">CARGO</span>
        <strong>${funcionario.cargo || "-"}</strong>
        <small>Posicao atual no condominio.</small>
      </article>
      <article class="overview-card">
        <span class="overview-label">MATRICULA</span>
        <strong>${funcionario.matricula || "-"}</strong>
        <small>Identificacao interna do colaborador.</small>
      </article>
      <article class="overview-card">
        <span class="overview-label">STATUS</span>
        <strong>${(funcionario.status || "-").toUpperCase()}</strong>
        <small>Vinculo funcional no momento.</small>
      </article>
    `;

    metaContainer.innerHTML = `
      <span>${funcionario.condominio_nome || "Condominio"}</span>
      <span>${funcionario.cidade || "-"}/${funcionario.estado || "-"}</span>
      <span>${funcionario.nome_completo || user.nome}</span>
    `;
  } catch (error) {
    console.error(error);
    cardsContainer.innerHTML = `
      <article class="overview-card">
        <span class="overview-label">ERRO</span>
        <strong>Cadastro indisponivel</strong>
        <small>Nao foi possivel carregar seu contexto funcional agora.</small>
      </article>
    `;
    metaContainer.innerHTML = `<span>Falha ao carregar cadastro funcional</span>`;
  }
}

function renderFuncionarios(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Funcionarios</h2>
        <div class="page-subtitle">
          Cadastre colaboradores de portaria, limpeza, manutencao e administrativo no contexto de um unico condominio.
        </div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <div class="moradores-toolbar funcionarios-toolbar">
        <div class="filters-grid compact">
          <label>Condominio
            <select id="funcionarioCondominioFilter"></select>
          </label>
          <label>Area
            <select id="funcionarioAreaFilter">
              <option value="">Todas</option>
              <option value="portaria">Portaria</option>
              <option value="limpeza">Limpeza</option>
              <option value="manutencao">Manutencao</option>
              <option value="administrativo">Administrativo</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label>Status
            <select id="funcionarioStatusFilter">
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="afastado">Afastado</option>
              <option value="desligado">Desligado</option>
            </select>
          </label>
        </div>

        <div class="areas-toolbar-actions">
          <button id="btnLoadFuncionarios" class="btn-primary-soft">Carregar Funcionarios</button>
          <button id="btnNewFuncionario" class="btn-primary-soft">+ Novo Funcionario</button>
        </div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="funcionariosTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Area</th>
            <th>Cargo</th>
            <th>Matricula</th>
            <th>Status</th>
            <th>Convite</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="8">Selecione um condominio para carregar os funcionarios.</td></tr>
        </tbody>
      </table>
    </div>

    <div id="modalFuncionario" class="modal-overlay hidden"></div>
  `;

  carregarCondominiosParaFuncionarios();

  document
    .getElementById("btnLoadFuncionarios")
    .addEventListener("click", carregarFuncionarios);
  document
    .getElementById("btnNewFuncionario")
    .addEventListener("click", abrirModalNovoFuncionario);
  document
    .getElementById("funcionarioCondominioFilter")
    .addEventListener("change", carregarFuncionarios);
  document
    .getElementById("funcionarioAreaFilter")
    .addEventListener("change", carregarFuncionarios);
  document
    .getElementById("funcionarioStatusFilter")
    .addEventListener("change", carregarFuncionarios);
}

async function carregarCondominiosParaFuncionarios() {
  const select = document.getElementById("funcionarioCondominioFilter");
  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();

    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML = `
      <option value="">Selecione um condominio</option>
      ${condominios
        .map(
          (condominio) =>
            `<option value="${condominio.id}">${condominio.nome_fantasia}</option>`,
        )
        .join("")}
    `;

    select.value = condominios[0].id;
    carregarFuncionarios();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
    showToast("Nao foi possivel carregar os condominios para funcionarios", "error");
  }
}

async function carregarFuncionarios() {
  const tbody = document.querySelector("#funcionariosTable tbody");
  const condominioId = document.getElementById("funcionarioCondominioFilter")?.value || "";
  const areaAtuacao = document.getElementById("funcionarioAreaFilter")?.value || "";
  const status = document.getElementById("funcionarioStatusFilter")?.value || "";

  if (!tbody) return;

  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="8">Selecione um condominio para carregar os funcionarios.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8">Carregando funcionarios...</td></tr>`;

  try {
    const funcionarios = await buscarFuncionarios({
      condominio_id: condominioId,
      area_atuacao: areaAtuacao,
      status,
    });

    if (!funcionarios.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhum funcionario encontrado para os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = funcionarios
      .map(
        (funcionario) => `
          <tr>
            <td>
              <div class="funcionario-name-cell">
                <strong>${funcionario.nome_completo || "-"}</strong>
                <small>${funcionario.condominio_nome || "-"}</small>
              </div>
            </td>
            <td>
              <div class="funcionario-contact-cell">
                <span>${funcionario.email || "-"}</span>
                <small>${funcionario.phone_whatsapp || "-"}</small>
              </div>
            </td>
            <td><span class="funcionario-chip funcionario-chip-area">${formatarAreaAtuacao(funcionario.area_atuacao)}</span></td>
            <td><span class="funcionario-chip funcionario-chip-cargo">${funcionario.cargo || "-"}</span></td>
            <td><span class="funcionario-chip funcionario-chip-matricula">${funcionario.matricula || "-"}</span></td>
            <td><span class="status-badge status-${funcionario.status === "ativo" ? "ativo" : "inativo"}">${funcionario.status || "-"}</span></td>
            <td><span class="funcionario-chip funcionario-chip-convite">${formatarStatusConvite(funcionario.convite_status)}</span></td>
            <td>
              <button type="button" class="btn-primary-soft btn-reenviar-funcionario" data-id="${funcionario.id}">Reenviar convite</button>
            </td>
          </tr>
        `,
      )
      .join("");

    tbody.querySelectorAll(".btn-reenviar-funcionario").forEach((button) => {
      button.addEventListener("click", () => reenviarConviteFuncionario(button.dataset.id));
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar funcionarios.</td></tr>`;
    showToast(error.message || "Erro ao carregar funcionarios", "error");
  }
}

async function abrirModalNovoFuncionario() {
  const modal = document.getElementById("modalFuncionario");
  if (!modal) return;

  let condominios = [];
  try {
    condominios = await buscarCondominiosDoAdmin();
  } catch (error) {
    console.error(error);
  }

  modal.innerHTML = `
    <div class="modal condominio-modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Novo Funcionario</h3>
          <p>Cadastre o colaborador no contexto de um unico condominio.</p>
        </div>
        <button type="button" class="modal-close" id="closeFuncionarioModal">&times;</button>
      </div>
      <form id="formFuncionario">
        <div class="modal-section">
          <div class="modal-section-title">Identificacao funcional</div>
          <div class="form-grid two-columns">
            <label>Condominio
              <select name="condominio_id" required>
                <option value="">Selecione</option>
                ${condominios
                  .map(
                    (condominio) =>
                      `<option value="${condominio.id}">${condominio.nome_fantasia}</option>`,
                  )
                  .join("")}
              </select>
            </label>
            <label>Area de atuacao
              <select name="area_atuacao" required>
                <option value="portaria">Portaria</option>
                <option value="limpeza">Limpeza</option>
                <option value="manutencao">Manutencao</option>
                <option value="administrativo">Administrativo</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label>Nome completo
              <input type="text" name="nome_completo" required />
            </label>
            <label>Email
              <input type="email" name="email" required />
            </label>
            <label>Telefone
              <input type="text" name="phone_whatsapp" />
            </label>
            <label>Matricula
              <input type="text" name="matricula" required />
            </label>
            <label class="full-width">Cargo
              <input type="text" name="cargo" placeholder="Ex.: Porteiro lider, Auxiliar de limpeza, Assistente administrativo" required />
            </label>
            <label>Admitido em
              <input type="datetime-local" name="admitido_em" />
            </label>
            <label class="full-width">Foto de identificacao (URL)
              <input type="url" name="foto_identificacao_url" placeholder="https://..." />
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" id="cancelFuncionarioModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Salvar Funcionario</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  function closeModal() {
    modal.classList.add("hidden");
    modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  document
    .getElementById("closeFuncionarioModal")
    .addEventListener("click", closeModal);
  document
    .getElementById("cancelFuncionarioModal")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document
    .getElementById("formFuncionario")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("http://localhost:3000/funcionarios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.erro || "Nao foi possivel criar o funcionario");
        }

        closeModal();
        showToast("Funcionario criado com sucesso");
        await carregarFuncionarios();

        const link = data?.resultado?.convite?.link_ativacao_temporario;
        const nome = data?.resultado?.funcionario?.nome_completo || payload.nome_completo;
        const email = data?.resultado?.funcionario?.email || payload.email;

        if (link) {
          abrirResumoConviteFuncionario({ nome, email, link });
        }
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao criar funcionario", "error");
      }
    });
}

async function reenviarConviteFuncionario(funcionarioId) {
  try {
    const response = await fetch(
      `http://localhost:3000/funcionarios/${funcionarioId}/enviar-convite`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.erro || "Nao foi possivel reenviar o convite");
    }

    showToast("Convite reenviado com sucesso");
    await carregarFuncionarios();

    const link = data?.resultado?.convite?.link_ativacao_temporario;
    const nome = data?.resultado?.funcionario?.nome_completo || "Funcionario";
    const email = data?.resultado?.funcionario?.email || "";

    if (link) {
      abrirResumoConviteFuncionario({ nome, email, link });
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erro ao reenviar convite", "error");
  }
}


let sessionHeartbeatHandle = null;

function startSessionHeartbeat(user) {
  if (sessionHeartbeatHandle) {
    clearInterval(sessionHeartbeatHandle);
    sessionHeartbeatHandle = null;
  }

  if (!user || user.perfil !== "funcionario") {
    return;
  }

  const ping = async () => {
    try {
      await fetch("http://localhost:3000/auth/ping", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  ping();
  sessionHeartbeatHandle = setInterval(ping, 60000);
}

let portariaQueueRefreshHandle = null;
let moradorAcessosRefreshHandle = null;
let ultimoSnapshotAcessosMorador = null;
let ultimoSnapshotAcessosAdmin = [];
let mensagensPollingHandle = null;
let ultimoResumoMensagens = null;

async function buscarAutorizacoesAcesso(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/acessos/autorizacoes${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar os acessos");
  }

  return Array.isArray(data.autorizacoes) ? data.autorizacoes : [];
}

async function buscarHistoricoAcesso(autorizacaoId) {
  const response = await fetch(`http://localhost:3000/acessos/autorizacoes/${autorizacaoId}/historico`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar o historico");
  }

  return data;
}

async function criarAutorizacaoAcesso(payload) {
  const response = await fetch("http://localhost:3000/acessos/autorizacoes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel criar a autorizacao");
  }

  return data;
}

async function buscarFilaPortaria(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(`http://localhost:3000/acessos/fila${queryString ? `?${queryString}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar a fila da portaria");
  }

  return {
    fila: Array.isArray(data.fila) ? data.fila : [],
    resumo: data.resumo || {
      entradas_hoje: 0,
      saidas_hoje: 0,
      pendentes: 0,
      em_andamento: 0,
      urgentes: 0,
    },
  };
}

async function buscarSessoesPortaria() {
  const response = await fetch("http://localhost:3000/acessos/sessoes", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar as sessoes da portaria");
  }

  return {
    ativas: Array.isArray(data.ativas) ? data.ativas : [],
    recentes: Array.isArray(data.recentes) ? data.recentes : [],
  };
}

async function registrarEventoAcesso(payload) {
  const response = await fetch("http://localhost:3000/acessos/eventos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel registrar o evento");
  }

  return data;
}

function renderAcessos(container) {
  const user = JSON.parse(localStorage.getItem("usuario"));

  if (user?.perfil === "morador") {
    return renderAcessosMorador(container);
  }

  if (user?.perfil === "funcionario") {
    return renderFilaPortaria(container);
  }

  return renderAcessosAdmin(container);
}

async function renderAcessosMorador(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Liberacao de Acesso</h2>
        <div class="page-subtitle">Solicite visitante, prestador ou entrega para sua unidade.</div>
      </div>
      <button id="btnNovaLiberacao" class="btn-primary-soft">+ Nova Liberacao</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="acessos-morador-filtros-head">Filtrar liberacoes</div>
      <div class="acessos-morador-filtros" id="acessosMoradorFiltros">
        <button type="button" class="acesso-filtro-chip" data-status="abertos">Em andamento</button>
        <button type="button" class="acesso-filtro-chip" data-status="finalizado">Encerradas</button>
        <button type="button" class="acesso-filtro-chip" data-status="negado">Negadas</button>
        <button type="button" class="acesso-filtro-chip active" data-status="todas">Todas</button>
      </div>
      <table class="moradores-table acessos-morador-table">
        <thead>
          <tr>
            <th>Visitante</th>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Servico</th>
            <th>Inicio</th>
            <th>Status</th>
            <th>Porteiro destino</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody id="acessosMoradorBody">
          <tr><td colspan="8">Carregando liberacoes...</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalAcessoMorador" class="modal-overlay hidden"></div>
  `;

  document
    .getElementById("btnNovaLiberacao")
    .addEventListener("click", abrirModalNovaLiberacaoMorador);

  document.querySelectorAll("#acessosMoradorFiltros .acesso-filtro-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("#acessosMoradorFiltros .acesso-filtro-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      await carregarAcessosMorador();
    });
  });

  await carregarAcessosMorador();
  startMoradorAcessosRefresh();
}

function getFiltroAcessosMoradorStatus() {
  return document.querySelector("#acessosMoradorFiltros .acesso-filtro-chip.active")?.dataset.status || "todas";
}

function filtrarAutorizacoesMorador(autorizacoes) {
  const filtro = getFiltroAcessosMoradorStatus();
  if (filtro === "todas") return autorizacoes;
  if (filtro === "finalizado") return autorizacoes.filter((item) => item.status === "finalizado");
  if (filtro === "negado") return autorizacoes.filter((item) => item.status === "negado");
  return autorizacoes.filter((item) => ["pendente", "autorizado", "em_andamento"].includes(item.status));
}

function getMoradorAcessosSnapshotKey() {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  return `moradorAcessosSnapshot:${user?.id || "anon"}`;
}

function loadMoradorAcessosSnapshot() {
  if (ultimoSnapshotAcessosMorador) return ultimoSnapshotAcessosMorador;
  try {
    ultimoSnapshotAcessosMorador = JSON.parse(localStorage.getItem(getMoradorAcessosSnapshotKey()) || "{}");
  } catch {
    ultimoSnapshotAcessosMorador = {};
  }
  return ultimoSnapshotAcessosMorador;
}

function saveMoradorAcessosSnapshot(snapshot) {
  ultimoSnapshotAcessosMorador = snapshot;
  localStorage.setItem(getMoradorAcessosSnapshotKey(), JSON.stringify(snapshot));
}

function stopMoradorAcessosRefresh() {
  if (moradorAcessosRefreshHandle) {
    clearInterval(moradorAcessosRefreshHandle);
    moradorAcessosRefreshHandle = null;
  }
}

function startMoradorAcessosRefresh() {
  stopMoradorAcessosRefresh();
  moradorAcessosRefreshHandle = setInterval(() => {
    const user = JSON.parse(localStorage.getItem("usuario") || "null");
    const params = new URLSearchParams(window.location.search);
    if (user?.perfil === "morador" && params.get("page") === "acessos") {
      carregarAcessosMorador({ silent: true }).catch((error) => console.error("Erro ao atualizar acessos do morador:", error));
    }
  }, 15000);
}

function getMensagemStatusAcessoMorador(status) {
  if (status === "negado") return { titulo: "Acesso negado", descricao: "A portaria negou esta solicitacao. Se precisar, voce pode reenviar com os mesmos dados." };
  if (status === "em_andamento") return { titulo: "Entrada registrada", descricao: "A portaria registrou a entrada desta solicitacao." };
  if (status === "finalizado") return { titulo: "Acesso finalizado", descricao: "A saida foi registrada e a solicitacao foi encerrada." };
  return null;
}

function mostrarPopupAtualizacaoAcessoMorador(items) {
  const relevantes = items
    .map((item) => ({ item, mensagem: getMensagemStatusAcessoMorador(item.status) }))
    .filter((entry) => entry.mensagem);

  if (!relevantes.length) return;

  const existing = document.getElementById("moradorAcessoStatusOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "moradorAcessoStatusOverlay";
  overlay.className = "portaria-urgente-overlay";
  overlay.innerHTML = `
    <div class="portaria-urgente-modal morador-status-modal">
      <div class="portaria-urgente-modal-head">
        <div>
          <h3>Atualizacao da sua solicitacao</h3>
          <p>A portaria registrou uma nova movimentacao em uma ou mais liberacoes.</p>
        </div>
        <button type="button" class="modal-close" id="closeMoradorStatusOverlay">&times;</button>
      </div>
      <div class="portaria-urgente-list">
        ${relevantes.map(({ item, mensagem }) => `
          <article class="portaria-urgente-item morador-status-item">
            <strong>${item.nome_visitante || "-"}</strong>
            <span>${mensagem.titulo}</span>
            <small>${mensagem.descricao}</small>
          </article>
        `).join("")}
      </div>
      <div class="modal-actions">
        <button type="button" id="ackMoradorStatusOverlay" class="btn-confirm">Entendido</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  document.body.appendChild(overlay);
  overlay.querySelector("#closeMoradorStatusOverlay")?.addEventListener("click", close);
  overlay.querySelector("#ackMoradorStatusOverlay")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

async function reenviarAutorizacaoMorador(item) {
  const payload = {
    colaborador_unidade_id: item.colaborador_unidade_id || "",
    tipo_acesso: item.tipo_acesso || "visitante",
    nome_visitante: item.nome_visitante || "",
    documento: item.documento || "",
    empresa: item.empresa || "",
    servico: item.servico || "",
    placa: item.placa || "",
    inicio_previsto: item.inicio_previsto || "",
    fim_previsto: item.fim_previsto || "",
    urgente: Number(item.urgente) === 1,
  };

  await criarAutorizacaoAcesso(payload);
}

async function carregarAcessosMorador(options = {}) {
  const tbody = document.getElementById("acessosMoradorBody");
  if (!tbody) return;

  try {
    const autorizacoes = await buscarAutorizacoesAcesso();
    const snapshotAnterior = loadMoradorAcessosSnapshot();
    const novoSnapshot = {};
    const atualizacoes = [];

    autorizacoes.forEach((item) => {
      novoSnapshot[item.id] = item.status;
      if (snapshotAnterior[item.id] && snapshotAnterior[item.id] !== item.status) {
        atualizacoes.push(item);
      }
    });
    saveMoradorAcessosSnapshot(novoSnapshot);

    if (atualizacoes.length && options.silent) {
      mostrarPopupAtualizacaoAcessoMorador(atualizacoes);
    }

    if (!autorizacoes.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma liberacao cadastrada ate agora.</td></tr>`;
      return;
    }

    const autorizacoesFiltradas = filtrarAutorizacoesMorador(autorizacoes);
    if (!autorizacoesFiltradas.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma liberacao encontrada para este filtro.</td></tr>`;
      return;
    }

    tbody.innerHTML = autorizacoesFiltradas
      .map(
        (item) => `
          <tr>
            <td data-label="Visitante">
              <div class="acesso-lista-visitante">
                <strong>${item.nome_visitante || "-"}</strong>
                ${item.urgente ? '<span class="acesso-urgente-badge">Urgente</span>' : ''}
              </div>
            </td>
            <td data-label="Tipo">${item.tipo_acesso || "-"}</td>
            <td data-label="Documento">${item.documento || "-"}</td>
            <td data-label="Servico">${item.servico || item.empresa || "-"}</td>
            <td data-label="Horario">${formatarDataHora(item.inicio_previsto)}</td>
            <td data-label="Status"><span class="funcionario-chip funcionario-chip-convite">${item.status || "-"}</span></td>
            <td data-label="Destino">${item.destinado_nome || "Fila geral"}</td>
            <td data-label="Acoes">
              ${(item.status === "negado" || item.status === "finalizado") ? `<button type="button" class="btn-primary-soft btn-reenviar-acesso" data-id="${item.id}">Reenviar</button>` : "-"}
            </td>
          </tr>
        `,
      )
      .join("");

    tbody.querySelectorAll(".btn-reenviar-acesso").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = autorizacoes.find((entry) => entry.id === button.dataset.id);
        if (!item) return;
        try {
          await reenviarAutorizacaoMorador(item);
          showToast("Solicitacao reenviada com sucesso");
          await carregarAcessosMorador();
        } catch (error) {
          console.error(error);
          showToast(error.message || "Nao foi possivel reenviar a solicitacao", "error");
        }
      });
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar liberacoes.</td></tr>`;
    showToast(error.message || "Erro ao carregar liberacoes", "error");
  }
}
function abrirModalNovaLiberacaoMorador() {
  const modal = document.getElementById("modalAcessoMorador");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Nova Liberacao</h3>
          <p>Preencha os dados do visitante ou selecione um colaborador recorrente.</p>
        </div>
        <button type="button" class="modal-close" id="closeAcessoMorador">&times;</button>
      </div>
      <form id="formAcessoMorador">
        <div class="modal-section">
          <div class="modal-section-title">Dados da autorizacao</div>
          <div class="form-grid two-columns">
            <label>Pessoa do inBox
              <select name="inbox_visitante_id" id="inboxVisitanteAcesso">
                <option value="">Selecione ou preencha manualmente</option>
              </select>
            </label>
            <label>Colaborador recorrente
              <select name="colaborador_unidade_id" id="colaboradorRecorrenteAcesso">
                <option value="">Selecione ou preencha manualmente</option>
              </select>
            </label>
            <label>Tipo
              <select name="tipo_acesso" id="tipoAcessoMorador" required>
                <option value="visitante">Visitante</option>
                <option value="prestador">Prestador</option>
                <option value="entrega">Entrega</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label class="acesso-urgente-inline">
              <span>Liberacao urgente</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="urgente" id="urgenteAcessoMorador" />
                <small>Prioriza o atendimento na portaria.</small>
              </div>
            </label>
            <label>Nome
              <input type="text" name="nome_visitante" id="nomeVisitanteMorador" required />
            </label>
            <label>Documento
              <input type="text" name="documento" id="documentoVisitanteMorador" />
            </label>
            <label>Empresa
              <input type="text" name="empresa" id="empresaVisitanteMorador" />
            </label>
            <label class="full-width" id="fieldServicoMorador">Servico
              <input type="text" name="servico" id="servicoVisitanteMorador" placeholder="Ex.: Instalacao de internet" />
            </label>
            <label id="fieldCategoriaPrestadorMorador">Categoria do servico
              <select name="categoria_servico" id="categoriaPrestadorMorador">
                <option value="">Selecione</option>
                ${Object.entries(CATEGORIA_PRESTADOR_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
              </select>
            </label>
            <label class="full-width" id="fieldPrestadorRecorrenteMorador">Prestador recorrente
              <select name="prestador_servico_id" id="prestadorRecorrenteMorador">
                <option value="">Selecione ou preencha manualmente</option>
              </select>
            </label>
            <label>Placa/Veiculo
              <input type="text" name="placa" />
            </label>
            <label>Inicio previsto
              <input type="datetime-local" name="inicio_previsto" required />
            </label>
            <label>Fim previsto
              <input type="datetime-local" name="fim_previsto" />
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelAcessoMorador">Cancelar</button>
          <button type="submit" class="btn-confirm">Enviar solicitacao</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const colaboradorSelect = document.getElementById("colaboradorRecorrenteAcesso");
  const inboxSelect = document.getElementById("inboxVisitanteAcesso");
  const tipoSelect = document.getElementById("tipoAcessoMorador");
  const nomeInput = document.getElementById("nomeVisitanteMorador");
  const documentoInput = document.getElementById("documentoVisitanteMorador");
  const empresaInput = document.getElementById("empresaVisitanteMorador");
  const servicoInput = document.getElementById("servicoVisitanteMorador");
  const fieldServico = document.getElementById("fieldServicoMorador");
  const categoriaPrestadorSelect = document.getElementById("categoriaPrestadorMorador");
  const fieldCategoriaPrestador = document.getElementById("fieldCategoriaPrestadorMorador");
  const prestadorRecorrenteMorador = document.getElementById("prestadorRecorrenteMorador");
  const fieldPrestadorRecorrenteMorador = document.getElementById("fieldPrestadorRecorrenteMorador");
  const placaInput = modal.querySelector('input[name="placa"]');
  let colaboradores = [];
  let inboxPessoas = [];
  let prestadores = [];

  const toggleServico = () => {
    const tipo = tipoSelect?.value;
    if (!fieldServico) return;
    const isPrestador = tipo === "prestador";
    fieldServico.style.display = isPrestador ? "block" : "none";
    fieldCategoriaPrestador.style.display = isPrestador ? "block" : "none";
    fieldPrestadorRecorrenteMorador.style.display = isPrestador ? "block" : "none";
    if (!isPrestador) {
      categoriaPrestadorSelect.value = "";
      prestadorRecorrenteMorador.value = "";
    }
  };

  const aplicarColaboradorRecorrente = () => {
    const colaborador = colaboradores.find((item) => item.id === colaboradorSelect?.value);
    if (!colaborador) {
      toggleServico();
      return;
    }

    tipoSelect.value = "prestador";
    nomeInput.value = colaborador.nome_completo || "";
    documentoInput.value = colaborador.documento || "";
    empresaInput.value = colaborador.empresa || "";
    servicoInput.value = formatarFuncaoColaborador(colaborador.funcao);
    toggleServico();
  };

  const aplicarPrestadorRecorrente = () => {
    const prestador = prestadores.find((item) => item.id === prestadorRecorrenteMorador?.value);
    if (!prestador) return;

    tipoSelect.value = "prestador";
    nomeInput.value = prestador.nome_prestador || "";
    documentoInput.value = prestador.documento || "";
    empresaInput.value = prestador.empresa || "";
    servicoInput.value = formatarCategoriaPrestador(prestador.categoria_servico);
    categoriaPrestadorSelect.value = prestador.categoria_servico || "";
    placaInput.value = prestador.placa || "";
    toggleServico();
  };

  const carregarPrestadoresMorador = async () => {
    if (tipoSelect?.value !== "prestador") return;
    try {
      prestadores = await buscarSugestoesPrestadoresServico({
        categoria_servico: categoriaPrestadorSelect?.value || "",
      });
      prestadorRecorrenteMorador.innerHTML = `<option value="">Selecione ou preencha manualmente</option>${prestadores
        .map((item) => `<option value="${item.id}">${item.nome_prestador} - ${formatarCategoriaPrestador(item.categoria_servico)}</option>`)
        .join("")}`;
    } catch (error) {
      console.error(error);
      prestadorRecorrenteMorador.innerHTML = `<option value="">Nao foi possivel carregar prestadores</option>`;
    }
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("closeAcessoMorador")?.addEventListener("click", closeModal);
  document.getElementById("cancelAcessoMorador")?.addEventListener("click", closeModal);
  tipoSelect?.addEventListener("change", async () => {
    toggleServico();
    await carregarPrestadoresMorador();
  });
  colaboradorSelect?.addEventListener("change", aplicarColaboradorRecorrente);
  inboxSelect?.addEventListener("change", aplicarInboxVisitante);
  prestadorRecorrenteMorador?.addEventListener("change", aplicarPrestadorRecorrente);
  categoriaPrestadorSelect?.addEventListener("change", carregarPrestadoresMorador);
  toggleServico();

  buscarColaboradoresUnidade({ status: "ativo" })
    .then((lista) => {
      colaboradores = lista;
      colaboradorSelect.innerHTML = `<option value="">Selecione ou preencha manualmente</option>${lista
        .map((item) => `<option value="${item.id}">${item.nome_completo} - ${formatarFuncaoColaborador(item.funcao)}</option>`)
        .join("")}`;
    })
    .catch((error) => {
      console.error(error);
      colaboradorSelect.innerHTML = `<option value="">Nao foi possivel carregar colaboradores</option>`;
    });

  buscarSugestoesInboxUnidade()
    .then((lista) => {
      inboxPessoas = lista;
      inboxSelect.innerHTML = `<option value="">Selecione ou preencha manualmente</option>${lista
        .map((item) => `<option value="${item.id}">${item.nome_completo} - ${item.parentesco_relacao || "recorrente"}${item.status === "bloqueado" ? " (bloqueado)" : ""}</option>`)
        .join("")}`;
    })
    .catch((error) => {
      console.error(error);
      inboxSelect.innerHTML = `<option value="">Nao foi possivel carregar o inBox</option>`;
    });

  carregarPrestadoresMorador().catch((error) => console.error(error));

  document.getElementById("formAcessoMorador")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await criarAutorizacaoAcesso(payload);
      closeModal();
      showToast("Solicitacao enviada com sucesso");
      await carregarAcessosMorador();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao criar solicitacao", "error");
    }
  });
}
function getAcoesPortariaPorStatus(item) {
  const status = item?.status || "pendente";
  const actions = [];

  if (!item?.assumido_por_funcionario_id) {
    actions.push({ evento: "ajuste", label: "Assumir" });
  }

  if (status === "pendente" || status === "autorizado") {
    actions.push({ evento: "entrada", label: "Registrar entrada" });
    actions.push({ evento: "negado", label: "Negar acesso" });
  }

  if (status === "em_andamento") {
    actions.push({ evento: "saida", label: "Registrar saida" });
  }

  return actions;
}

function formatarSolicitanteAcesso(item) {
  if (item?.origem_solicitacao === "portaria") {
    return `Portaria - ${item.solicitante_nome || "Atendimento local"}`;
  }
  if (item?.origem_solicitacao === "admin") {
    return `Admin - ${item.solicitante_nome || "Operacao interna"}`;
  }
  return item?.solicitante_nome || "-";
}

function formatarResumoDestinoAcesso(item) {
  const destinoBase = item?.destino_descricao || (item?.unidade_identificacao ? `Unidade ${item.unidade_identificacao}` : "Fila geral");
  if (item?.contato_destino) {
    return `${destinoBase} - ${item.contato_destino}`;
  }
  return destinoBase;
}

function abrirModalNovaEntradaPortaria() {
  const existing = document.getElementById("modalEntradaPortaria");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalEntradaPortaria";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Nova Entrada na Portaria</h3>
          <p>Registre atendimento local, visita espontanea ou prestador sem pre-liberacao.</p>
        </div>
        <button type="button" class="modal-close" id="closeEntradaPortaria">&times;</button>
      </div>
      <form id="formEntradaPortaria">
        <div class="modal-section">
          <div class="modal-section-title">Dados da pessoa</div>
          <div class="form-grid two-columns">
            <label>Tipo
              <select name="tipo_acesso" id="tipoEntradaPortaria" required>
                <option value="visitante">Visitante</option>
                <option value="prestador">Prestador</option>
                <option value="entrega">Entrega</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label>Nome
              <input type="text" name="nome_visitante" required />
            </label>
            <label class="full-width">Pessoa do inBox
              <div class="prestador-inline-stack">
                <input type="text" id="buscaInboxPortaria" placeholder="Buscar por nome, documento ou telefone" />
                <select name="inbox_visitante_id" id="inboxVisitantePortaria">
                  <option value="">Selecione ou preencha manualmente</option>
                </select>
              </div>
            </label>
            <label>Documento
              <input type="text" name="documento" />
            </label>
            <label>Empresa
              <input type="text" name="empresa" />
            </label>
            <label id="fieldServicoPortaria" class="full-width">Servico
              <input type="text" name="servico" placeholder="Ex.: Instalacao de internet" />
            </label>
            <label id="fieldCategoriaPrestadorPortaria">Categoria do servico
              <select name="categoria_servico" id="categoriaPrestadorPortaria">
                <option value="">Selecione</option>
                ${Object.entries(CATEGORIA_PRESTADOR_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
              </select>
            </label>
            <label class="full-width" id="fieldPrestadorRecorrentePortaria">Prestador recorrente
              <div class="prestador-inline-stack">
                <input type="text" id="buscaPrestadorPortaria" placeholder="Buscar por nome, empresa, documento ou placa" />
                <select name="prestador_servico_id" id="prestadorRecorrentePortaria">
                  <option value="">Selecione ou preencha manualmente</option>
                </select>
                <div class="modal-inline-actions">
                  <button type="button" id="btnCadastroRapidoPrestadorPortaria" class="btn-primary-soft">Cadastrar rapido</button>
                </div>
              </div>
            </label>
            <label>Placa
              <input type="text" name="placa" />
            </label>
            <label>Descricao do veiculo
              <input type="text" name="veiculo_descricao" placeholder="Ex.: HB20 prata" />
            </label>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Destino e atendimento</div>
          <div class="form-grid two-columns">
            <label>Destino
              <select name="destino_tipo" id="destinoTipoPortaria" required>
                <option value="unidade">Unidade</option>
                <option value="administracao">Administracao</option>
                <option value="area_comum">Area comum</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label>Para onde vai
              <input type="text" name="destino_descricao" id="destinoDescricaoPortaria" placeholder="Ex.: Unidade 104 ou Administracao" />
            </label>
            <label class="full-width">Com quem vai falar
              <input type="text" name="contato_destino" placeholder="Ex.: Rafael ou recepcao administrativa" />
            </label>
            <label>Inicio previsto
              <input type="datetime-local" name="inicio_previsto" required />
            </label>
            <label>Fim previsto
              <input type="datetime-local" name="fim_previsto" />
            </label>
            <label class="acesso-urgente-inline">
              <span>Urgente</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="urgente" />
                <small>Destaca o atendimento na fila.</small>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelEntradaPortaria">Cancelar</button>
          <button type="submit" class="btn-confirm">Registrar na fila</button>
        </div>
      </form>
    </div>
  `;

  const close = () => {
    overlay.remove();
    document.body.classList.remove("modal-open");
  };

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");

  const tipoSelect = overlay.querySelector("#tipoEntradaPortaria");
  const fieldServico = overlay.querySelector("#fieldServicoPortaria");
  const fieldCategoriaPrestador = overlay.querySelector("#fieldCategoriaPrestadorPortaria");
  const fieldPrestadorRecorrente = overlay.querySelector("#fieldPrestadorRecorrentePortaria");
  const categoriaPrestadorSelect = overlay.querySelector("#categoriaPrestadorPortaria");
  const buscaPrestadorInput = overlay.querySelector("#buscaPrestadorPortaria");
  const prestadorRecorrenteSelect = overlay.querySelector("#prestadorRecorrentePortaria");
  const buscaInboxInput = overlay.querySelector("#buscaInboxPortaria");
  const inboxVisitanteSelect = overlay.querySelector("#inboxVisitantePortaria");
  const destinoSelect = overlay.querySelector("#destinoTipoPortaria");
  const destinoInput = overlay.querySelector("#destinoDescricaoPortaria");
  const nomeInput = overlay.querySelector('input[name="nome_visitante"]');
  const documentoInput = overlay.querySelector('input[name="documento"]');
  const empresaInput = overlay.querySelector('input[name="empresa"]');
  const servicoInput = overlay.querySelector('input[name="servico"]');
  const placaInput = overlay.querySelector('input[name="placa"]');
  const veiculoInput = overlay.querySelector('input[name="veiculo_descricao"]');
  const submitButton = overlay.querySelector('#formEntradaPortaria button[type="submit"]');
  let prestadores = [];
  let inboxPessoas = [];
  let inboxBloqueadoSelecionado = false;

  const syncFields = () => {
    const isPrestador = tipoSelect.value === "prestador";
    fieldServico.style.display = isPrestador ? "block" : "none";
    fieldCategoriaPrestador.style.display = isPrestador ? "block" : "none";
    fieldPrestadorRecorrente.style.display = isPrestador ? "block" : "none";
    if (!isPrestador) {
      categoriaPrestadorSelect.value = "";
      prestadorRecorrenteSelect.value = "";
    }

    if (destinoSelect.value === "unidade") {
      destinoInput.placeholder = "Ex.: Unidade 104";
    } else if (destinoSelect.value === "administracao") {
      destinoInput.placeholder = "Ex.: Administracao";
    } else if (destinoSelect.value === "area_comum") {
      destinoInput.placeholder = "Ex.: Sala de reuniao";
    } else {
      destinoInput.placeholder = "Descreva o destino";
    }
  };

  const aplicarPrestadorRecorrentePortaria = () => {
    const prestador = prestadores.find((item) => item.id === prestadorRecorrenteSelect?.value);
    if (!prestador) return;

    nomeInput.value = prestador.nome_prestador || "";
    documentoInput.value = prestador.documento || "";
    empresaInput.value = prestador.empresa || "";
    servicoInput.value = formatarCategoriaPrestador(prestador.categoria_servico);
    categoriaPrestadorSelect.value = prestador.categoria_servico || "";
    placaInput.value = prestador.placa || "";
    veiculoInput.value = prestador.veiculo_descricao || "";
  };

  const aplicarInboxPortaria = () => {
    const pessoa = inboxPessoas.find((item) => item.id === inboxVisitanteSelect?.value);
    if (!pessoa) {
      inboxBloqueadoSelecionado = false;
      if (submitButton) submitButton.disabled = false;
      return;
    }
    if (pessoa.status === "bloqueado") {
      inboxBloqueadoSelecionado = true;
      if (submitButton) submitButton.disabled = true;
      showToast("Acesso bloqueado. Exija liberacao manual antes do atendimento.", "error");
      return;
    }

    inboxBloqueadoSelecionado = false;
    if (submitButton) submitButton.disabled = false;

    tipoSelect.value = "visitante";
    nomeInput.value = pessoa.nome_completo || "";
    documentoInput.value = pessoa.documento || "";
    empresaInput.value = pessoa.parentesco_relacao || "";
    if (pessoa.unidade_identificacao) {
      destinoSelect.value = "unidade";
      destinoInput.value = `Unidade ${pessoa.unidade_identificacao}`;
    }
    syncFields();
  };

  const carregarInboxPortaria = async () => {
    try {
      inboxPessoas = await buscarSugestoesInboxUnidade({ termo: buscaInboxInput?.value || "", apenas_ativos: "0" });
      inboxVisitanteSelect.innerHTML = `<option value="">Selecione ou preencha manualmente</option>${inboxPessoas
        .map((item) => `<option value="${item.id}">${item.nome_completo} - Unidade ${item.unidade_identificacao || "-"}${item.status === "bloqueado" ? " (bloqueado)" : ""}</option>`)
        .join("")}`;
    } catch (error) {
      console.error(error);
      inboxVisitanteSelect.innerHTML = `<option value="">Nao foi possivel carregar o inBox</option>`;
    }
  };

  const carregarPrestadoresPortaria = async () => {
    if (tipoSelect.value !== "prestador") return;
    try {
      prestadores = await buscarSugestoesPrestadoresServico({
        termo: buscaPrestadorInput?.value || "",
        categoria_servico: categoriaPrestadorSelect?.value || "",
      });
      prestadorRecorrenteSelect.innerHTML = `<option value="">Selecione ou preencha manualmente</option>${prestadores
        .map((item) => `<option value="${item.id}">${item.nome_prestador} - ${formatarCategoriaPrestador(item.categoria_servico)}</option>`)
        .join("")}`;
    } catch (error) {
      console.error(error);
      prestadorRecorrenteSelect.innerHTML = `<option value="">Nao foi possivel carregar prestadores</option>`;
    }
  };

  const cadastrarRapidoPrestadorPortaria = async () => {
    const payload = {
      nome_prestador: nomeInput.value?.trim(),
      documento: documentoInput.value?.trim(),
      empresa: empresaInput.value?.trim(),
      telefone: "",
      whatsapp: "",
      placa: placaInput.value?.trim(),
      veiculo_descricao: veiculoInput.value?.trim(),
      responsavel_nome: "",
      categoria_servico: categoriaPrestadorSelect.value,
      observacoes: "Cadastro rapido realizado pela portaria durante atendimento.",
      contato_utilitario: false,
      atende_24h: false,
    };

    if (!payload.nome_prestador || !payload.categoria_servico) {
      showToast("Informe nome e categoria antes do cadastro rapido", "error");
      return;
    }

    try {
      const resultado = await criarPrestadorServico(payload);
      showToast("Prestador cadastrado com sucesso");
      await carregarPrestadoresPortaria();
      const novoId = resultado?.resultado?.prestador?.id;
      if (novoId) {
        prestadorRecorrenteSelect.value = novoId;
        aplicarPrestadorRecorrentePortaria();
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || "Nao foi possivel cadastrar o prestador", "error");
    }
  };

  overlay.querySelector("#closeEntradaPortaria")?.addEventListener("click", close);
  overlay.querySelector("#cancelEntradaPortaria")?.addEventListener("click", close);
  tipoSelect?.addEventListener("change", async () => {
    syncFields();
    await carregarPrestadoresPortaria();
  });
  destinoSelect?.addEventListener("change", syncFields);
  categoriaPrestadorSelect?.addEventListener("change", carregarPrestadoresPortaria);
  buscaPrestadorInput?.addEventListener("input", carregarPrestadoresPortaria);
  prestadorRecorrenteSelect?.addEventListener("change", aplicarPrestadorRecorrentePortaria);
  buscaInboxInput?.addEventListener("input", carregarInboxPortaria);
  inboxVisitanteSelect?.addEventListener("change", aplicarInboxPortaria);
  overlay.querySelector("#btnCadastroRapidoPrestadorPortaria")?.addEventListener("click", cadastrarRapidoPrestadorPortaria);
  syncFields();
  carregarPrestadoresPortaria().catch((error) => console.error(error));
  carregarInboxPortaria().catch((error) => console.error(error));

  overlay.querySelector("#formEntradaPortaria")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (inboxBloqueadoSelecionado) {
      showToast("Acesso bloqueado. Remova a selecao ou obtenha liberacao manual.", "error");
      return;
    }
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await criarAutorizacaoAcesso(payload);
      close();
      showToast("Entrada registrada na fila da portaria");
      await carregarFilaPortaria();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Nao foi possivel registrar a entrada", "error");
    }
  });
}

async function renderFilaPortaria(container) {
  container.innerHTML = 
    '<div class="page-header acessos-page-header">' +
      '<div class="page-heading-group">' +
        '<h2>Fila da Portaria</h2>' +
        '<div class="page-subtitle">Acompanhe as liberacoes e registre entrada, saida ou negacao.</div>' +
      '</div>' +
      '<div class="portaria-header-actions">' +
        '<label class="portaria-alert-toggle">' +
          '<input type="checkbox" id="toggleAlertasPortaria" ' + (getPortariaAlertasAtivos() ? 'checked' : '') + ' />' +
          '<span>Alertas urgentes</span>' +
        '</label>' +
        '<button id="btnNovaEntradaPortaria" class="btn-primary-soft">+ Nova Entrada</button>' +
        '<button id="btnAtualizarFila" class="btn-primary-soft">Atualizar fila</button>' +
      '</div>' +
    '</div>' +
    '<div class="reservas-overview-grid reservas-overview-grid-compact portaria-overview-grid" id="filaPortariaResumo">' +
      '<article class="reservas-overview-card"><span>ENTRADAS</span><strong>0</strong><small>Entradas registradas hoje</small></article>' +
      '<article class="reservas-overview-card"><span>SAIDAS</span><strong>0</strong><small>Saidas registradas hoje</small></article>' +
      '<article class="reservas-overview-card"><span>PENDENTES</span><strong>0</strong><small>Solicitacoes aguardando atencao</small></article>' +
      '<article class="reservas-overview-card"><span>EM ANDAMENTO</span><strong>0</strong><small>Acessos com entrada ja registrada</small></article>' +
      '<article class="reservas-overview-card"><span>URGENTES</span><strong>0</strong><small>Chamados com prioridade visual</small></article>' +
    '</div>' +
    '<div class="panel acessos-panel portaria-turno-panel">' +
      '<div class="acessos-morador-filtros-head">Turno da portaria</div>' +
      '<div id="portariaSessoesAtivas" class="portaria-sessoes-grid">' +
        '<article class="portaria-sessao-card muted"><strong>Carregando</strong><small>Lendo sessoes ativas do turno...</small></article>' +
      '</div>' +
      '<div class="portaria-sessoes-recentes-wrap">' +
        '<div class="portaria-sessoes-recentes-title">Trocas recentes</div>' +
        '<div id="portariaSessoesRecentes" class="portaria-sessoes-recentes-list">' +
          '<span class="portaria-sessao-empty">Sem trocas registradas ainda.</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="panel acessos-panel portaria-list-panel">' +
      '<div class="acessos-morador-filtros-head">Filtrar fila da portaria</div>' +
      '<div class="acessos-morador-filtros" id="filaPortariaFiltros">' +
        '<button type="button" class="acesso-filtro-chip active" data-status="ativos">Ativos</button>' +
        '<button type="button" class="acesso-filtro-chip" data-status="finalizados">Finalizados hoje</button>' +
        '<button type="button" class="acesso-filtro-chip" data-status="negados">Negados</button>' +
        '<button type="button" class="acesso-filtro-chip" data-status="todos_hoje">Todos hoje</button>' +
      '</div>' +
      '<div class="portaria-list-table-wrap">' +
        '<table class="moradores-table portaria-list-table">' +
          '<thead><tr><th>Visitante</th><th>Tipo</th><th>Solicitante</th><th>Servico</th><th>Inicio</th><th>Fluxo</th><th>Status</th><th>Acoes</th></tr></thead>' +
          '<tbody id="filaPortariaBody"><tr><td colspan="8">Carregando fila da portaria...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  document.getElementById("btnNovaEntradaPortaria").addEventListener("click", abrirModalNovaEntradaPortaria);
  document.getElementById("btnAtualizarFila").addEventListener("click", () => carregarFilaPortaria());
  document.querySelectorAll("#filaPortariaFiltros .acesso-filtro-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("#filaPortariaFiltros .acesso-filtro-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      await carregarFilaPortaria();
    });
  });
  document.getElementById("toggleAlertasPortaria")?.addEventListener("change", (event) => {
    setPortariaAlertasAtivos(Boolean(event.target.checked));
    showToast(event.target.checked ? "Alertas urgentes ativados" : "Alertas urgentes desativados");
  });

  startPortariaQueueRefresh();
  await carregarFilaPortaria();
}

function getFiltroFilaPortariaStatus() {
  return document.querySelector("#filaPortariaFiltros .acesso-filtro-chip.active")?.dataset.status || "ativos";
}

async function carregarFilaPortaria() {
  const tbody = document.getElementById("filaPortariaBody");
  const resumoEl = document.getElementById("filaPortariaResumo");
  if (!tbody) return;

  try {
    const visao = getFiltroFilaPortariaStatus();
    const [resultado, sessoes] = await Promise.all([buscarFilaPortaria({ visao }), buscarSessoesPortaria()]);
    const fila = Array.isArray(resultado.fila) ? resultado.fila : [];
    atualizarResumoPortaria(resumoEl, resultado.resumo || {});
    atualizarPainelSessoesPortaria(sessoes || {});
    processarAlertasUrgentesPortaria(fila);

    if (!fila.length) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhuma solicitacao pendente na fila agora.</td></tr>';
      return;
    }

    if (!fila.length) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhuma solicitacao encontrada para este filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = fila.map((item) => {
      const urgenteBadge = Number(item.urgente) === 1 ? '<span class="acesso-urgente-badge">Urgente</span>' : '';
      const rowClass = Number(item.urgente) === 1 ? 'portaria-row-urgente' : '';
      const acoes = getAcoesPortariaPorStatus(item)
        .map((action) => '<button type="button" class="btn-primary-soft btn-acesso-evento" data-id="' + item.id + '" data-evento="' + action.evento + '">' + action.label + '</button>')
        .join('');

      return '<tr class="' + rowClass + '">' +
        '<td><div class="portaria-visitante-cell"><strong>' + (item.nome_visitante || '-') + '</strong><small>Unidade ' + (item.unidade_identificacao || '-') + '</small>' + urgenteBadge + '</div></td>' +
        '<td>' + formatarTipoAcessoLabel(item.tipo_acesso) + '</td>' +
        '<td>' + formatarSolicitanteAcesso(item) + '</td>' +
        '<td>' + (item.servico || item.empresa || item.contato_destino || item.destino_descricao || '-') + '</td>' +
        '<td>' + formatarDataHora(item.inicio_previsto) + '</td>' +
        '<td><div class="portaria-fluxo-cell"><strong>' + formatarResumoDestinoAcesso(item) + '</strong><small>Em atendimento por: ' + (item.assumido_nome || 'Aguardando') + '</small><small>' + formatarResumoUltimaAcaoPortaria(item) + '</small></div></td>' +
        '<td><span class="funcionario-chip funcionario-chip-cargo">' + (item.status || '-') + '</span></td>' +
        '<td><div class="portaria-acoes-inline">' + acoes + '</div></td>' +
      '</tr>';
    }).join('');

    document.querySelectorAll('.btn-acesso-evento').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await registrarEventoAcesso({
            autorizacao_id: button.dataset.id,
            tipo_evento: button.dataset.evento,
            origem: 'manual',
          });
          showToast('Evento operacional registrado');
          await carregarFilaPortaria();
        } catch (error) {
          console.error(error);
          showToast(error.message || 'Erro ao registrar evento', 'error');
        }
      });
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="8">Erro ao carregar a fila da portaria.</td></tr>';
    showToast(error.message || 'Erro ao carregar fila da portaria', 'error');
  }
}

function getStatusOperacionalCondominio(condominio) {
  const ativoBanco = Number(condominio?.ativo) === 1;
  const possuiEstrutura = (condominio?.torres?.length || 0) > 0 || (condominio?.areas?.length || 0) > 0;
  const possuiMovimento = (condominio?.reservas?.length || 0) > 0;

  if (ativoBanco && (possuiEstrutura || possuiMovimento)) {
    return { label: "Em operacao", variant: "is-active" };
  }

  if (ativoBanco) {
    return { label: "Em implantacao", variant: "is-active" };
  }

  if (!ativoBanco && (possuiEstrutura || possuiMovimento)) {
    return { label: "Com historico", variant: "is-active" };
  }

  return { label: "Pausado", variant: "is-inactive" };
}

async function buscarResidentesDaUnidade() {
  const response = await fetch("http://localhost:3000/moradores/me/residentes", {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao carregar residentes da unidade");
  }

  return data;
}

async function buscarInboxUnidade(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(`http://localhost:3000/inbox-unidade${queryString ? `?${queryString}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao carregar o inBox");
  }

  return data;
}

async function buscarSugestoesInboxUnidade(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(`http://localhost:3000/inbox-unidade/sugestoes${queryString ? `?${queryString}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao buscar sugestoes do inBox");
  }

  return Array.isArray(data.pessoas) ? data.pessoas : [];
}

async function criarInboxUnidade(payload) {
  const response = await fetch("http://localhost:3000/inbox-unidade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao criar pessoa no inBox");
  }

  return data.resultado || data;
}

async function atualizarInboxUnidade(id, payload) {
  const response = await fetch(`http://localhost:3000/inbox-unidade/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao atualizar pessoa do inBox");
  }

  return data.resultado || data;
}

async function atualizarStatusInboxUnidade(id, status, extra = {}) {
  const response = await fetch(`http://localhost:3000/inbox-unidade/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ status, ...extra }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao atualizar status do inBox");
  }

  return data.resultado || data;
}

async function criarResidenteDaUnidade(payload) {
  const response = await fetch("http://localhost:3000/moradores/me/residentes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao criar residente");
  }

  return data.resultado || data;
}

async function reenviarConviteResidente(id) {
  const response = await fetch(`http://localhost:3000/moradores/me/residentes/${id}/enviar-convite`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Erro ao reenviar convite");
  }

  return data.resultado || data;
}

async function renderAcessosAdmin(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Controle de Acesso</h2>
        <div class="page-subtitle">Supervisione as liberacoes do condominio e a distribuicao na portaria.</div>
      </div>
    </div>
    <div class="panel acessos-panel">
      <div class="moradores-toolbar">
        <div class="filters-grid compact">
          <label>Condominio
            <select id="acessosAdminCondominio"></select>
          </label>
          <label>Status
            <select id="acessosAdminStatus">
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="em_andamento">Em andamento</option>
              <option value="finalizado">Finalizados</option>
              <option value="negado">Negados</option>
            </select>
          </label>
          <label>De
            <input type="date" id="acessosAdminDataInicio" />
          </label>
          <label>Ate
            <input type="date" id="acessosAdminDataFim" />
          </label>
        </div>
        <div class="areas-toolbar-actions">
          <button id="btnExportAcessosAdmin" class="btn-primary-soft">Exportar CSV</button>
          <button id="btnPrintAcessosAdmin" class="btn-primary-soft">Imprimir</button>
          <button id="btnLoadAcessosAdmin" class="btn-primary-soft">Carregar Acessos</button>
        </div>
      </div>
    </div>
    <div class="panel acessos-panel">
      <table class="moradores-table">
        <thead>
          <tr>
            <th>Visitante</th>
            <th>Tipo</th>
            <th>Solicitante</th>
            <th>Servico</th>
            <th>Inicio</th>
            <th>Status</th>
            <th>Fluxo</th>
            <th>Em atendimento por</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody id="acessosAdminBody">
          <tr><td colspan="9">Carregando acessos...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const select = document.getElementById("acessosAdminCondominio");
  try {
    const condominios = await buscarCondominiosDoAdmin();
    select.innerHTML = `<option value="">Selecione um condominio</option>${condominios
      .map((condominio) => `<option value="${condominio.id}">${condominio.nome_fantasia}</option>`)
      .join("")}`;

    if (condominios.length) {
      select.value = condominios[0].id;
      await carregarAcessosAdmin();
    }
  } catch (error) {
    console.error(error);
  }

  document
    .getElementById("btnLoadAcessosAdmin")
    .addEventListener("click", carregarAcessosAdmin);
  document.getElementById("btnExportAcessosAdmin")?.addEventListener("click", exportarAcessosAdminCsv);
  document.getElementById("btnPrintAcessosAdmin")?.addEventListener("click", imprimirAcessosAdmin);
  select.addEventListener("change", carregarAcessosAdmin);
  document.getElementById("acessosAdminStatus")?.addEventListener("change", carregarAcessosAdmin);
  document.getElementById("acessosAdminDataInicio")?.addEventListener("change", carregarAcessosAdmin);
  document.getElementById("acessosAdminDataFim")?.addEventListener("change", carregarAcessosAdmin);
}

async function carregarAcessosAdmin() {
  const tbody = document.getElementById("acessosAdminBody");
  const condominioId = document.getElementById("acessosAdminCondominio")?.value || "";
  const status = document.getElementById("acessosAdminStatus")?.value || "";
  const dataInicio = document.getElementById("acessosAdminDataInicio")?.value || "";
  const dataFim = document.getElementById("acessosAdminDataFim")?.value || "";
  if (!tbody || !condominioId) return;

  try {
    const autorizacoes = await buscarAutorizacoesAcesso({ condominio_id: condominioId, status });
    const autorizacoesFiltradas = autorizacoes.filter((item) => {
      const referencia = item.ultima_acao_em || item.inicio_previsto || item.criado_em;
      if (!referencia) return !dataInicio && !dataFim;
      const dataRef = new Date(referencia);
      if (Number.isNaN(dataRef.getTime())) return true;

      if (dataInicio) {
        const inicio = new Date(`${dataInicio}T00:00:00`);
        if (dataRef < inicio) return false;
      }

      if (dataFim) {
        const fim = new Date(`${dataFim}T23:59:59`);
        if (dataRef > fim) return false;
      }

      return true;
    });

    ultimoSnapshotAcessosAdmin = autorizacoesFiltradas;

    if (!autorizacoesFiltradas.length) {
      tbody.innerHTML = `<tr><td colspan="9">Nenhuma liberacao registrada neste condominio.</td></tr>`;
      return;
    }

    tbody.innerHTML = autorizacoesFiltradas
      .map(
        (item) => `
          <tr>
            <td>
              <div class="acesso-lista-visitante">
                <strong>${item.nome_visitante || "-"}</strong>
                ${item.urgente ? '<span class="acesso-urgente-badge">Urgente</span>' : ''}
              </div>
            </td>
            <td>${item.tipo_acesso || "-"}</td>
            <td>${formatarSolicitanteAcesso(item)}</td>
            <td>${item.servico || item.empresa || item.contato_destino || item.destino_descricao || "-"}</td>
            <td>${formatarDataHora(item.inicio_previsto)}</td>
            <td>${item.status || "-"}</td>
            <td>${formatarResumoDestinoAcesso(item)}</td>
            <td>${item.assumido_nome || "-"}</td>
            <td>
              <button type="button" class="btn-primary-soft btn-historico-acesso-admin" data-id="${item.id}">Historico</button>
            </td>
          </tr>
        `,
      )
      .join("");

    tbody.querySelectorAll(".btn-historico-acesso-admin").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await abrirHistoricoAcessoAdmin(button.dataset.id);
        } catch (error) {
          console.error(error);
          showToast(error.message || "Erro ao carregar historico", "error");
        }
      });
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="9">Erro ao carregar acessos.</td></tr>`;
    showToast(error.message || "Erro ao carregar acessos", "error");
  }
}

async function abrirHistoricoAcessoAdmin(autorizacaoId) {
  const resultado = await buscarHistoricoAcesso(autorizacaoId);
  const autorizacao = resultado.autorizacao || {};
  const eventos = Array.isArray(resultado.eventos) ? resultado.eventos : [];

  const existing = document.getElementById("modalHistoricoAcessoAdmin");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalHistoricoAcessoAdmin";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Historico da Liberacao</h3>
          <p>${autorizacao.nome_visitante || "-"} • ${formatarResumoDestinoAcesso(autorizacao)}</p>
        </div>
        <button type="button" class="modal-close" id="closeHistoricoAcessoAdmin">&times;</button>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Resumo</div>
        <div class="form-grid two-columns">
          <label>Solicitante
            <input type="text" value="${formatarSolicitanteAcesso(autorizacao)}" disabled />
          </label>
          <label>Status atual
            <input type="text" value="${autorizacao.status || "-"}" disabled />
          </label>
          <label>Inicio
            <input type="text" value="${formatarDataHora(autorizacao.inicio_previsto)}" disabled />
          </label>
          <label>Fim
            <input type="text" value="${formatarDataHora(autorizacao.fim_previsto)}" disabled />
          </label>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Trilha operacional</div>
        <div class="portaria-sessoes-recentes-list acesso-historico-list">
          ${eventos.length
            ? eventos
                .map(
                  (evento) => `
                    <div class="portaria-sessao-log-item acesso-historico-item">
                      <strong>${evento.tipo_evento || "-"}</strong>
                      <span>${evento.funcionario_nome || "Sistema/Portaria"}</span>
                      <small>${formatarDataHora(evento.criado_em)}${evento.sessao_iniciada_em ? ` • Sessao iniciada ${formatarDataHora(evento.sessao_iniciada_em)}` : ""}</small>
                      ${evento.observacao ? `<small>${evento.observacao}</small>` : ""}
                    </div>
                  `,
                )
                .join("")
            : `<span class="portaria-sessao-empty">Nenhum evento operacional registrado ainda.</span>`}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeHistoricoAcessoAdminFooter">Fechar</button>
      </div>
    </div>
  `;

  const close = () => {
    overlay.remove();
    document.body.classList.remove("modal-open");
  };

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
  overlay.querySelector("#closeHistoricoAcessoAdmin")?.addEventListener("click", close);
  overlay.querySelector("#closeHistoricoAcessoAdminFooter")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

function exportarAcessosAdminCsv() {
  if (!ultimoSnapshotAcessosAdmin.length) {
    showToast("Nao ha dados para exportar neste recorte", "error");
    return;
  }

  const linhas = [
    ["Visitante", "Tipo", "Solicitante", "Servico", "Inicio", "Status", "Fluxo", "Em atendimento por"],
    ...ultimoSnapshotAcessosAdmin.map((item) => [
      item.nome_visitante || "-",
      item.tipo_acesso || "-",
      formatarSolicitanteAcesso(item),
      item.servico || item.empresa || item.contato_destino || item.destino_descricao || "-",
      formatarDataHora(item.inicio_previsto),
      item.status || "-",
      formatarResumoDestinoAcesso(item),
      item.assumido_nome || "-",
    ]),
  ];

  const csv = linhas
    .map((linha) => linha.map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `acessos-admin-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("CSV exportado com sucesso");
}

function imprimirAcessosAdmin() {
  if (!ultimoSnapshotAcessosAdmin.length) {
    showToast("Nao ha dados para imprimir neste recorte", "error");
    return;
  }

  const linhas = ultimoSnapshotAcessosAdmin
    .map(
      (item) => `
        <tr>
          <td>${item.nome_visitante || "-"}</td>
          <td>${item.tipo_acesso || "-"}</td>
          <td>${formatarSolicitanteAcesso(item)}</td>
          <td>${item.servico || item.empresa || item.contato_destino || item.destino_descricao || "-"}</td>
          <td>${formatarDataHora(item.inicio_previsto)}</td>
          <td>${item.status || "-"}</td>
          <td>${formatarResumoDestinoAcesso(item)}</td>
          <td>${item.assumido_nome || "-"}</td>
        </tr>
      `,
    )
    .join("");

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    showToast("Nao foi possivel abrir a janela de impressao", "error");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>Relatorio de Acessos</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          p { color: #475569; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>Relatorio de Acessos</h1>
        <p>Gerado em ${formatarDataHora(new Date())}</p>
        <table>
          <thead>
            <tr>
              <th>Visitante</th>
              <th>Tipo</th>
              <th>Solicitante</th>
              <th>Servico</th>
              <th>Inicio</th>
              <th>Status</th>
              <th>Fluxo</th>
              <th>Em atendimento por</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function formatarDataHora(valor) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}





function getPortariaAlertasAtivos() {
  return localStorage.getItem("portariaAlertasAtivos") !== "false";
}

function setPortariaAlertasAtivos(value) {
  localStorage.setItem("portariaAlertasAtivos", value ? "true" : "false");
}

function stopPortariaQueueRefresh() {
  if (portariaQueueRefreshHandle) {
    clearInterval(portariaQueueRefreshHandle);
    portariaQueueRefreshHandle = null;
  }
}

function startPortariaQueueRefresh() {
  stopPortariaQueueRefresh();
  portariaQueueRefreshHandle = setInterval(() => {
    const user = JSON.parse(localStorage.getItem("usuario") || "null");
    const params = new URLSearchParams(window.location.search);
    if (user?.perfil === "funcionario" && params.get("page") === "acessos") {
      carregarFilaPortaria().catch((error) => console.error("Erro ao atualizar fila automaticamente:", error));
    }
  }, 15000);
}

function formatarResumoUltimaAcaoPortaria(item) {
  if (!item?.ultima_acao_tipo || !item?.ultima_acao_em) {
    return "Ultima acao: ainda nao registrada";
  }

  const tipoMap = {
    entrada: "Entrada",
    saida: "Saida",
    negado: "Negado",
    ajuste: "Assumido",
    tentativa: "Tentativa",
  };

  const por = item.ultima_acao_por_nome || "portaria";
  return "Ultima acao: " + (tipoMap[item.ultima_acao_tipo] || item.ultima_acao_tipo) + " por " + por + " as " + formatarHoraCurta(item.ultima_acao_em);
}

function formatarHoraCurta(valor) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function atualizarPainelSessoesPortaria(payload = {}) {
  const ativasEl = document.getElementById("portariaSessoesAtivas");
  const recentesEl = document.getElementById("portariaSessoesRecentes");
  if (!ativasEl || !recentesEl) return;

  const ativas = Array.isArray(payload.ativas) ? payload.ativas : [];
  const recentes = Array.isArray(payload.recentes) ? payload.recentes : [];

  ativasEl.innerHTML = ativas.length
    ? ativas.map((sessao, index) => `
        <article class="portaria-sessao-card ${index === 0 ? "is-primary" : ""}">
          <strong>${sessao.funcionario_nome || "Porteiro"}</strong>
          <span>${sessao.matricula || sessao.cargo || "Portaria"}</span>
          <small>Inicio do turno: ${formatarDataHora(sessao.iniciado_em)}</small>
          <small>Ultimo ping: ${formatarHoraCurta(sessao.ultimo_ping_em)}</small>
        </article>
      `).join("")
    : `<article class="portaria-sessao-card muted"><strong>Sem porteiro ativo</strong><small>Nenhuma sessao ativa de portaria neste momento.</small></article>`;

  recentesEl.innerHTML = recentes.length
    ? recentes.map((sessao) => `
        <div class="portaria-sessao-log-item">
          <strong>${sessao.funcionario_nome || "Porteiro"}</strong>
          <span>${sessao.matricula || sessao.cargo || "Portaria"}</span>
          <small>Encerrado em ${formatarDataHora(sessao.encerrado_em || sessao.ultimo_ping_em || sessao.iniciado_em)}</small>
        </div>
      `).join("")
    : `<span class="portaria-sessao-empty">Sem trocas registradas hoje.</span>`;
}
function atualizarResumoPortaria(container, resumo = {}) {
  if (!container) return;

  const cards = [
    ["ENTRADAS", resumo.entradas_hoje || 0, "Entradas registradas hoje"],
    ["SAIDAS", resumo.saidas_hoje || 0, "Saidas registradas hoje"],
    ["PENDENTES", resumo.pendentes || 0, "Solicitacoes aguardando atencao"],
    ["EM ANDAMENTO", resumo.em_andamento || 0, "Acessos com entrada ja registrada"],
    ["URGENTES", resumo.urgentes || 0, "Chamados com prioridade visual"],
  ];

  container.innerHTML = cards
    .map(
      ([label, value, description]) => `
        <article class="reservas-overview-card ${label === "URGENTES" && Number(value) > 0 ? "portaria-overview-urgent" : ""}">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${description}</small>
        </article>
      `,
    )
    .join("");
}

function tocarBipeUrgente() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const beep = (delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime + delay);
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.24);
    };
    beep(0);
    beep(0.28);
  } catch (error) {
    console.error("Nao foi possivel tocar o alerta da portaria:", error);
  }
}

function getUrgentSeenKey() {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  return `portariaUrgentesVistos:${user?.id || "anon"}`;
}

function getUrgentSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(getUrgentSeenKey()) || "[]");
  } catch {
    return [];
  }
}

function setUrgentSeenIds(ids) {
  localStorage.setItem(getUrgentSeenKey(), JSON.stringify(ids));
}

function marcarUrgentesComoVistos(ids) {
  const seen = new Set(getUrgentSeenIds());
  ids.forEach((id) => seen.add(id));
  setUrgentSeenIds(Array.from(seen));
}

function processarAlertasUrgentesPortaria(fila) {
  const urgentes = fila.filter(
    (item) => Number(item.urgente) === 1 && ["pendente", "autorizado", "em_andamento"].includes(item.status),
  );

  if (!urgentes.length || !getPortariaAlertasAtivos()) return;

  const seen = new Set(getUrgentSeenIds());
  const novos = urgentes.filter((item) => !seen.has(item.id));
  if (!novos.length) return;

  tocarBipeUrgente();
  mostrarPopupUrgentePortaria(novos);
}

function mostrarPopupUrgentePortaria(items) {
  const existing = document.getElementById("portariaUrgenteOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "portariaUrgenteOverlay";
  overlay.className = "portaria-urgente-overlay";
  overlay.innerHTML = `
    <div class="portaria-urgente-modal">
      <div class="portaria-urgente-modal-head">
        <div>
          <h3>Solicitacao urgente</h3>
          <p>Uma ou mais liberacoes imediatas chegaram para a portaria.</p>
        </div>
        <button type="button" class="modal-close" id="closePortariaUrgente">&times;</button>
      </div>
      <div class="portaria-urgente-list">
        ${items
          .map(
            (item) => `
              <article class="portaria-urgente-item">
                <strong>${item.nome_visitante || "-"}</strong>
                <span>${formatarTipoAcessoLabel(item.tipo_acesso)} - Unidade ${item.unidade_identificacao || "-"}</span>
                <small>Solicitante: ${item.solicitante_nome || "-"} - Inicio: ${formatarDataHora(item.inicio_previsto)}</small>
              </article>
            `,
          )
          .join("")}
      </div>
      <div class="modal-actions">
        <button type="button" id="ackPortariaUrgente" class="btn-confirm">Entendido</button>
      </div>
    </div>
  `;

  const close = () => {
    marcarUrgentesComoVistos(items.map((item) => item.id));
    overlay.remove();
  };

  document.body.appendChild(overlay);
  document.getElementById("closePortariaUrgente")?.addEventListener("click", close);
  document.getElementById("ackPortariaUrgente")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

function formatarTipoAcessoLabel(tipo) {
  const map = {
    visitante: "Visitante",
    prestador: "Prestador",
    entrega: "Entrega",
    outro: "Outro",
  };
  return map[tipo] || tipo || "-";
}






const FUNCAO_COLABORADOR_LABELS = {
  secretaria_lar: "Secretaria do lar",
  diarista: "Diarista",
  baba: "Baba",
  cuidador: "Cuidador",
  motorista: "Motorista",
  jardineiro: "Jardineiro",
  outro: "Outro",
};

function formatarFuncaoColaborador(funcao) {
  return FUNCAO_COLABORADOR_LABELS[funcao] || "Outro";
}

async function buscarColaboradoresUnidade(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/colaboradores-unidade${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar os colaboradores da unidade");
  }

  return Array.isArray(data.colaboradores) ? data.colaboradores : [];
}

async function criarColaboradorUnidade(payload) {
  const response = await fetch("http://localhost:3000/colaboradores-unidade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel criar o colaborador");
  }

  return data;
}

async function atualizarColaboradorUnidade(id, payload) {
  const response = await fetch(`http://localhost:3000/colaboradores-unidade/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o colaborador");
  }

  return data;
}

async function atualizarStatusColaboradorUnidade(id, status) {
  const response = await fetch(`http://localhost:3000/colaboradores-unidade/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o status do colaborador");
  }

  return data;
}

function renderColaboradoresUnidade(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  if (user?.perfil === "morador") {
    return renderColaboradoresUnidadeMorador(container);
  }

  return renderColaboradoresUnidadeAdmin(container);
}

function formatarStatusInbox(status) {
  if (status === "bloqueado") return "Bloqueado";
  if (status === "inativo") return "Inativo";
  return "Ativo";
}

function proximoStatusInbox(status) {
  if (status === "ativo") return "bloqueado";
  if (status === "bloqueado") return "inativo";
  return "ativo";
}

function rotuloAcaoInbox(status) {
  if (status === "ativo") return "Bloquear";
  if (status === "bloqueado") return "Inativar";
  return "Reativar";
}

function renderInboxAvatar(item) {
  if (item.foto_identificacao_url) {
    return `<img src="${item.foto_identificacao_url}" alt="${item.nome_completo}" class="residente-avatar" />`;
  }

  const initial = (item.nome_completo || "?").trim().charAt(0).toUpperCase();
  return `<span class="residente-avatar residente-avatar-fallback">${initial || "?"}</span>`;
}

function renderInboxUnidade(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  if (user?.perfil === "morador") {
    return renderInboxUnidadeMorador(container);
  }

  return renderInboxUnidadeAdmin(container);
}

async function renderInboxUnidadeMorador(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>InBox da Unidade</h2>
        <div class="page-subtitle">Cadastre ate 10 pessoas recorrentes com entrada mais livre na portaria, mantendo bloqueio e rastreabilidade.</div>
      </div>
      <button id="btnNovoInboxMorador" class="btn-primary-soft">+ Nova Pessoa</button>
    </div>

    <div id="inboxResumoMorador" class="panel residente-context-panel">
      <div class="moradores-loading">Carregando inBox...</div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="inboxMoradorTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Contato</th>
            <th>Relacao</th>
            <th>Status</th>
            <th>Ultimo acesso</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6">Carregando pessoas...</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalInboxUnidade" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovoInboxMorador")?.addEventListener("click", () => abrirModalInboxUnidade());
  await carregarInboxUnidadeMorador();
}

async function renderInboxUnidadeAdmin(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>InBox das Unidades</h2>
        <div class="page-subtitle">Supervisione as pessoas recorrentes liberadas por unidade, com bloqueio e limite operacional.</div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <div class="moradores-toolbar funcionarios-toolbar">
        <div class="filters-grid compact">
          <label>Condominio
            <select id="inboxCondominioFilter"></select>
          </label>
          <label>Unidade
            <select id="inboxUnidadeFilter">
              <option value="">Todas</option>
            </select>
          </label>
          <label>Status
            <select id="inboxStatusFilter">
              <option value="">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="bloqueado">Bloqueados</option>
              <option value="inativo">Inativos</option>
            </select>
          </label>
          <label>Busca
            <input type="text" id="inboxBuscaFilter" placeholder="Nome, documento, telefone..." />
          </label>
        </div>
        <div class="areas-toolbar-actions">
          <button id="btnLoadInboxAdmin" class="btn-primary-soft">Carregar inBox</button>
        </div>
      </div>
      <table id="inboxAdminTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Unidade</th>
            <th>Relacao</th>
            <th>Status</th>
            <th>Ultimo acesso</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="5">Carregando inBox...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const select = document.getElementById("inboxCondominioFilter");
  try {
    const condominios = await buscarCondominiosDoAdmin();
    select.innerHTML = `<option value="">Selecione um condominio</option>${condominios
      .map((c) => `<option value="${c.id}">${c.nome_fantasia}</option>`)
      .join("")}`;
    if (condominios.length) {
      select.value = condominios[0].id;
      await carregarUnidadesFiltroInbox();
      await carregarInboxUnidadeAdmin();
    }
  } catch (error) {
    console.error(error);
  }

  document.getElementById("inboxCondominioFilter")?.addEventListener("change", async () => {
    await carregarUnidadesFiltroInbox();
    await carregarInboxUnidadeAdmin();
  });
  document.getElementById("inboxUnidadeFilter")?.addEventListener("change", carregarInboxUnidadeAdmin);
  document.getElementById("inboxStatusFilter")?.addEventListener("change", carregarInboxUnidadeAdmin);
  document.getElementById("btnLoadInboxAdmin")?.addEventListener("click", carregarInboxUnidadeAdmin);
}

async function carregarUnidadesFiltroInbox() {
  const condominioId = document.getElementById("inboxCondominioFilter")?.value || "";
  const unidadeSelect = document.getElementById("inboxUnidadeFilter");
  if (!unidadeSelect) return;

  if (!condominioId) {
    unidadeSelect.innerHTML = `<option value="">Todas</option>`;
    return;
  }

  try {
    const unidades = await buscarUnidadesPorCondominio(condominioId);
    unidadeSelect.innerHTML = `<option value="">Todas</option>${unidades.map((u) => `<option value="${u.id}">${u.identificacao}</option>`).join("")}`;
  } catch (error) {
    console.error(error);
    unidadeSelect.innerHTML = `<option value="">Erro ao carregar unidades</option>`;
  }
}

async function carregarInboxUnidadeMorador() {
  const tbody = document.querySelector("#inboxMoradorTable tbody");
  const resumo = document.getElementById("inboxResumoMorador");
  if (!tbody || !resumo) return;

  try {
    const resultado = await buscarInboxUnidade();
    const pessoas = Array.isArray(resultado?.pessoas) ? resultado.pessoas : [];
    const contexto = resultado?.contexto || {};
    const limite = Number(resultado?.limite_por_unidade || 10);
    const ativos = pessoas.filter((item) => item.status === "ativo").length;
    const bloqueados = pessoas.filter((item) => item.status === "bloqueado").length;

    resumo.innerHTML = `
      <div class="residente-context-grid">
        <div class="overview-card">
          <span class="overview-label">UNIDADE</span>
          <strong>${contexto.unidade_identificacao || "-"}</strong>
          <small>${contexto.condominio_nome || "-"}</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">INBOX ATIVO</span>
          <strong>${ativos}/${limite}</strong>
          <small>${bloqueados} bloqueado(s) e ${pessoas.length} cadastro(s) totais.</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">CHECK-IN LIVRE</span>
          <strong>${ativos}</strong>
          <small>Pessoas ativas podem se identificar na portaria sem nova solicitacao.</small>
        </div>
      </div>
    `;

    if (!pessoas.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma pessoa cadastrada no inBox ainda.</td></tr>`;
      return;
    }

    preencherTabelaInbox(tbody, pessoas, false);
  } catch (error) {
    console.error(error);
    resumo.innerHTML = `<div class="moradores-empty">Nao foi possivel carregar o inBox.</div>`;
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar inBox.</td></tr>`;
  }
}

async function carregarInboxUnidadeAdmin() {
  const tbody = document.querySelector("#inboxAdminTable tbody");
  if (!tbody) return;

  const condominioId = document.getElementById("inboxCondominioFilter")?.value || "";
  const unidadeId = document.getElementById("inboxUnidadeFilter")?.value || "";
  const status = document.getElementById("inboxStatusFilter")?.value || "";
  const busca = document.getElementById("inboxBuscaFilter")?.value || "";

  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="5">Selecione um condominio para carregar o inBox.</td></tr>`;
    return;
  }

  try {
    const resultado = await buscarInboxUnidade({ condominio_id: condominioId, unidade_id: unidadeId, status, busca });
    const pessoas = Array.isArray(resultado?.pessoas) ? resultado.pessoas : [];
    if (!pessoas.length) {
      tbody.innerHTML = `<tr><td colspan="5">Nenhuma pessoa encontrada para os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = pessoas.map((item) => `
      <tr>
        <td>
          <div class="residente-name-cell">
            ${renderInboxAvatar(item)}
            <div class="funcionario-name-cell">
              <strong>${item.nome_completo || "-"}</strong>
              <small>${item.documento || item.telefone || "Sem identificacao complementar"}</small>
            </div>
          </div>
        </td>
        <td><div class="funcionario-contact-cell"><span>${item.unidade_identificacao || "-"}</span><small>${item.condominio_nome || "-"}</small></div></td>
        <td><span class="funcionario-chip funcionario-chip-area">${item.parentesco_relacao || "Sem relacao informada"}</span></td>
        <td><span class="status-badge status-${item.status === "ativo" ? "ativo" : "inativo"}">${formatarStatusInbox(item.status)}</span></td>
        <td>${item.ultimo_acesso_em ? formatarDataHora(item.ultimo_acesso_em) : "-"}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar inBox.</td></tr>`;
  }
}

function preencherTabelaInbox(tbody, pessoas, isAdmin) {
  const colspan = isAdmin ? 5 : 6;
  if (!pessoas.length) {
    tbody.innerHTML = `<tr><td colspan="${colspan}">Nenhuma pessoa encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = pessoas.map((item) => `
    <tr>
      <td>
        <div class="residente-name-cell">
          ${renderInboxAvatar(item)}
          <div class="funcionario-name-cell">
            <strong>${item.nome_completo || "-"}</strong>
            <small>${item.documento || "Sem documento"}</small>
          </div>
        </div>
      </td>
      <td>
        <div class="funcionario-contact-cell">
          <span>${item.telefone || "-"}</span>
          <small>${item.observacoes || "Entrada recorrente da unidade"}</small>
        </div>
      </td>
      <td><span class="funcionario-chip funcionario-chip-area">${item.parentesco_relacao || "Sem relacao"}</span></td>
      <td><span class="status-badge status-${item.status === "ativo" ? "ativo" : "inativo"}">${formatarStatusInbox(item.status)}</span></td>
      <td>${item.ultimo_acesso_em ? formatarDataHora(item.ultimo_acesso_em) : "-"}</td>
      <td>
        <div class="portaria-acoes-inline">
          <button type="button" class="btn-primary-soft btn-edit-inbox" data-id="${item.id}">Editar</button>
          <button type="button" class="btn-primary-soft btn-status-inbox" data-id="${item.id}" data-status="${proximoStatusInbox(item.status)}">${rotuloAcaoInbox(item.status)}</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".btn-edit-inbox").forEach((button) => {
    button.addEventListener("click", () => {
      const item = pessoas.find((entry) => entry.id === button.dataset.id);
      if (item) abrirModalInboxUnidade(item);
    });
  });

  tbody.querySelectorAll(".btn-status-inbox").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await atualizarStatusInboxUnidade(button.dataset.id, button.dataset.status);
        showToast("Status do inBox atualizado");
        await carregarInboxUnidadeMorador();
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar status do inBox", "error");
      }
    });
  });
}

async function abrirModalInboxUnidade(item = null) {
  const modal = document.getElementById("modalInboxUnidade");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal condominio-modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>${item ? "Editar pessoa do InBox" : "Nova pessoa do InBox"}</h3>
          <p>Cadastre pessoas de confianca para check-in mais livre na portaria, com bloqueio rastreavel quando necessario.</p>
        </div>
        <button type="button" class="modal-close" id="closeInboxModal">&times;</button>
      </div>
      <form id="formInboxUnidade">
        <div class="modal-section">
          <div class="modal-section-title">Identificacao recorrente</div>
          <div class="form-grid two-columns">
            <label>Nome completo
              <input type="text" name="nome_completo" value="${item?.nome_completo || ""}" required />
            </label>
            <label>Documento
              <input type="text" name="documento" value="${item?.documento || ""}" />
            </label>
            <label>Telefone
              <input type="text" name="telefone" value="${item?.telefone || ""}" />
            </label>
            <label>Relacao
              <input type="text" name="parentesco_relacao" value="${item?.parentesco_relacao || ""}" placeholder="Ex.: Primo, amiga, tio, padrinho" />
            </label>
            <label>Foto URL
              <input type="text" name="foto_identificacao_url" value="${item?.foto_identificacao_url || ""}" />
            </label>
            <label class="full-width">Observacoes
              <textarea name="observacoes" rows="3">${item?.observacoes || ""}</textarea>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelInboxModal">Cancelar</button>
          <button type="submit" class="btn-confirm">${item ? "Salvar alteracoes" : "Adicionar ao inBox"}</button>
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

  document.getElementById("closeInboxModal")?.addEventListener("click", close);
  document.getElementById("cancelInboxModal")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.getElementById("formInboxUnidade")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (item?.id) {
        await atualizarInboxUnidade(item.id, payload);
        showToast("Pessoa do inBox atualizada");
      } else {
        await criarInboxUnidade(payload);
        showToast("Pessoa adicionada ao inBox");
      }
      close();
      await carregarInboxUnidadeMorador();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao salvar pessoa do inBox", "error");
    }
  });
}

function formatarPapelResidente(papel) {
  if (papel === "titular") return "Titular";
  if (papel === "proprietario") return "Proprietario";
  return "Dependente";
}

function buildResidenteStatusBadge(status) {
  return `<span class="status-badge status-${status === "ativo" ? "ativo" : "inativo"}">${status || "-"}</span>`;
}

function buildResidenteInviteBadge(status) {
  const normalized = (status || "").toLowerCase();
  const label =
    normalized === "aceito"
      ? "Ativado"
      : normalized === "pendente"
        ? "Pendente"
        : normalized === "expirado"
          ? "Expirado"
          : normalized === "cancelado"
            ? "Cancelado"
            : "Sem convite";

  return `<span class="funcionario-chip funcionario-chip-convite">${label}</span>`;
}

function renderResidenteAvatar(item) {
  if (item.foto_perfil_url) {
    return `<img src="${item.foto_perfil_url}" alt="${item.nome_completo}" class="residente-avatar" />`;
  }

  const initial = (item.nome_completo || "?").trim().charAt(0).toUpperCase();
  return `<span class="residente-avatar residente-avatar-fallback">${initial || "?"}</span>`;
}

async function renderResidentesUnidade(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Residentes da Unidade</h2>
        <div class="page-subtitle">Cadastre dependentes e proprietarios vinculados a sua unidade, com foto e identificacao para o futuro card digital.</div>
      </div>
      <button id="btnNovoResidenteUnidade" class="btn-primary-soft">+ Novo Residente</button>
    </div>

    <div id="residentesResumo" class="panel residente-context-panel">
      <div class="moradores-loading">Carregando contexto da unidade...</div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="residentesUnidadeTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Residente</th>
            <th>Contato</th>
            <th>Vinculo</th>
            <th>Status</th>
            <th>Convite</th>
            <th>Card</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="7">Carregando residentes...</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalResidenteUnidade" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovoResidenteUnidade")?.addEventListener("click", () => abrirModalResidenteUnidade());
  await carregarResidentesUnidade();
}

async function carregarResidentesUnidade() {
  const tbody = document.querySelector("#residentesUnidadeTable tbody");
  const resumo = document.getElementById("residentesResumo");
  if (!tbody || !resumo) return;

  tbody.innerHTML = `<tr><td colspan="7">Carregando residentes...</td></tr>`;

  try {
    const resultado = await buscarResidentesDaUnidade();
    const unidade = resultado?.unidade || {};
    const residentes = Array.isArray(resultado?.residentes) ? resultado.residentes : [];

    const ativos = residentes.filter((item) => item.usuario_status === "ativo").length;
    const dependentes = residentes.filter((item) => item.papel === "dependente").length;
    const comFoto = residentes.filter((item) => item.foto_perfil_url).length;

    resumo.innerHTML = `
      <div class="residente-context-grid">
        <div class="overview-card">
          <span class="overview-label">UNIDADE</span>
          <strong>${unidade.identificacao || "-"}</strong>
          <small>${unidade.condominio_nome || "-"}${unidade.torre_nome ? ` - ${unidade.torre_nome}` : ""}</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">RESIDENTES</span>
          <strong>${residentes.length}</strong>
          <small>${ativos} ativo(s) e ${dependentes} dependente(s) vinculados.</small>
        </div>
        <div class="overview-card">
          <span class="overview-label">CARD DIGITAL</span>
          <strong>${comFoto}</strong>
          <small>${comFoto === 1 ? "1 foto pronta para identificacao" : `${comFoto} fotos prontas para identificacao`}</small>
        </div>
      </div>
    `;

    if (!residentes.length) {
      tbody.innerHTML = `<tr><td colspan="7">Nenhum residente vinculado ainda. O titular pode agregar moradores da propria unidade por aqui.</td></tr>`;
      return;
    }

    tbody.innerHTML = residentes
      .map((item) => `
        <tr>
          <td>
            <div class="residente-name-cell">
              ${renderResidenteAvatar(item)}
              <div class="funcionario-name-cell">
                <strong>${item.nome_completo || "-"}</strong>
                <small>${item.documento_identificacao || "Sem documento informado"}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="funcionario-contact-cell">
              <span>${item.email || "-"}</span>
              <small>${item.phone_whatsapp || "Sem telefone"}</small>
            </div>
          </td>
          <td><span class="funcionario-chip funcionario-chip-area">${formatarPapelResidente(item.papel)}</span></td>
          <td>${buildResidenteStatusBadge(item.usuario_status)}</td>
          <td>${buildResidenteInviteBadge(item.convite_status)}</td>
          <td><span class="funcionario-chip funcionario-chip-matricula">${item.foto_perfil_url ? "Pronto" : "Pendente"}</span></td>
          <td>
            <div class="portaria-acoes-inline">
              ${item.papel !== "titular" ? `<button type="button" class="btn-primary-soft btn-reenviar-convite-residente" data-id="${item.id}">Reenviar convite</button>` : `<span class="morador-area-inline-note">Titular</span>`}
            </div>
          </td>
        </tr>
      `)
      .join("");

    tbody.querySelectorAll(".btn-reenviar-convite-residente").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const resultadoReenvio = await reenviarConviteResidente(button.dataset.id);
          showToast("Convite reenviado com sucesso");
          await carregarResidentesUnidade();

          if (resultadoReenvio?.convite?.link_ativacao_temporario) {
            navigator.clipboard?.writeText(resultadoReenvio.convite.link_ativacao_temporario).catch(() => {});
          }
        } catch (error) {
          console.error(error);
          showToast(error.message || "Erro ao reenviar convite", "error");
        }
      });
    });
  } catch (error) {
    console.error(error);
    resumo.innerHTML = `<div class="moradores-empty">Nao foi possivel carregar o contexto da unidade.</div>`;
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar residentes.</td></tr>`;
    showToast(error.message || "Erro ao carregar residentes", "error");
  }
}

async function abrirModalResidenteUnidade() {
  const modal = document.getElementById("modalResidenteUnidade");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal condominio-modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Novo Residente</h3>
          <p>Cadastre um morador agregado da sua unidade e deixe a base pronta para convite e card digital.</p>
        </div>
        <button type="button" class="modal-close" id="closeResidenteModal">&times;</button>
      </div>
      <form id="formResidenteUnidade" novalidate>
        <div class="modal-section">
          <div class="modal-section-title">Identificacao</div>
          <div class="form-grid two-columns">
            <label>Nome completo
              <input type="text" name="nome_completo" required />
            </label>
            <label>Email
              <input type="email" name="email" required />
            </label>
            <label>Telefone / WhatsApp
              <input type="text" name="phone_whatsapp" />
            </label>
            <label>Documento
              <input type="text" name="documento_identificacao" placeholder="CPF, RG ou outro documento" />
            </label>
            <label>Vinculo
              <select name="papel" required>
                <option value="dependente">Dependente</option>
                <option value="proprietario">Proprietario</option>
              </select>
            </label>
            <label>Foto para identificacao
              <input type="file" id="residenteFotoPerfil" accept="image/*" capture="environment" />
            </label>
          </div>
          <div class="residente-photo-helper">Uma foto ajuda a deixar o futuro card digital pronto e melhora a identificacao visual.</div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelResidenteModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Criar residente</button>
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

  document.getElementById("closeResidenteModal")?.addEventListener("click", close);
  document.getElementById("cancelResidenteModal")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.getElementById("formResidenteUnidade")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Criando...";
    }

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const fotoInput = document.getElementById("residenteFotoPerfil");
      if (fotoInput instanceof HTMLInputElement && fotoInput.files?.length) {
        const [foto] = await lerArquivosComoDataUrl(fotoInput.files);
        if (foto) {
          payload.foto_perfil = foto;
        }
      }

      const resultado = await criarResidenteDaUnidade(payload);
      showToast("Residente criado com sucesso");
      close();
      await carregarResidentesUnidade();

      if (resultado?.convite?.link_ativacao_temporario) {
        navigator.clipboard?.writeText(resultado.convite.link_ativacao_temporario).catch(() => {});
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao criar residente", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Criar residente";
      }
    }
  });
}

async function renderColaboradoresUnidadeAdmin(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Colaboradores da Unidade</h2>
        <div class="page-subtitle">Cadastre diaristas, babas, cuidadores, motoristas e outros colaboradores recorrentes.</div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <div class="moradores-toolbar funcionarios-toolbar">
        <div class="filters-grid compact">
          <label>Condominio
            <select id="colabCondominioFilter"></select>
          </label>
          <label>Unidade
            <select id="colabUnidadeFilter">
              <option value="">Todas</option>
            </select>
          </label>
          <label>Funcao
            <select id="colabFuncaoFilter">
              <option value="">Todas</option>
              <option value="secretaria_lar">Secretaria do lar</option>
              <option value="diarista">Diarista</option>
              <option value="baba">Baba</option>
              <option value="cuidador">Cuidador</option>
              <option value="motorista">Motorista</option>
              <option value="jardineiro">Jardineiro</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label>Status
            <select id="colabStatusFilter">
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>
        </div>
        <div class="areas-toolbar-actions">
          <button id="btnLoadColaboradores" class="btn-primary-soft">Carregar Colaboradores</button>
          <button id="btnNewColaborador" class="btn-primary-soft">+ Novo Colaborador</button>
        </div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="colaboradoresTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Funcao</th>
            <th>Unidade</th>
            <th>Status</th>
            <th>Permissao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="7">Selecione um condominio para carregar os colaboradores.</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalColaboradorUnidade" class="modal-overlay hidden"></div>
  `;

  await carregarCondominiosParaColaboradores();
  document.getElementById("btnLoadColaboradores")?.addEventListener("click", carregarColaboradoresUnidadeAdmin);
  document.getElementById("btnNewColaborador")?.addEventListener("click", () => abrirModalColaboradorUnidade());
  document.getElementById("colabCondominioFilter")?.addEventListener("change", async () => {
    await carregarUnidadesFiltroColaboradores();
    await carregarColaboradoresUnidadeAdmin();
  });
  document.getElementById("colabUnidadeFilter")?.addEventListener("change", carregarColaboradoresUnidadeAdmin);
  document.getElementById("colabFuncaoFilter")?.addEventListener("change", carregarColaboradoresUnidadeAdmin);
  document.getElementById("colabStatusFilter")?.addEventListener("change", carregarColaboradoresUnidadeAdmin);
}

async function renderColaboradoresUnidadeMorador(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Colaboradores da Unidade</h2>
        <div class="page-subtitle">Organize os colaboradores recorrentes da sua unidade sem perder historico operacional.</div>
      </div>
      <button id="btnNewColaboradorMorador" class="btn-primary-soft">+ Novo Colaborador</button>
    </div>

    <div class="panel funcionarios-panel">
      <table id="colaboradoresMoradorTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Funcao</th>
            <th>Status</th>
            <th>Permissao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6">Carregando colaboradores...</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalColaboradorUnidade" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNewColaboradorMorador")?.addEventListener("click", () => abrirModalColaboradorUnidade());
  await carregarColaboradoresUnidadeMorador();
}

async function carregarCondominiosParaColaboradores() {
  const select = document.getElementById("colabCondominioFilter");
  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();
    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      return;
    }

    select.innerHTML = `<option value="">Selecione um condominio</option>${condominios
      .map((c) => `<option value="${c.id}">${c.nome_fantasia}</option>`)
      .join("")}`;
    select.value = condominios[0].id;
    await carregarUnidadesFiltroColaboradores();
    await carregarColaboradoresUnidadeAdmin();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
  }
}

async function carregarUnidadesFiltroColaboradores() {
  const condominioId = document.getElementById("colabCondominioFilter")?.value || "";
  const unidadeSelect = document.getElementById("colabUnidadeFilter");
  if (!unidadeSelect) return;

  if (!condominioId) {
    unidadeSelect.innerHTML = `<option value="">Todas</option>`;
    return;
  }

  try {
    const unidades = await buscarUnidadesPorCondominio(condominioId);
    unidadeSelect.innerHTML = `<option value="">Todas</option>${unidades
      .map((u) => `<option value="${u.id}">${u.identificacao}</option>`)
      .join("")}`;
  } catch (error) {
    console.error(error);
    unidadeSelect.innerHTML = `<option value="">Erro ao carregar unidades</option>`;
  }
}

async function carregarColaboradoresUnidadeAdmin() {
  const tbody = document.querySelector("#colaboradoresTable tbody");
  const condominioId = document.getElementById("colabCondominioFilter")?.value || "";
  const unidadeId = document.getElementById("colabUnidadeFilter")?.value || "";
  const funcao = document.getElementById("colabFuncaoFilter")?.value || "";
  const status = document.getElementById("colabStatusFilter")?.value || "";
  if (!tbody) return;

  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="7">Selecione um condominio para carregar os colaboradores.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="7">Carregando colaboradores...</td></tr>`;

  try {
    const colaboradores = await buscarColaboradoresUnidade({ condominio_id: condominioId, unidade_id: unidadeId, funcao, status });
    preencherTabelaColaboradores(tbody, colaboradores, true);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar colaboradores.</td></tr>`;
    showToast(error.message || "Erro ao carregar colaboradores", "error");
  }
}

async function carregarColaboradoresUnidadeMorador() {
  const tbody = document.querySelector("#colaboradoresMoradorTable tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6">Carregando colaboradores...</td></tr>`;
  try {
    const colaboradores = await buscarColaboradoresUnidade();
    preencherTabelaColaboradores(tbody, colaboradores, false);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar colaboradores.</td></tr>`;
    showToast(error.message || "Erro ao carregar colaboradores", "error");
  }
}

function preencherTabelaColaboradores(tbody, colaboradores, isAdmin) {
  const colspan = isAdmin ? 7 : 6;
  if (!colaboradores.length) {
    tbody.innerHTML = `<tr><td colspan="${colspan}">Nenhum colaborador encontrado para os filtros atuais.</td></tr>`;
    return;
  }

  tbody.innerHTML = colaboradores.map((colaborador) => `
    <tr>
      <td>
        <div class="funcionario-name-cell">
          <strong>${colaborador.nome_completo || "-"}</strong>
          <small>${isAdmin ? `${colaborador.condominio_nome || "-"} - Unidade ${colaborador.unidade_identificacao || "-"}` : (colaborador.documento || "Sem documento")}</small>
        </div>
      </td>
      <td>
        <div class="funcionario-contact-cell">
          <span>${colaborador.telefone || "-"}</span>
          <small>${colaborador.empresa || colaborador.cadastrado_por_nome || "-"}</small>
        </div>
      </td>
      <td><span class="funcionario-chip funcionario-chip-area">${formatarFuncaoColaborador(colaborador.funcao)}</span></td>
      ${isAdmin ? `<td><span class="funcionario-chip funcionario-chip-matricula">${colaborador.unidade_identificacao || "-"}</span></td>` : ''}
      <td><span class="status-badge status-${colaborador.status === "ativo" ? "ativo" : "inativo"}">${colaborador.status || "-"}</span></td>
      <td><span class="funcionario-chip funcionario-chip-convite">${Number(colaborador.pode_autorizar_terceiros) === 1 ? "Pode autorizar" : "Sem delegacao"}</span></td>
      <td>
        <div class="portaria-acoes-inline">
          <button type="button" class="btn-primary-soft btn-edit-colaborador" data-id="${colaborador.id}">Editar</button>
          <button type="button" class="btn-primary-soft btn-status-colaborador" data-id="${colaborador.id}" data-status="${proximoStatusColaborador(colaborador.status)}">${rotuloAcaoStatusColaborador(colaborador.status)}</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".btn-edit-colaborador").forEach((button) => {
    button.addEventListener("click", () => {
      const colaborador = colaboradores.find((item) => item.id === button.dataset.id);
      if (colaborador) abrirModalColaboradorUnidade(colaborador);
    });
  });

  tbody.querySelectorAll(".btn-status-colaborador").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await atualizarStatusColaboradorUnidade(button.dataset.id, button.dataset.status);
        showToast("Status do colaborador atualizado");
        if (isAdmin) {
          await carregarColaboradoresUnidadeAdmin();
        } else {
          await carregarColaboradoresUnidadeMorador();
        }
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar status do colaborador", "error");
      }
    });
  });
}

function proximoStatusColaborador(status) {
  if (status === "ativo") return "inativo";
  if (status === "inativo") return "bloqueado";
  return "ativo";
}

function rotuloAcaoStatusColaborador(status) {
  if (status === "ativo") return "Inativar";
  if (status === "inativo") return "Bloquear";
  return "Reativar";
}

async function abrirModalColaboradorUnidade(colaborador = null) {
  const modal = document.getElementById("modalColaboradorUnidade");
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  if (!modal) return;

  let condominios = [];
  let unidades = [];
  if (user?.perfil === "admin") {
    try {
      condominios = await buscarCondominiosDoAdmin();
      if (colaborador?.condominio_id) {
        unidades = await buscarUnidadesPorCondominio(colaborador.condominio_id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  modal.innerHTML = `
    <div class="modal condominio-modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>${colaborador ? "Editar Colaborador" : "Novo Colaborador"}</h3>
          <p>Cadastre pessoas recorrentes vinculadas a unidade sem perder historico.</p>
        </div>
        <button type="button" class="modal-close" id="closeColaboradorModal">&times;</button>
      </div>
      <form id="formColaboradorUnidade">
        <div class="modal-section">
          <div class="modal-section-title">Identificacao</div>
          <div class="form-grid two-columns">
            ${user?.perfil === "admin" ? `
              <label>Condominio
                <select name="condominio_id" id="colaboradorCondominioModal" ${colaborador ? "disabled" : "required"}>
                  <option value="">Selecione</option>
                  ${condominios.map((c) => `<option value="${c.id}" ${colaborador?.condominio_id === c.id ? "selected" : ""}>${c.nome_fantasia}</option>`).join("")}
                </select>
              </label>
              <label>Unidade
                <select name="unidade_id" id="colaboradorUnidadeModal" ${colaborador ? "disabled" : "required"}>
                  <option value="">Selecione</option>
                  ${unidades.map((u) => `<option value="${u.id}" ${colaborador?.unidade_id === u.id ? "selected" : ""}>${u.identificacao}</option>`).join("")}
                </select>
              </label>
            ` : ''}
            <label>Nome completo
              <input type="text" name="nome_completo" value="${colaborador?.nome_completo || ""}" required />
            </label>
            <label>Funcao
              <select name="funcao" required>
                ${Object.entries(FUNCAO_COLABORADOR_LABELS).map(([value, label]) => `<option value="${value}" ${colaborador?.funcao === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>Documento
              <input type="text" name="documento" value="${colaborador?.documento || ""}" />
            </label>
            <label>Telefone
              <input type="text" name="telefone" value="${colaborador?.telefone || ""}" />
            </label>
            <label>Empresa
              <input type="text" name="empresa" value="${colaborador?.empresa || ""}" />
            </label>
            <label>Foto URL
              <input type="text" name="foto_identificacao_url" value="${colaborador?.foto_identificacao_url || ""}" />
            </label>
            <label class="full-width">Observacoes
              <textarea name="observacoes" rows="3">${colaborador?.observacoes || ""}</textarea>
            </label>
            <label class="full-width acesso-urgente-toggle-field">
              <span>Pode autorizar terceiros</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="pode_autorizar_terceiros" ${Number(colaborador?.pode_autorizar_terceiros) === 1 ? "checked" : ""} />
                <small>Nasce desligado por padrao e deve ser usado com criterio operacional.</small>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelColaboradorModal">Cancelar</button>
          <button type="submit" class="btn-confirm">${colaborador ? "Salvar alteracoes" : "Criar colaborador"}</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("closeColaboradorModal")?.addEventListener("click", closeModal);
  document.getElementById("cancelColaboradorModal")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  const condominioModal = document.getElementById("colaboradorCondominioModal");
  const unidadeModal = document.getElementById("colaboradorUnidadeModal");
  if (condominioModal && unidadeModal && !colaborador) {
    condominioModal.addEventListener("change", async () => {
      unidadeModal.innerHTML = `<option value="">Carregando unidades...</option>`;
      try {
        const lista = await buscarUnidadesPorCondominio(condominioModal.value);
        unidadeModal.innerHTML = `<option value="">Selecione</option>${lista.map((u) => `<option value="${u.id}">${u.identificacao}</option>`).join("")}`;
      } catch (error) {
        console.error(error);
        unidadeModal.innerHTML = `<option value="">Erro ao carregar unidades</option>`;
      }
    });
  }

  document.getElementById("formColaboradorUnidade")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      if (colaborador) {
        await atualizarColaboradorUnidade(colaborador.id, payload);
        showToast("Colaborador atualizado com sucesso");
      } else {
        await criarColaboradorUnidade(payload);
        showToast("Colaborador criado com sucesso");
      }
      closeModal();
      if (user?.perfil === "admin") {
        await carregarColaboradoresUnidadeAdmin();
      } else {
        await carregarColaboradoresUnidadeMorador();
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao salvar colaborador", "error");
    }
  });
}

const CATEGORIA_PRESTADOR_LABELS = {
  energia_eletrica: "Energia eletrica",
  agua_hidraulica: "Agua / hidraulica",
  construcao_civil: "Construcao civil",
  internet_tv_rede: "Internet / TV / rede",
  saude: "Saude",
  personal: "Personal",
  setor_comercial: "Setor comercial",
  automotivo: "Automotivo",
  limpeza: "Limpeza",
  manutencao_geral: "Manutencao geral",
  entrega_tecnica: "Entrega tecnica",
  outro: "Outro",
};

function formatarCategoriaPrestador(categoria) {
  return CATEGORIA_PRESTADOR_LABELS[categoria] || "Outro";
}

async function buscarPrestadoresServico(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/prestadores-servico${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar os prestadores");
  }

  return Array.isArray(data.prestadores) ? data.prestadores : [];
}

async function buscarContatosPrestadores(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/prestadores-servico/contatos${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar os contatos de prestadores");
  }

  return Array.isArray(data.prestadores) ? data.prestadores : [];
}

async function buscarSugestoesPrestadoresServico(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(
    `http://localhost:3000/prestadores-servico/sugestoes${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel sugerir prestadores");
  }

  return Array.isArray(data.prestadores) ? data.prestadores : [];
}

async function criarPrestadorServico(payload) {
  const response = await fetch("http://localhost:3000/prestadores-servico", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel criar o prestador");
  }

  return data;
}

async function atualizarPrestadorServico(id, payload) {
  const response = await fetch(`http://localhost:3000/prestadores-servico/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o prestador");
  }

  return data;
}

async function atualizarStatusPrestadorServico(id, status) {
  const response = await fetch(`http://localhost:3000/prestadores-servico/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o status do prestador");
  }

  return data;
}

async function buscarHistoricoPrestadorServico(id) {
  const response = await fetch(`http://localhost:3000/prestadores-servico/${id}/historico`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar o historico do prestador");
  }

  return data;
}

function renderPrestadoresServico(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  if (user?.perfil === "morador") {
    return renderPrestadoresServicoMorador(container);
  }

  return renderPrestadoresServicoAdmin(container);
}

async function renderPrestadoresServicoAdmin(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Prestadores de Servico</h2>
        <div class="page-subtitle">Cadastre prestadores recorrentes e mantenha a lista utilitaria do condominio sempre pronta.</div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <div class="moradores-toolbar funcionarios-toolbar">
        <div class="filters-grid compact">
          <label>Condominio
            <select id="prestadorCondominioFilter"></select>
          </label>
          <label>Categoria
            <select id="prestadorCategoriaFilter">
              <option value="">Todas</option>
              ${Object.entries(CATEGORIA_PRESTADOR_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
          </label>
          <label>Status
            <select id="prestadorStatusFilter">
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>
          <label>Contato utilitario
            <select id="prestadorContatoFilter">
              <option value="">Todos</option>
              <option value="1">Somente utilitarios</option>
              <option value="0">Nao utilitarios</option>
            </select>
          </label>
          <label>Busca
            <input type="text" id="prestadorBuscaFilter" placeholder="Nome, empresa, documento, placa..." />
          </label>
        </div>
        <div class="areas-toolbar-actions">
          <button id="btnLoadPrestadores" class="btn-primary-soft">Carregar Prestadores</button>
          <button id="btnNewPrestador" class="btn-primary-soft">+ Novo Prestador</button>
        </div>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="prestadoresTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Prestador</th>
            <th>Contato</th>
            <th>Categoria</th>
            <th>Veiculo</th>
            <th>Status</th>
            <th>Utilitario</th>
            <th>Acessos</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="8">Selecione um condominio para carregar os prestadores.</td></tr>
        </tbody>
      </table>
    </div>
    <div id="modalPrestadorServico" class="modal-overlay hidden"></div>
  `;

  await carregarCondominiosParaPrestadores();
  document.getElementById("btnLoadPrestadores")?.addEventListener("click", carregarPrestadoresServicoAdmin);
  document.getElementById("btnNewPrestador")?.addEventListener("click", () => abrirModalPrestadorServico());
  document.getElementById("prestadorCondominioFilter")?.addEventListener("change", carregarPrestadoresServicoAdmin);
  document.getElementById("prestadorCategoriaFilter")?.addEventListener("change", carregarPrestadoresServicoAdmin);
  document.getElementById("prestadorStatusFilter")?.addEventListener("change", carregarPrestadoresServicoAdmin);
  document.getElementById("prestadorContatoFilter")?.addEventListener("change", carregarPrestadoresServicoAdmin);
  document.getElementById("prestadorBuscaFilter")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      carregarPrestadoresServicoAdmin();
    }
  });
}

async function renderPrestadoresServicoMorador(container) {
  container.innerHTML = `
    <div class="page-header funcionarios-page-header">
      <div class="page-heading-group">
        <h2>Contatos e Prestadores</h2>
        <div class="page-subtitle">Consulte contatos uteis do condominio e prestadores recorrentes ativos.</div>
      </div>
    </div>

    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Categoria
          <select id="prestadorMoradorCategoriaFilter">
            <option value="">Todas</option>
            ${Object.entries(CATEGORIA_PRESTADOR_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
        <label>Plantao
          <select id="prestadorMoradorPlantaoFilter">
            <option value="">Todos</option>
            <option value="1">24h</option>
          </select>
        </label>
        <label>Busca
          <input type="text" id="prestadorMoradorBuscaFilter" placeholder="Nome, empresa, telefone..." />
        </label>
      </div>
    </div>

    <div class="panel funcionarios-panel">
      <table id="prestadoresMoradorTable" class="funcionarios-table">
        <thead>
          <tr>
            <th>Prestador</th>
            <th>Contato</th>
            <th>Categoria</th>
            <th>Plantao</th>
            <th>Observacoes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="5">Carregando contatos...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("prestadorMoradorCategoriaFilter")?.addEventListener("change", carregarPrestadoresServicoMorador);
  document.getElementById("prestadorMoradorPlantaoFilter")?.addEventListener("change", carregarPrestadoresServicoMorador);
  document.getElementById("prestadorMoradorBuscaFilter")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      carregarPrestadoresServicoMorador();
    }
  });

  await carregarPrestadoresServicoMorador();
}

async function carregarCondominiosParaPrestadores() {
  const select = document.getElementById("prestadorCondominioFilter");
  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();
    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      return;
    }

    select.innerHTML = `<option value="">Selecione um condominio</option>${condominios
      .map((c) => `<option value="${c.id}">${c.nome_fantasia}</option>`)
      .join("")}`;
    select.value = condominios[0].id;
    await carregarPrestadoresServicoAdmin();
  } catch (error) {
    console.error(error);
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    select.disabled = true;
  }
}

async function carregarPrestadoresServicoAdmin() {
  const tbody = document.querySelector("#prestadoresTable tbody");
  const condominioId = document.getElementById("prestadorCondominioFilter")?.value || "";
  if (!tbody) return;

  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="8">Selecione um condominio para carregar os prestadores.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8">Carregando prestadores...</td></tr>`;

  try {
    const prestadores = await buscarPrestadoresServico({
      condominio_id: condominioId,
      categoria_servico: document.getElementById("prestadorCategoriaFilter")?.value || "",
      status: document.getElementById("prestadorStatusFilter")?.value || "",
      contato_utilitario: document.getElementById("prestadorContatoFilter")?.value || "",
      busca: document.getElementById("prestadorBuscaFilter")?.value || "",
    });

    preencherTabelaPrestadoresAdmin(tbody, prestadores);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar prestadores.</td></tr>`;
    showToast(error.message || "Erro ao carregar prestadores", "error");
  }
}

function preencherTabelaPrestadoresAdmin(tbody, prestadores) {
  if (!prestadores.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum prestador encontrado para os filtros atuais.</td></tr>`;
    return;
  }

  tbody.innerHTML = prestadores.map((prestador) => `
    <tr>
      <td>
        <div class="funcionario-name-cell">
          <strong>${prestador.nome_prestador || "-"}</strong>
          <small>${prestador.empresa || prestador.responsavel_nome || prestador.condominio_nome || "-"}</small>
        </div>
      </td>
      <td>
        <div class="funcionario-contact-cell">
          <span>${prestador.telefone || prestador.whatsapp || "-"}</span>
          <small>${prestador.email || prestador.documento || "-"}</small>
        </div>
      </td>
      <td><span class="funcionario-chip funcionario-chip-area">${formatarCategoriaPrestador(prestador.categoria_servico)}</span></td>
      <td>
        <div class="funcionario-contact-cell">
          <span>${prestador.placa || "-"}</span>
          <small>${prestador.veiculo_descricao || "-"}</small>
        </div>
      </td>
      <td><span class="status-badge status-${prestador.status === "ativo" ? "ativo" : "inativo"}">${prestador.status || "-"}</span></td>
      <td>
        <div class="prestador-flags">
          ${Number(prestador.contato_utilitario) === 1 ? '<span class="funcionario-chip funcionario-chip-convite">Contato util</span>' : '<span class="funcionario-chip funcionario-chip-matricula">Normal</span>'}
          ${Number(prestador.atende_24h) === 1 ? '<span class="funcionario-chip funcionario-chip-cargo">24h</span>' : ''}
        </div>
      </td>
      <td>
        <div class="funcionario-contact-cell">
          <span>${Number(prestador.total_acessos || 0)}</span>
          <small>${prestador.ultimo_acesso_referencia ? formatarDataHora(prestador.ultimo_acesso_referencia) : "Sem historico"}</small>
        </div>
      </td>
      <td>
        <div class="portaria-acoes-inline">
          <button type="button" class="btn-primary-soft btn-edit-prestador" data-id="${prestador.id}">Editar</button>
          <button type="button" class="btn-primary-soft btn-historico-prestador" data-id="${prestador.id}">Historico</button>
          <button type="button" class="btn-primary-soft btn-status-prestador" data-id="${prestador.id}" data-status="${proximoStatusPrestador(prestador.status)}">${rotuloAcaoStatusPrestador(prestador.status)}</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".btn-edit-prestador").forEach((button) => {
    button.addEventListener("click", () => {
      const prestador = prestadores.find((item) => item.id === button.dataset.id);
      if (prestador) abrirModalPrestadorServico(prestador);
    });
  });

  tbody.querySelectorAll(".btn-historico-prestador").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await abrirHistoricoPrestadorServico(button.dataset.id);
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao carregar historico do prestador", "error");
      }
    });
  });

  tbody.querySelectorAll(".btn-status-prestador").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await atualizarStatusPrestadorServico(button.dataset.id, button.dataset.status);
        showToast("Status do prestador atualizado");
        await carregarPrestadoresServicoAdmin();
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar status do prestador", "error");
      }
    });
  });
}

async function carregarPrestadoresServicoMorador() {
  const tbody = document.querySelector("#prestadoresMoradorTable tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5">Carregando contatos...</td></tr>`;
  try {
    const prestadores = await buscarContatosPrestadores({
      categoria_servico: document.getElementById("prestadorMoradorCategoriaFilter")?.value || "",
      atende_24h: document.getElementById("prestadorMoradorPlantaoFilter")?.value || "",
      busca: document.getElementById("prestadorMoradorBuscaFilter")?.value || "",
    });

    if (!prestadores.length) {
      tbody.innerHTML = `<tr><td colspan="5">Nenhum contato utilitario encontrado para os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = prestadores.map((prestador) => `
      <tr>
        <td data-label="Prestador">
          <div class="funcionario-name-cell">
            <strong>${prestador.nome_prestador || "-"}</strong>
            <small>${prestador.empresa || prestador.responsavel_nome || "-"}</small>
          </div>
        </td>
        <td data-label="Contato">
          <div class="funcionario-contact-cell">
            <span>${prestador.telefone || prestador.whatsapp || "-"}</span>
            <small>${prestador.email || prestador.telefone_secundario || "-"}</small>
          </div>
        </td>
        <td data-label="Categoria"><span class="funcionario-chip funcionario-chip-area">${formatarCategoriaPrestador(prestador.categoria_servico)}</span></td>
        <td data-label="Plantao">${Number(prestador.atende_24h) === 1 ? '<span class="funcionario-chip funcionario-chip-cargo">24h</span>' : '<span class="funcionario-chip funcionario-chip-matricula">Padrao</span>'}</td>
        <td data-label="Observacoes">${prestador.observacoes || "-"}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar contatos.</td></tr>`;
    showToast(error.message || "Erro ao carregar contatos utilitarios", "error");
  }
}

function proximoStatusPrestador(status) {
  if (status === "ativo") return "inativo";
  if (status === "inativo") return "bloqueado";
  return "ativo";
}

function rotuloAcaoStatusPrestador(status) {
  if (status === "ativo") return "Inativar";
  if (status === "inativo") return "Bloquear";
  return "Reativar";
}

async function abrirModalPrestadorServico(prestador = null) {
  const modal = document.getElementById("modalPrestadorServico");
  if (!modal) return;

  let condominios = [];
  try {
    condominios = await buscarCondominiosDoAdmin();
  } catch (error) {
    console.error(error);
  }

  modal.innerHTML = `
    <div class="modal condominio-modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>${prestador ? "Editar Prestador" : "Novo Prestador"}</h3>
          <p>Mantenha a base recorrente e a lista utilitaria do condominio sempre organizada.</p>
        </div>
        <button type="button" class="modal-close" id="closePrestadorModal">&times;</button>
      </div>
      <form id="formPrestadorServico">
        <div class="modal-section">
          <div class="modal-section-title">Identificacao</div>
          <div class="form-grid two-columns">
            <label>Condominio
              <select name="condominio_id" ${prestador ? "disabled" : "required"}>
                <option value="">Selecione</option>
                ${condominios.map((c) => `<option value="${c.id}" ${prestador?.condominio_id === c.id ? "selected" : ""}>${c.nome_fantasia}</option>`).join("")}
              </select>
            </label>
            <label>Categoria
              <select name="categoria_servico" required>
                ${Object.entries(CATEGORIA_PRESTADOR_LABELS).map(([value, label]) => `<option value="${value}" ${prestador?.categoria_servico === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>Nome do prestador
              <input type="text" name="nome_prestador" value="${prestador?.nome_prestador || ""}" required />
            </label>
            <label>Empresa
              <input type="text" name="empresa" value="${prestador?.empresa || ""}" />
            </label>
            <label>Documento
              <input type="text" name="documento" value="${prestador?.documento || ""}" />
            </label>
            <label>Responsavel
              <input type="text" name="responsavel_nome" value="${prestador?.responsavel_nome || ""}" />
            </label>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Contato e veiculo</div>
          <div class="form-grid two-columns">
            <label>Telefone
              <input type="text" name="telefone" value="${prestador?.telefone || ""}" />
            </label>
            <label>Telefone secundario
              <input type="text" name="telefone_secundario" value="${prestador?.telefone_secundario || ""}" />
            </label>
            <label>WhatsApp
              <input type="text" name="whatsapp" value="${prestador?.whatsapp || ""}" />
            </label>
            <label>Email
              <input type="text" name="email" value="${prestador?.email || ""}" />
            </label>
            <label>Placa
              <input type="text" name="placa" value="${prestador?.placa || ""}" />
            </label>
            <label>Descricao do veiculo
              <input type="text" name="veiculo_descricao" value="${prestador?.veiculo_descricao || ""}" />
            </label>
            <label class="full-width">Observacoes
              <textarea name="observacoes" rows="3">${prestador?.observacoes || ""}</textarea>
            </label>
            <label class="full-width acesso-urgente-toggle-field">
              <span>Contato utilitario</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="contato_utilitario" ${Number(prestador?.contato_utilitario) === 1 ? "checked" : ""} />
                <small>Inclui o prestador na lista rapida de contatos do condominio.</small>
              </div>
            </label>
            <label class="full-width acesso-urgente-toggle-field">
              <span>Atende 24h</span>
              <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                <input type="checkbox" name="atende_24h" ${Number(prestador?.atende_24h) === 1 ? "checked" : ""} />
                <small>Destaca contatos de plantao ou atendimento emergencial.</small>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelPrestadorModal">Cancelar</button>
          <button type="submit" class="btn-confirm">${prestador ? "Salvar alteracoes" : "Criar prestador"}</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.innerHTML = "";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("closePrestadorModal")?.addEventListener("click", closeModal);
  document.getElementById("cancelPrestadorModal")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.getElementById("formPrestadorServico")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    if (prestador) {
      payload.condominio_id = prestador.condominio_id;
    }

    try {
      if (prestador) {
        await atualizarPrestadorServico(prestador.id, payload);
        showToast("Prestador atualizado com sucesso");
      } else {
        await criarPrestadorServico(payload);
        showToast("Prestador criado com sucesso");
      }
      closeModal();
      await carregarPrestadoresServicoAdmin();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao salvar prestador", "error");
    }
  });
}

async function abrirHistoricoPrestadorServico(prestadorId) {
  const resultado = await buscarHistoricoPrestadorServico(prestadorId);
  const prestador = resultado?.prestador || {};
  const historico = Array.isArray(resultado?.historico) ? resultado.historico : [];

  const existing = document.getElementById("modalHistoricoPrestador");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalHistoricoPrestador";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Historico do Prestador</h3>
          <p>${prestador.nome_prestador || "-"} - ${formatarCategoriaPrestador(prestador.categoria_servico)}</p>
        </div>
        <button type="button" class="modal-close" id="closeHistoricoPrestador">&times;</button>
      </div>
      <div class="modal-section">
        <div class="reservas-overview-grid reservas-overview-grid-compact">
          <article class="reservas-overview-card"><span>ACESSOS</span><strong>${prestador.resumo?.total_acessos || 0}</strong><small>Total de registros ligados a este prestador</small></article>
          <article class="reservas-overview-card"><span>FINALIZADOS</span><strong>${prestador.resumo?.finalizados || 0}</strong><small>Atendimentos com saida registrada</small></article>
          <article class="reservas-overview-card"><span>NEGADOS</span><strong>${prestador.resumo?.negados || 0}</strong><small>Negacoes acumuladas</small></article>
          <article class="reservas-overview-card"><span>ABERTOS</span><strong>${prestador.resumo?.abertos || 0}</strong><small>Solicitacoes ainda em andamento</small></article>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Ultimos registros</div>
        <div class="portaria-sessoes-recentes-list acesso-historico-list">
          ${historico.length ? historico.map((item) => `
            <div class="portaria-sessao-log-item acesso-historico-item">
              <strong>${formatarDataHora(item.inicio_previsto || item.criado_em)}</strong>
              <span>${item.nome_visitante || "-"} - ${formatarTipoAcessoLabel(item.tipo_acesso)}</span>
              <small>${item.servico || item.empresa || formatarResumoDestinoAcesso(item) || "-"}</small>
              <small>Status: ${item.status || "-"} | Ultima acao: ${item.ultimo_evento_tipo || "-"} por ${item.ultimo_evento_por_nome || "-"}</small>
            </div>
          `).join("") : `<div class="portaria-sessao-log-item acesso-historico-item"><span>Sem historico operacional para este prestador.</span></div>`}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeHistoricoPrestadorFooter">Fechar</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  document.body.appendChild(overlay);
  overlay.querySelector("#closeHistoricoPrestador")?.addEventListener("click", close);
  overlay.querySelector("#closeHistoricoPrestadorFooter")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

const CATEGORIA_OCORRENCIA_LABELS = {
  eletrica: "Eletrica",
  hidraulica: "Hidraulica",
  limpeza: "Limpeza",
  seguranca: "Seguranca",
  elevador: "Elevador",
  area_comum: "Area comum",
  portaria: "Portaria",
  obra_manutencao: "Obra / manutencao",
  administrativo: "Administrativo",
  outro: "Outro",
};

const PRIORIDADE_OCORRENCIA_LABELS = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
};

const STATUS_OCORRENCIA_LABELS = {
  aberta: "Aberta",
  em_analise: "Em analise",
  em_atendimento: "Em atendimento",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

function formatarCategoriaOcorrencia(categoria) {
  return CATEGORIA_OCORRENCIA_LABELS[categoria] || "Outro";
}

function formatarPrioridadeOcorrencia(prioridade) {
  return PRIORIDADE_OCORRENCIA_LABELS[prioridade] || "Media";
}

function formatarStatusOcorrencia(status) {
  return STATUS_OCORRENCIA_LABELS[status] || status || "-";
}

function buildOcorrenciaStatusBadge(status) {
  const classe =
    status === "concluida" ? "status-ativo" :
    status === "cancelada" ? "status-inativo" :
    status === "em_atendimento" ? "status-pendente" :
    "status-ativo";

  return `<span class="status-badge ${classe}">${formatarStatusOcorrencia(status)}</span>`;
}

async function buscarOcorrencias(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  const response = await fetch(`http://localhost:3000/ocorrencias${queryString ? `?${queryString}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar as ocorrencias");
  }

  return Array.isArray(data.ocorrencias) ? data.ocorrencias : [];
}

async function criarOcorrencia(payload) {
  const response = await fetch("http://localhost:3000/ocorrencias", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel criar a ocorrencia");
  }

  return data;
}

function lerArquivosComoDataUrl(fileList) {
  const files = Array.from(fileList || []).slice(0, 3);
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          comprimirImagemParaOcorrencia(file)
            .then((dataUrl) =>
              resolve({
                nome_original: file.name,
                data_url: dataUrl,
              }),
            )
            .catch(reject);
        }),
    ),
  );
}

function comprimirImagemParaOcorrencia(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("Arquivo de imagem invalido"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1600;
        let { width, height } = image;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Nao foi possivel preparar a foto para envio"));
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        if (!dataUrl) {
          reject(new Error("Nao foi possivel compactar a foto selecionada"));
          return;
        }

        resolve(dataUrl);
      };
      image.onerror = () => reject(new Error("Nao foi possivel processar a foto selecionada"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto selecionada"));
    reader.readAsDataURL(file);
  });
}

async function atualizarStatusOcorrencia(id, payload) {
  const response = await fetch(`http://localhost:3000/ocorrencias/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar o status da ocorrencia");
  }

  return data;
}

async function atualizarResponsavelOcorrencia(id, payload) {
  const response = await fetch(`http://localhost:3000/ocorrencias/${id}/responsavel`, {
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

async function buscarHistoricoOcorrencia(id) {
  const response = await fetch(`http://localhost:3000/ocorrencias/${id}/historico`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel carregar o historico da ocorrencia");
  }

  return data;
}

function renderOcorrencias(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  if (user?.perfil === "morador") return renderOcorrenciasMorador(container);
  if (user?.perfil === "funcionario") return renderOcorrenciasFuncionario(container);
  return renderOcorrenciasAdmin(container);
}

function buildCategoriaOcorrenciaOptions() {
  return Object.entries(CATEGORIA_OCORRENCIA_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function buildPrioridadeOcorrenciaOptions() {
  return Object.entries(PRIORIDADE_OCORRENCIA_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

async function renderOcorrenciasMorador(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Ocorrencias</h2>
        <div class="page-subtitle">Abra e acompanhe demandas da sua unidade ou de area comum.</div>
      </div>
      <button id="btnNovaOcorrenciaMorador" class="btn-primary-soft">+ Nova ocorrencia</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Categoria
          <select id="ocorrenciaMoradorCategoria">
            <option value="">Todas</option>
            ${buildCategoriaOcorrenciaOptions()}
          </select>
        </label>
        <label>Status
          <select id="ocorrenciaMoradorStatus">
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_analise">Em analise</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
      </div>
    </div>
    <div class="panel funcionarios-panel">
      <table class="funcionarios-table" id="ocorrenciasMoradorTable">
        <thead>
          <tr>
            <th>Ocorrencia</th>
            <th>Categoria</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Abertura</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="6">Carregando ocorrencias...</td></tr></tbody>
      </table>
    </div>
    <div id="modalOcorrencia" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovaOcorrenciaMorador")?.addEventListener("click", () => abrirModalOcorrencia("morador"));
  document.getElementById("ocorrenciaMoradorCategoria")?.addEventListener("change", carregarOcorrenciasMorador);
  document.getElementById("ocorrenciaMoradorStatus")?.addEventListener("change", carregarOcorrenciasMorador);
  await carregarOcorrenciasMorador();
}

async function renderOcorrenciasFuncionario(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Ocorrencias operacionais</h2>
        <div class="page-subtitle">Acompanhe e mova o atendimento das demandas do seu condominio.</div>
      </div>
      <button id="btnNovaOcorrenciaFuncionario" class="btn-primary-soft">+ Nova ocorrencia</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Categoria
          <select id="ocorrenciaFuncionarioCategoria">
            <option value="">Todas</option>
            ${buildCategoriaOcorrenciaOptions()}
          </select>
        </label>
        <label>Status
          <select id="ocorrenciaFuncionarioStatus">
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_analise">Em analise</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label>Prioridade
          <select id="ocorrenciaFuncionarioPrioridade">
            <option value="">Todas</option>
            ${buildPrioridadeOcorrenciaOptions()}
          </select>
        </label>
      </div>
    </div>
    <div class="panel funcionarios-panel">
      <table class="funcionarios-table" id="ocorrenciasFuncionarioTable">
        <thead>
          <tr>
            <th>Ocorrencia</th>
            <th>Categoria</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Responsavel</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="6">Carregando ocorrencias...</td></tr></tbody>
      </table>
    </div>
    <div id="modalOcorrencia" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovaOcorrenciaFuncionario")?.addEventListener("click", () => abrirModalOcorrencia("funcionario"));
  document.getElementById("ocorrenciaFuncionarioCategoria")?.addEventListener("change", carregarOcorrenciasFuncionario);
  document.getElementById("ocorrenciaFuncionarioStatus")?.addEventListener("change", carregarOcorrenciasFuncionario);
  document.getElementById("ocorrenciaFuncionarioPrioridade")?.addEventListener("change", carregarOcorrenciasFuncionario);
  await carregarOcorrenciasFuncionario();
}

async function renderOcorrenciasAdmin(container) {
  container.innerHTML = `
    <div class="page-header acessos-page-header">
      <div class="page-heading-group">
        <h2>Ocorrencias e manutencao</h2>
        <div class="page-subtitle">Supervisione, atribua e acompanhe as demandas do condominio.</div>
      </div>
      <button id="btnNovaOcorrenciaAdmin" class="btn-primary-soft">+ Nova ocorrencia</button>
    </div>
    <div class="panel acessos-panel acessos-morador-panel">
      <div class="filters-grid compact">
        <label>Condominio
          <select id="ocorrenciaAdminCondominio"></select>
        </label>
        <label>Categoria
          <select id="ocorrenciaAdminCategoria">
            <option value="">Todas</option>
            ${buildCategoriaOcorrenciaOptions()}
          </select>
        </label>
        <label>Status
          <select id="ocorrenciaAdminStatus">
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_analise">Em analise</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label>Prioridade
          <select id="ocorrenciaAdminPrioridade">
            <option value="">Todas</option>
            ${buildPrioridadeOcorrenciaOptions()}
          </select>
        </label>
      </div>
    </div>
    <div class="panel funcionarios-panel">
      <table class="funcionarios-table" id="ocorrenciasAdminTable">
        <thead>
          <tr>
            <th>Ocorrencia</th>
            <th>Categoria</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Responsavel</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="6">Carregando ocorrencias...</td></tr></tbody>
      </table>
    </div>
    <div id="modalOcorrencia" class="modal-overlay hidden"></div>
  `;

  document.getElementById("btnNovaOcorrenciaAdmin")?.addEventListener("click", () => abrirModalOcorrencia("admin"));
  document.getElementById("ocorrenciaAdminCategoria")?.addEventListener("change", carregarOcorrenciasAdmin);
  document.getElementById("ocorrenciaAdminStatus")?.addEventListener("change", carregarOcorrenciasAdmin);
  document.getElementById("ocorrenciaAdminPrioridade")?.addEventListener("change", carregarOcorrenciasAdmin);

  const selectCondominio = document.getElementById("ocorrenciaAdminCondominio");
  try {
    const condominios = await buscarCondominiosDoAdmin();
    selectCondominio.innerHTML = `<option value="">Selecione um condominio</option>${condominios
      .map((item) => `<option value="${item.id}">${item.nome_fantasia}</option>`)
      .join("")}`;
    if (condominios.length) {
      selectCondominio.value = condominios[0].id;
      await carregarOcorrenciasAdmin();
    }
  } catch (error) {
    console.error(error);
    selectCondominio.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
  }

  selectCondominio?.addEventListener("change", carregarOcorrenciasAdmin);
}

async function carregarOcorrenciasMorador() {
  const tbody = document.querySelector("#ocorrenciasMoradorTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6">Carregando ocorrencias...</td></tr>`;

  try {
    const ocorrencias = await buscarOcorrencias({
      categoria: document.getElementById("ocorrenciaMoradorCategoria")?.value || "",
      status: document.getElementById("ocorrenciaMoradorStatus")?.value || "",
    });

    if (!ocorrencias.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma ocorrencia encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = ocorrencias.map((item) => `
      <tr>
        <td data-label="Ocorrencia"><div class="funcionario-name-cell"><strong>${item.titulo || "-"}</strong><small>${item.local_referencia || item.unidade_identificacao || "Contexto geral"}</small></div></td>
        <td data-label="Categoria"><span class="funcionario-chip funcionario-chip-area">${formatarCategoriaOcorrencia(item.categoria)}</span></td>
        <td data-label="Prioridade"><span class="funcionario-chip funcionario-chip-cargo">${formatarPrioridadeOcorrencia(item.prioridade)}</span></td>
        <td data-label="Status">${buildOcorrenciaStatusBadge(item.status)}</td>
        <td data-label="Abertura">${formatarDataHora(item.aberta_em)}</td>
        <td data-label="Acoes">
          <div class="portaria-acoes-inline">
            <button type="button" class="btn-primary-soft btn-historico-ocorrencia" data-id="${item.id}">Historico</button>
          </div>
        </td>
      </tr>
    `).join("");

    bindHistoricoOcorrenciaButtons(tbody);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar ocorrencias.</td></tr>`;
    showToast(error.message || "Erro ao carregar ocorrencias", "error");
  }
}

async function carregarOcorrenciasFuncionario() {
  const tbody = document.querySelector("#ocorrenciasFuncionarioTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6">Carregando ocorrencias...</td></tr>`;

  try {
    const ocorrencias = await buscarOcorrencias({
      categoria: document.getElementById("ocorrenciaFuncionarioCategoria")?.value || "",
      status: document.getElementById("ocorrenciaFuncionarioStatus")?.value || "",
      prioridade: document.getElementById("ocorrenciaFuncionarioPrioridade")?.value || "",
    });

    if (!ocorrencias.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma ocorrencia encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = ocorrencias.map((item) => `
      <tr>
        <td><div class="funcionario-name-cell"><strong>${item.titulo || "-"}</strong><small>${item.local_referencia || item.unidade_identificacao || "Contexto geral"}</small></div></td>
        <td><span class="funcionario-chip funcionario-chip-area">${formatarCategoriaOcorrencia(item.categoria)}</span></td>
        <td><span class="funcionario-chip funcionario-chip-cargo">${formatarPrioridadeOcorrencia(item.prioridade)}</span></td>
        <td>${buildOcorrenciaStatusBadge(item.status)}</td>
        <td>${item.responsavel_nome || "-"}</td>
        <td>
          <div class="portaria-acoes-inline">
            ${item.status === "aberta" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="em_analise">Analisar</button>` : ""}
            ${item.status !== "em_atendimento" && item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="em_atendimento">Atender</button>` : ""}
            ${item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="concluida">Concluir</button>` : ""}
            <button type="button" class="btn-primary-soft btn-gerar-ordem-servico" data-prefill="${buildOrdemServicoPrefillFromOcorrencia(item)}">Gerar ordem</button>
            <button type="button" class="btn-primary-soft btn-historico-ocorrencia" data-id="${item.id}">Historico</button>
          </div>
        </td>
      </tr>
    `).join("");

    bindHistoricoOcorrenciaButtons(tbody);
    bindStatusOcorrenciaButtons(tbody, carregarOcorrenciasFuncionario);
    bindGerarOrdemServicoButtons(tbody, "funcionario");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar ocorrencias.</td></tr>`;
    showToast(error.message || "Erro ao carregar ocorrencias", "error");
  }
}

async function carregarOcorrenciasAdmin() {
  const tbody = document.querySelector("#ocorrenciasAdminTable tbody");
  const condominioId = document.getElementById("ocorrenciaAdminCondominio")?.value || "";
  if (!tbody) return;
  if (!condominioId) {
    tbody.innerHTML = `<tr><td colspan="6">Selecione um condominio.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="6">Carregando ocorrencias...</td></tr>`;

  try {
    const [ocorrencias, funcionarios] = await Promise.all([
      buscarOcorrencias({
        condominio_id: condominioId,
        categoria: document.getElementById("ocorrenciaAdminCategoria")?.value || "",
        status: document.getElementById("ocorrenciaAdminStatus")?.value || "",
        prioridade: document.getElementById("ocorrenciaAdminPrioridade")?.value || "",
      }),
      buscarFuncionarios({ condominio_id: condominioId }).catch(() => []),
    ]);

    if (!ocorrencias.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma ocorrencia encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = ocorrencias.map((item) => `
      <tr>
        <td><div class="funcionario-name-cell"><strong>${item.titulo || "-"}</strong><small>${item.aberto_por_nome || "-"} - ${item.local_referencia || item.unidade_identificacao || "Contexto geral"}</small></div></td>
        <td><span class="funcionario-chip funcionario-chip-area">${formatarCategoriaOcorrencia(item.categoria)}</span></td>
        <td><span class="funcionario-chip funcionario-chip-cargo">${formatarPrioridadeOcorrencia(item.prioridade)}</span></td>
        <td>${buildOcorrenciaStatusBadge(item.status)}</td>
        <td>
          <select class="ocorrencia-responsavel-select" data-id="${item.id}">
            <option value="">Sem responsavel</option>
            ${funcionarios.map((f) => `<option value="${f.id}" ${item.funcionario_responsavel_id === f.id ? "selected" : ""}>${f.nome_completo} - ${formatarAreaAtuacao(f.area_atuacao)}</option>`).join("")}
          </select>
        </td>
        <td>
          <div class="portaria-acoes-inline">
            ${item.status === "aberta" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="em_analise">Triar</button>` : ""}
            ${item.status !== "em_atendimento" && item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="em_atendimento">Atender</button>` : ""}
            ${item.status !== "concluida" && item.status !== "cancelada" ? `<button type="button" class="btn-primary-soft btn-status-ocorrencia" data-id="${item.id}" data-status="concluida">Concluir</button>` : ""}
            <button type="button" class="btn-primary-soft btn-gerar-ordem-servico" data-prefill="${buildOrdemServicoPrefillFromOcorrencia(item)}">Gerar ordem</button>
            <button type="button" class="btn-primary-soft btn-historico-ocorrencia" data-id="${item.id}">Historico</button>
          </div>
        </td>
      </tr>
    `).join("");

    bindHistoricoOcorrenciaButtons(tbody);
    bindStatusOcorrenciaButtons(tbody, carregarOcorrenciasAdmin);
    bindGerarOrdemServicoButtons(tbody, "admin");
    tbody.querySelectorAll(".ocorrencia-responsavel-select").forEach((select) => {
      select.addEventListener("change", async () => {
        try {
          await atualizarResponsavelOcorrencia(select.dataset.id, { funcionario_responsavel_id: select.value });
          showToast("Responsavel atualizado");
          await carregarOcorrenciasAdmin();
        } catch (error) {
          console.error(error);
          showToast(error.message || "Erro ao atualizar responsavel", "error");
        }
      });
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar ocorrencias.</td></tr>`;
    showToast(error.message || "Erro ao carregar ocorrencias", "error");
  }
}

function bindStatusOcorrenciaButtons(scopeEl, refreshFn) {
  scopeEl.querySelectorAll(".btn-status-ocorrencia").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await atualizarStatusOcorrencia(button.dataset.id, { status: button.dataset.status });
        showToast("Status da ocorrencia atualizado");
        await refreshFn();
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar status da ocorrencia", "error");
      }
    });
  });
}

function bindHistoricoOcorrenciaButtons(scopeEl) {
  scopeEl.querySelectorAll(".btn-historico-ocorrencia").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await abrirHistoricoOcorrencia(button.dataset.id);
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao carregar historico da ocorrencia", "error");
      }
    });
  });
}

function buildOrdemServicoPrefillFromOcorrencia(item) {
  return encodeURIComponent(JSON.stringify({
    condominio_id: item.condominio_id || "",
    ocorrencia_id: item.id,
    tipo_origem: "derivada_ocorrencia",
    alvo_tipo: item.unidade_id ? "unidade" : "estrutura_geral",
    titulo: item.titulo || "",
    descricao_tecnica: item.descricao || "",
    local_referencia: item.local_referencia || "",
    prioridade: item.prioridade || "media",
    unidade_id: item.unidade_id || "",
  }));
}

function bindGerarOrdemServicoButtons(scopeEl, contexto) {
  scopeEl.querySelectorAll(".btn-gerar-ordem-servico").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const prefill = JSON.parse(decodeURIComponent(button.dataset.prefill || "%7B%7D"));
        if (typeof abrirModalManutencao !== "function") {
          throw new Error("Modulo de manutencao ainda nao esta carregado");
        }
        await abrirModalManutencao(contexto, prefill);
      } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao abrir ordem de servico", "error");
      }
    });
  });
}

async function abrirModalOcorrencia(contexto) {
  const modal = document.getElementById("modalOcorrencia");
  if (!modal) return;

  let condominios = [];
  let unidades = [];
  if (contexto === "admin") {
    try {
      condominios = await buscarCondominiosDoAdmin();
      if (condominios.length) unidades = await buscarUnidadesPorCondominio(condominios[0].id);
    } catch (error) {
      console.error(error);
    }
  }

  modal.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Nova ocorrencia</h3>
          <p>Registre uma demanda com contexto, categoria e prioridade.</p>
        </div>
        <button type="button" class="modal-close" id="closeOcorrenciaModal">&times;</button>
      </div>
      <form id="formOcorrencia" novalidate>
        <div class="modal-section">
          <div class="modal-section-title">Contexto</div>
          <div class="form-grid two-columns">
            ${contexto === "admin" ? `
              <label>Condominio
                <select name="condominio_id" id="ocorrenciaCondominioModal" required>
                  <option value="">Selecione</option>
                  ${condominios.map((item) => `<option value="${item.id}">${item.nome_fantasia}</option>`).join("")}
                </select>
              </label>
              <label>Unidade
                <select name="unidade_id" id="ocorrenciaUnidadeModal">
                  <option value="">Contexto geral</option>
                  ${unidades.map((item) => `<option value="${item.id}">${item.identificacao}</option>`).join("")}
                </select>
              </label>
            ` : `
              <label class="full-width acesso-urgente-toggle-field">
                <span>Sem unidade especifica</span>
                <div class="acesso-urgente-toggle-row acesso-urgente-inline-row">
                  <input type="checkbox" name="sem_unidade" />
                  <small>Use para area comum, corredor, portaria ou contexto geral do condominio.</small>
                </div>
              </label>
            `}
            <label>Categoria
              <select name="categoria" required>
                ${buildCategoriaOcorrenciaOptions()}
              </select>
            </label>
            <label>Prioridade
              <select name="prioridade">
                ${buildPrioridadeOcorrenciaOptions()}
              </select>
            </label>
            <label class="full-width">Titulo
              <input type="text" name="titulo" required />
            </label>
            <label class="full-width">Local de referencia
              <input type="text" name="local_referencia" placeholder="Ex.: Hall do 3o andar, unidade 104, portaria..." />
            </label>
            <label class="full-width">Descricao
              <textarea name="descricao" rows="4" required></textarea>
            </label>
            <label class="full-width">Fotos
              <input type="file" id="ocorrenciaFotosInput" accept="image/*" capture="environment" multiple />
              <small>Voce pode tirar a foto na hora ou anexar ate 3 imagens. O app compacta antes do envio.</small>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelOcorrenciaModal">Cancelar</button>
          <button type="submit" class="btn-confirm">Criar ocorrencia</button>
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

  document.getElementById("closeOcorrenciaModal")?.addEventListener("click", close);
  document.getElementById("cancelOcorrenciaModal")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  const condominioModal = document.getElementById("ocorrenciaCondominioModal");
  const unidadeModal = document.getElementById("ocorrenciaUnidadeModal");
  if (condominioModal && unidadeModal) {
    condominioModal.addEventListener("change", async () => {
      unidadeModal.innerHTML = `<option value="">Carregando unidades...</option>`;
      try {
        const lista = await buscarUnidadesPorCondominio(condominioModal.value);
        unidadeModal.innerHTML = `<option value="">Contexto geral</option>${lista.map((item) => `<option value="${item.id}">${item.identificacao}</option>`).join("")}`;
      } catch (error) {
        console.error(error);
        unidadeModal.innerHTML = `<option value="">Erro ao carregar unidades</option>`;
      }
    });
    if (condominios.length) condominioModal.value = condominios[0].id;
  }

  const formOcorrencia = document.getElementById("formOcorrencia");
  formOcorrencia?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) {
      showToast("Confira os campos obrigatorios da ocorrencia", "error");
      return;
    }

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const fotosInput = document.getElementById("ocorrenciaFotosInput");
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');

    try {
      if (contexto === "admin" && !payload.condominio_id) {
        throw new Error("Selecione o condominio da ocorrencia");
      }

      if (!payload.categoria || !payload.titulo || !payload.descricao) {
        throw new Error("Categoria, titulo e descricao sao obrigatorios");
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Registrando...";
      }

      if (fotosInput?.files?.length) {
        payload.anexos = await lerArquivosComoDataUrl(fotosInput.files);
      }
      await criarOcorrencia(payload);
      showToast("Ocorrencia criada com sucesso");
      close();
      if (contexto === "morador") await carregarOcorrenciasMorador();
      else if (contexto === "funcionario") await carregarOcorrenciasFuncionario();
      else await carregarOcorrenciasAdmin();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Erro ao criar ocorrencia", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Criar ocorrencia";
      }
    }
  });
}

async function abrirHistoricoOcorrencia(id) {
  const resultado = await buscarHistoricoOcorrencia(id);
  const ocorrencia = resultado?.ocorrencia || {};
  const eventos = Array.isArray(resultado?.eventos) ? resultado.eventos : [];
  const anexos = Array.isArray(resultado?.anexos) ? resultado.anexos : [];

  const existing = document.getElementById("modalHistoricoOcorrencia");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalHistoricoOcorrencia";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal funcionario-modal">
      <div class="modal-header">
        <div>
          <h3>Historico da ocorrencia</h3>
          <p>${ocorrencia.titulo || "-"} - ${formatarCategoriaOcorrencia(ocorrencia.categoria)}</p>
        </div>
        <button type="button" class="modal-close" id="closeHistoricoOcorrencia">&times;</button>
      </div>
      <div class="modal-section">
        <div class="form-grid two-columns">
          <label>Titulo
            <input type="text" value="${ocorrencia.titulo || ""}" disabled />
          </label>
          <label>Status
            <input type="text" value="${formatarStatusOcorrencia(ocorrencia.status)}" disabled />
          </label>
          <label>Prioridade
            <input type="text" value="${formatarPrioridadeOcorrencia(ocorrencia.prioridade)}" disabled />
          </label>
          <label>Responsavel
            <input type="text" value="${ocorrencia.responsavel_nome || "-"}" disabled />
          </label>
          <label class="full-width">Descricao
            <textarea rows="3" disabled>${ocorrencia.descricao || ""}</textarea>
          </label>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Trilha operacional</div>
        <div class="portaria-sessoes-recentes-list acesso-historico-list">
          ${eventos.length ? eventos.map((evento) => `
            <div class="portaria-sessao-log-item acesso-historico-item">
              <strong>${formatarDataHora(evento.criado_em)}</strong>
              <span>${evento.tipo_evento || "-"}${evento.status_resultante ? ` - ${formatarStatusOcorrencia(evento.status_resultante)}` : ""}</span>
              <small>${evento.usuario_nome || "-"}${evento.funcionario_nome ? ` • ${evento.funcionario_nome}` : ""}</small>
              <small>${evento.descricao_evento || "-"}</small>
            </div>
          `).join("") : `<div class="portaria-sessao-log-item acesso-historico-item"><span>Sem eventos registrados.</span></div>`}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Fotos anexadas</div>
        <div class="ocorrencia-anexos-grid">
          ${anexos.length ? anexos.map((anexo) => `
            <a href="${anexo.caminho_relativo}" target="_blank" rel="noopener noreferrer" class="ocorrencia-anexo-card">
              <img src="${anexo.caminho_relativo}" alt="${anexo.nome_original || "Anexo"}" />
              <span>${anexo.nome_original || "Foto"}</span>
            </a>
          `).join("") : `<div class="portaria-sessao-log-item acesso-historico-item"><span>Sem fotos anexadas.</span></div>`}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" id="closeHistoricoOcorrenciaFooter">Fechar</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  document.body.appendChild(overlay);
  overlay.querySelector("#closeHistoricoOcorrencia")?.addEventListener("click", close);
  overlay.querySelector("#closeHistoricoOcorrenciaFooter")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}
















  const aplicarInboxVisitante = () => {
    const pessoa = inboxPessoas.find((item) => item.id === inboxSelect?.value);
    if (!pessoa) return;
    if (pessoa.status === "bloqueado") {
      showToast("Esta pessoa do inBox esta bloqueada e exige liberacao manual", "error");
      inboxSelect.value = "";
      return;
    }

    nomeInput.value = pessoa.nome_completo || "";
    documentoInput.value = pessoa.documento || "";
    if (pessoa.parentesco_relacao) {
      empresaInput.value = pessoa.parentesco_relacao;
    }
  if (tipoSelect.value !== "visitante") {
      tipoSelect.value = "visitante";
      toggleServico();
    }
  };

const mensagensState = {
  caixa: "entrada",
  tipo: "",
  condominioId: "",
  selectedId: null,
  items: [],
  destinatarios: [],
  contagens: {
    entrada: 0,
    enviadas: 0,
    respondidas: 0,
    arquivadas: 0,
  },
};

function escapeMensagemHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarMensagemTipo(tipo) {
  const mapa = {
    mensagem: "Mensagem",
    aviso: "Aviso",
    comunicado: "Comunicado",
    financeiro: "Financeiro",
    sistema: "Sistema",
  };
  return mapa[tipo] || "Mensagem";
}

function formatarMensagemCaixa(caixa) {
  const mapa = {
    entrada: "Entrada",
    enviadas: "Enviadas",
    respondidas: "Respondidas",
    arquivadas: "Arquivadas",
  };
  return mapa[caixa] || "Entrada";
}

function formatarMensagemPrioridade(prioridade) {
  const mapa = {
    baixa: "Baixa",
    media: "Media",
    alta: "Alta",
    urgente: "Urgente",
  };
  return mapa[prioridade] || "Media";
}

function formatarMensagemStatusDestinatario(status) {
  const mapa = {
    nao_lido: "Nao lida",
    lido: "Lida",
    acionado: "Respondida",
    resolvido: "Resolvida",
    arquivado: "Arquivada",
  };
  return mapa[status] || "Nao lida";
}

function parseMensagemMetadata(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function formatarGrupoDestinoMensagem(grupo) {
  const mapa = {
    administracao: "Administracao",
    portaria: "Portaria",
    administrativo: "Administrativo",
    manutencao: "Manutencao",
    funcionario: "Funcionario",
  };
  return mapa[grupo] || "Destino";
}

function buildMensagemBadge(tipo, valor) {
  if (!valor) return `<span class="mensagem-badge">${tipo}</span>`;
  return `<span class="mensagem-badge mensagem-badge-${tipo}-${valor}">${escapeMensagemHtml(valor)}</span>`;
}

function normalizarListaMensagens(payload) {
  if (Array.isArray(payload?.mensagens)) return payload.mensagens;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function buscarMensagensInbox(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });

  const response = await fetch(`http://localhost:3000/mensagens${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar as mensagens");
  }
  return normalizarListaMensagens(payload);
}

async function buscarDetalheMensagem(id) {
  const response = await fetch(`http://localhost:3000/mensagens/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar a mensagem");
  }
  return payload;
}

async function buscarDestinatariosMensagem(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });

  const response = await fetch(`http://localhost:3000/mensagens/destinatarios${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar os destinatarios");
  }

  return Array.isArray(payload?.destinatarios) ? payload.destinatarios : [];
}

async function buscarResumoMensagens(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });

  const response = await fetch(`http://localhost:3000/mensagens/resumo${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.erro || "Nao foi possivel carregar o resumo das mensagens");
  }

  return payload?.resumo || {};
}

async function criarMensagemInbox(payload) {
  const response = await fetch("http://localhost:3000/mensagens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel enviar a mensagem");
  }
  return data;
}

async function carregarContagensMensagens() {
  const resumo = await buscarResumoMensagens({
    condominio_id: mensagensState.condominioId,
  });

  mensagensState.contagens = {
    entrada: Number(resumo.entrada || 0),
    enviadas: Number(resumo.enviadas || 0),
    respondidas: Number(resumo.respondidas || 0),
    arquivadas: Number(resumo.arquivadas || 0),
  };
}

async function marcarMensagemComoLida(id) {
  const response = await fetch(`http://localhost:3000/mensagens/${encodeURIComponent(id)}/lida`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel marcar a mensagem como lida");
  }
  return data;
}

async function arquivarMensagemInbox(id) {
  const response = await fetch(`http://localhost:3000/mensagens/${encodeURIComponent(id)}/arquivar`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel arquivar a mensagem");
  }
  return data;
}

async function registrarAcaoMensagemInbox(id, statusDestinatario) {
  const response = await fetch(`http://localhost:3000/mensagens/${encodeURIComponent(id)}/acao`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ status_destinatario: statusDestinatario }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar a mensagem");
  }
  return data;
}

async function atualizarStatusReservaViaInbox(id, payload) {
  const response = await fetch(`http://localhost:3000/reservas/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar a reserva");
  }
  return data;
}

function renderMensagens(container) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  const titulo = user?.perfil === "admin"
    ? "Central de Mensagens"
    : user?.perfil === "funcionario"
      ? "Mensagens Operacionais"
      : "Minha Caixa de Mensagens";

  container.innerHTML = `
    <div class="page-header mensagens-page-header">
      <div>
        <h2>${titulo}</h2>
        <div class="page-subtitle">Uma caixa interna com cara de correio eletronico, pensada para entradas, enviadas, respostas e arquivamento.</div>
      </div>
      <div class="page-actions">
        <button type="button" id="btnNovaMensagem" class="btn-primary-soft">Nova mensagem</button>
      </div>
    </div>
    <div class="mensagens-layout">
      <aside class="panel mensagens-sidebar-panel">
        <div class="mensagens-sidebar-head">Caixas</div>
        <div class="mensagens-folder-list" id="mensagensFolders">
          <button type="button" class="mensagens-folder-chip active" data-caixa="entrada">Entrada <span class="mensagens-folder-count" data-count-for="entrada">0</span></button>
          <button type="button" class="mensagens-folder-chip" data-caixa="enviadas">Enviadas <span class="mensagens-folder-count" data-count-for="enviadas">0</span></button>
          <button type="button" class="mensagens-folder-chip" data-caixa="respondidas">Respondidas <span class="mensagens-folder-count" data-count-for="respondidas">0</span></button>
          <button type="button" class="mensagens-folder-chip" data-caixa="arquivadas">Arquivadas <span class="mensagens-folder-count" data-count-for="arquivadas">0</span></button>
        </div>
        <div class="mensagens-filter-stack">
          ${user?.perfil === "admin" ? `
            <label>
              Condominio
              <select id="mensagemCondominioFilter">
                <option value="">Carregando...</option>
              </select>
            </label>
          ` : ""}
          <label>
            Tipo
            <select id="mensagemTipoFilter">
              <option value="">Todos</option>
              <option value="mensagem">Mensagem</option>
              <option value="aviso">Aviso</option>
              <option value="comunicado">Comunicado</option>
              <option value="financeiro">Financeiro</option>
              <option value="sistema">Sistema</option>
            </select>
          </label>
        </div>
      </aside>
      <section class="panel mensagens-list-panel">
        <div class="mensagens-list-head">
          <strong id="mensagensListTitle">${formatarMensagemCaixa(mensagensState.caixa)}</strong>
          <span id="mensagensListMeta">Preparando sua caixa...</span>
        </div>
        <div id="mensagensList" class="mensagens-list">
          <div class="reservas-loading"><p>Carregando mensagens...</p></div>
        </div>
      </section>
      <section class="panel mensagens-detail-panel">
        <div id="mensagemDetail" class="mensagem-detail-empty">
          Selecione uma mensagem para ler o conteudo completo.
        </div>
      </section>
    </div>
  `;

  document.querySelectorAll("#mensagensFolders .mensagens-folder-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("#mensagensFolders .mensagens-folder-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      mensagensState.caixa = button.dataset.caixa || "entrada";
      mensagensState.selectedId = null;
      await carregarMensagensInboxPainel();
    });
  });

  document.getElementById("mensagemTipoFilter")?.addEventListener("change", async (event) => {
    mensagensState.tipo = event.target.value || "";
    mensagensState.selectedId = null;
    await carregarMensagensInboxPainel();
  });

  document.getElementById("btnNovaMensagem")?.addEventListener("click", () => abrirModalMensagem());

  if (user?.perfil === "admin") {
    carregarCondominiosParaMensagens();
  } else {
    mensagensState.condominioId = "";
    carregarMensagensInboxPainel();
  }
}

async function carregarCondominiosParaMensagens() {
  const select = document.getElementById("mensagemCondominioFilter");
  if (!select) return;

  try {
    const condominios = await buscarCondominiosDoAdmin();
    if (!condominios.length) {
      select.innerHTML = `<option value="">Nenhum condominio cadastrado</option>`;
      select.disabled = true;
      document.getElementById("mensagensList").innerHTML = `<div class="reservas-empty">Cadastre um condominio para usar a central de mensagens.</div>`;
      return;
    }

    select.innerHTML = condominios
      .map((item) => `<option value="${item.id}">${escapeMensagemHtml(item.nome_fantasia)}</option>`)
      .join("");
    mensagensState.condominioId = condominios[0].id;
    select.value = mensagensState.condominioId;
    select.addEventListener("change", async () => {
      mensagensState.condominioId = select.value || "";
      mensagensState.selectedId = null;
      await carregarMensagensInboxPainel();
    });
    await carregarMensagensInboxPainel();
  } catch (error) {
    select.innerHTML = `<option value="">Erro ao carregar condominios</option>`;
    showToast(error.message || "Erro ao carregar condominios para mensagens", "error");
  }
}

async function carregarMensagensInboxPainel() {
  const list = document.getElementById("mensagensList");
  const meta = document.getElementById("mensagensListMeta");
  const title = document.getElementById("mensagensListTitle");
  const detail = document.getElementById("mensagemDetail");
  if (!list || !meta) return;

  list.innerHTML = `<div class="reservas-loading"><p>Carregando mensagens...</p></div>`;
  if (title) title.textContent = formatarMensagemCaixa(mensagensState.caixa);
  meta.textContent = "Consultando sua caixa...";
  if (detail) {
    detail.className = "mensagem-detail-empty";
    detail.textContent = "Selecione uma mensagem para ler o conteudo completo.";
  }

  try {
    await carregarContagensMensagens();
    atualizarContagensMensagensUI();
    const mensagens = await buscarMensagensInbox({
      caixa: mensagensState.caixa,
      tipo: mensagensState.tipo,
      condominio_id: mensagensState.condominioId,
    });

    mensagensState.items = mensagens;
    meta.textContent = `${mensagens.length} mensagem(ns) em ${formatarMensagemCaixa(mensagensState.caixa).toLowerCase()}`;

    if (!mensagens.length) {
      list.innerHTML = `<div class="reservas-empty">Nenhuma mensagem encontrada nesta caixa.</div>`;
      return;
    }

    list.innerHTML = mensagens.map((item) => `
      <button type="button" class="mensagem-list-item ${Number(item.lido) === 1 ? "is-read" : "is-unread"} ${mensagensState.selectedId === item.id ? "active" : ""}" data-id="${item.id}">
        <div class="mensagem-list-topline">
          <strong>${escapeMensagemHtml(item.titulo || "Sem titulo")}</strong>
          <span>${escapeMensagemHtml(formatarDataHora(item.atualizado_em || item.criado_em))}</span>
        </div>
        <div class="mensagem-list-meta">
          <span>${escapeMensagemHtml(item.remetente_nome || "-")}</span>
          ${buildMensagemBadge("tipo", formatarMensagemTipo(item.tipo))}
          ${buildMensagemBadge("prioridade", formatarMensagemPrioridade(item.prioridade))}
          ${item.status_destinatario ? buildMensagemBadge("estado", formatarMensagemStatusDestinatario(item.status_destinatario)) : ""}
        </div>
      </button>
    `).join("");

    list.querySelectorAll(".mensagem-list-item").forEach((button) => {
      button.addEventListener("click", async () => {
        mensagensState.selectedId = button.dataset.id;
        list.querySelectorAll(".mensagem-list-item").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        await carregarDetalheMensagemPainel(button.dataset.id);
      });
    });

    const firstId = mensagensState.selectedId || mensagens[0]?.id;
    if (firstId) {
      mensagensState.selectedId = firstId;
      const firstButton = list.querySelector(`.mensagem-list-item[data-id="${firstId}"]`);
      firstButton?.classList.add("active");
      await carregarDetalheMensagemPainel(firstId);
    }
  } catch (error) {
    list.innerHTML = `<div class="reservas-empty">Nao foi possivel carregar as mensagens agora.</div>`;
    meta.textContent = "Erro ao carregar a caixa";
    showToast(error.message || "Erro ao carregar mensagens", "error");
  }
}

function atualizarContagensMensagensUI() {
  document.querySelectorAll(".mensagens-folder-count").forEach((element) => {
    const caixa = element.dataset.countFor;
    element.textContent = String(mensagensState.contagens?.[caixa] || 0);
  });
}

function atualizarBadgeMenuMensagens(totalNaoLidas = 0) {
  const menuItem = document.querySelector('.menu li[data-page="mensagens"]');
  if (!menuItem) return;

  let badge = menuItem.querySelector(".menu-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "menu-badge";
    menuItem.appendChild(badge);
  }

  const total = Number(totalNaoLidas || 0);
  badge.textContent = String(total);
  badge.classList.toggle("hidden", total <= 0);
}

async function verificarResumoMensagensSilencioso(user) {
  try {
    const resumo = await buscarResumoMensagens();
    atualizarBadgeMenuMensagens(resumo.nao_lidas || 0);

    if (ultimoResumoMensagens && Number(resumo.nao_lidas || 0) > Number(ultimoResumoMensagens.nao_lidas || 0)) {
      const diferenca = Number(resumo.nao_lidas || 0) - Number(ultimoResumoMensagens.nao_lidas || 0);
      showToast(diferenca > 1 ? `${diferenca} novas mensagens chegaram` : "Nova mensagem recebida");
    }

    ultimoResumoMensagens = resumo;

    if (getCurrentPage() === "mensagens") {
      await carregarMensagensInboxPainel();
    }
  } catch (error) {
    console.error("Erro ao atualizar resumo das mensagens:", error);
  }
}

function startMensagensPolling(user) {
  if (!["admin", "morador", "funcionario"].includes(user?.perfil)) return;

  if (mensagensPollingHandle) {
    clearInterval(mensagensPollingHandle);
  }

  verificarResumoMensagensSilencioso(user);
  mensagensPollingHandle = setInterval(() => {
    verificarResumoMensagensSilencioso(user);
  }, 30000);
}

async function carregarDetalheMensagemPainel(id) {
  const detail = document.getElementById("mensagemDetail");
  if (!detail) return;

  detail.className = "mensagem-detail-panel-body";
  detail.innerHTML = `<div class="reservas-loading"><p>Abrindo mensagem...</p></div>`;

  try {
    const payload = await buscarDetalheMensagem(id);
    const mensagem = payload?.mensagem || {};
    const metadados = parseMensagemMetadata(mensagem.metadados_json);
    const destinatarios = Array.isArray(payload?.destinatarios) ? payload.destinatarios : [];
    const arquivos = Array.isArray(payload?.arquivos) ? payload.arquivos : [];
    const isRecipient = Boolean(mensagem.destinatario_relacao_id);
    const user = JSON.parse(localStorage.getItem("usuario") || "{}");
    const isFinanceiroReserva = mensagem.entidade_tipo === "reserva" && metadados?.reserva_id;
    const podeMarcarPagamentoEnviado = user?.perfil === "morador"
      && isRecipient
      && ["reserva_pagamento_pendente"].includes(mensagem.categoria_evento);
    const podeConfirmarPagamento = user?.perfil === "admin"
      && isRecipient
      && ["reserva_pagamento_pendente_admin", "reserva_pagamento_enviado"].includes(mensagem.categoria_evento);

    if (isRecipient && Number(mensagem.lido) !== 1) {
      await marcarMensagemComoLida(id);
    }

    detail.className = "mensagem-detail-panel-body";
    detail.innerHTML = `
      <div class="mensagem-detail-head">
        <div>
          <h3>${escapeMensagemHtml(mensagem.titulo || "Sem titulo")}</h3>
          <div class="mensagem-detail-subhead">
            <span>De ${escapeMensagemHtml(mensagem.remetente_nome || "-")}</span>
            <span>${escapeMensagemHtml(formatarDataHora(mensagem.criado_em))}</span>
          </div>
        </div>
        <div class="mensagem-detail-actions">
          ${podeMarcarPagamentoEnviado ? `<button type="button" class="btn-primary-soft" id="btnPagamentoEnviadoMensagem">Pagamento enviado</button>` : ""}
          ${podeConfirmarPagamento ? `<button type="button" class="btn-primary-soft" id="btnConfirmarPagamentoMensagem">Confirmar pagamento</button><button type="button" class="btn-secondary-soft" id="btnRejeitarPagamentoMensagem">Rejeitar</button>` : ""}
          ${isRecipient ? `<button type="button" class="btn-secondary-soft" id="btnArquivarMensagem">Arquivar</button>` : ""}
          <button type="button" class="btn-primary-soft" id="btnResponderMensagem">Responder</button>
        </div>
      </div>
      <div class="mensagem-detail-badges">
        ${buildMensagemBadge("tipo", formatarMensagemTipo(mensagem.tipo))}
        ${buildMensagemBadge("prioridade", formatarMensagemPrioridade(mensagem.prioridade))}
        ${mensagem.status_destinatario ? buildMensagemBadge("estado", formatarMensagemStatusDestinatario(mensagem.status_destinatario)) : ""}
        ${mensagem.acao_requerida ? buildMensagemBadge("acao", mensagem.acao_requerida.replaceAll("_", " ")) : ""}
      </div>
      <div class="mensagem-detail-content">${escapeMensagemHtml(mensagem.conteudo || "Sem conteudo adicional.").replaceAll("\n", "<br />")}</div>
      <div class="mensagem-detail-meta-grid">
        <article>
          <span>Destinatarios</span>
          <strong>${destinatarios.length}</strong>
          <small>${destinatarios.map((item) => escapeMensagemHtml(item.nome_completo || "-")).join(", ") || "-"}</small>
        </article>
        <article>
          <span>Categoria</span>
          <strong>${escapeMensagemHtml(mensagem.categoria_evento || "-")}</strong>
          <small>${escapeMensagemHtml(mensagem.entidade_tipo || "-")}${mensagem.entidade_id ? ` #${escapeMensagemHtml(mensagem.entidade_id)}` : ""}</small>
        </article>
      </div>
      ${arquivos.length ? `
        <div class="mensagem-attachments">
          <div class="mensagem-attachments-title">Arquivos</div>
          <div class="mensagem-attachments-list">
            ${arquivos.map((arquivo) => `
              <a href="${arquivo.arquivo_url}" target="_blank" rel="noopener noreferrer" class="mensagem-attachment-item">
                <strong>${escapeMensagemHtml(arquivo.arquivo_nome || "Arquivo")}</strong>
                <span>${escapeMensagemHtml(arquivo.tipo || "-")}</span>
              </a>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;

    detail.querySelector("#btnResponderMensagem")?.addEventListener("click", () => abrirModalMensagem(mensagem));
    detail.querySelector("#btnPagamentoEnviadoMensagem")?.addEventListener("click", async () => {
      try {
        await criarMensagemInbox({
          condominio_id: metadados.condominio_id || mensagem.condominio_id,
          tipo: "financeiro",
          titulo: `Pagamento enviado para ${metadados.area_nome || "reserva"}`,
          conteudo: `O morador informou que o pagamento da reserva ${metadados.area_nome || ""} foi enviado para validacao.`,
          prioridade: "alta",
          mensagem_pai_id: mensagem.id,
          categoria_evento: "reserva_pagamento_enviado",
          entidade_tipo: "reserva",
          entidade_id: metadados.reserva_id,
          acao_requerida: "revisar",
          metadados: {
            ...metadados,
            origem_mensagem_id: mensagem.id,
          },
          destinatarios: [metadados.admin_id || mensagem.remetente_id].filter(Boolean),
        });
        await registrarAcaoMensagemInbox(mensagem.id, "acionado");
        showToast("Aviso de pagamento enviado ao admin");
        await carregarMensagensInboxPainel();
      } catch (error) {
        showToast(error.message || "Erro ao avisar pagamento", "error");
      }
    });
    detail.querySelector("#btnConfirmarPagamentoMensagem")?.addEventListener("click", async () => {
      try {
        await atualizarStatusReservaViaInbox(metadados.reserva_id, {
          status: "confirmada",
          status_pagamento: "pago",
          observacao_pagamento: "Pagamento confirmado via inbox interno",
        });
        await registrarAcaoMensagemInbox(mensagem.id, "resolvido");
        showToast("Pagamento confirmado e reserva atualizada");
        await carregarMensagensInboxPainel();
      } catch (error) {
        showToast(error.message || "Erro ao confirmar pagamento", "error");
      }
    });
    detail.querySelector("#btnRejeitarPagamentoMensagem")?.addEventListener("click", async () => {
      try {
        await atualizarStatusReservaViaInbox(metadados.reserva_id, {
          status: "pendente",
          status_pagamento: "rejeitado",
          observacao_pagamento: "Pagamento rejeitado via inbox interno",
        });
        await registrarAcaoMensagemInbox(mensagem.id, "resolvido");
        showToast("Pagamento rejeitado e morador avisado");
        await carregarMensagensInboxPainel();
      } catch (error) {
        showToast(error.message || "Erro ao rejeitar pagamento", "error");
      }
    });
    detail.querySelector("#btnArquivarMensagem")?.addEventListener("click", async () => {
      try {
        await arquivarMensagemInbox(id);
        showToast("Mensagem arquivada");
        mensagensState.selectedId = null;
        await carregarMensagensInboxPainel();
      } catch (error) {
        showToast(error.message || "Erro ao arquivar mensagem", "error");
      }
    });

    const item = mensagensState.items.find((current) => current.id === id);
    if (item) {
      item.lido = 1;
      item.status_destinatario = item.status_destinatario === "nao_lido" ? "lido" : item.status_destinatario;
    }
  } catch (error) {
    detail.className = "mensagem-detail-empty";
    detail.textContent = "Nao foi possivel abrir a mensagem agora.";
    showToast(error.message || "Erro ao carregar detalhe da mensagem", "error");
  }
}

async function abrirModalMensagem(mensagemPai = null) {
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  let destinatarios = [];

  try {
    destinatarios = await buscarDestinatariosMensagem({
      condominio_id: mensagensState.condominioId,
      include_usuario_id: mensagemPai?.remetente_id || "",
    });
  } catch (error) {
    showToast(error.message || "Erro ao carregar destinatarios", "error");
    return;
  }

  const existing = document.getElementById("modalMensagemInterna");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "modalMensagemInterna";
  overlay.className = "modal-overlay";

  const defaultTitulo = mensagemPai?.titulo ? `Re: ${mensagemPai.titulo}` : "";
  const defaultConteudo = mensagemPai?.titulo
    ? `\n\n----- Mensagem original -----\n${mensagemPai.conteudo || ""}`
    : "";
  const gruposMorador = [...new Set(destinatarios.map((item) => item.grupo_destino).filter(Boolean))];
  const grupoPadraoMorador = mensagemPai
    ? (destinatarios.find((item) => item.id === mensagemPai?.remetente_id)?.grupo_destino || gruposMorador[0] || "administracao")
    : (gruposMorador[0] || "administracao");

  overlay.innerHTML = `
    <div class="modal funcionario-modal mensagem-compose-modal">
      <div class="modal-header">
        <div>
          <h3>${mensagemPai ? "Responder mensagem" : "Nova mensagem"}</h3>
          <p>${mensagemPai ? "Continue a conversa mantendo o historico ligado." : "Escreva uma mensagem interna com visual de caixa postal."}</p>
        </div>
        <button type="button" class="modal-close" id="closeMensagemModal">&times;</button>
      </div>
      <form id="formMensagemInterna">
        <div class="modal-section">
          <div class="form-grid two-columns">
            ${user?.perfil === "admin" ? `
              <label>Condominio
                <select id="mensagemComposeCondominio" ${mensagensState.condominioId ? "" : "required"}></select>
              </label>
            ` : ""}
            ${user?.perfil === "morador" ? `
              <label>Canal
                <select id="mensagemComposeGrupoMorador">
                  ${gruposMorador.map((grupo) => `
                    <option value="${grupo}" ${grupo === grupoPadraoMorador ? "selected" : ""}>${formatarGrupoDestinoMensagem(grupo)}</option>
                  `).join("")}
                </select>
              </label>
            ` : ""}
            <label>Tipo
              <select id="mensagemComposeTipo">
                <option value="mensagem">Mensagem</option>
                <option value="aviso">Aviso</option>
                <option value="comunicado">Comunicado</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </label>
            ${user?.perfil === "morador" ? `
              <label class="full-width">Destino
                <select id="mensagemComposeDestinatarioMorador" required></select>
                <small>Escolha primeiro o canal e depois o destino exato dentro do seu condominio.</small>
              </label>
            ` : `
              <label class="full-width">Destinatarios
                <select id="mensagemComposeDestinatarios" multiple size="7" required>
                  ${destinatarios.map((item) => `
                    <option value="${item.id}" ${mensagemPai?.remetente_id === item.id ? "selected" : ""}>
                      ${escapeMensagemHtml(item.nome_completo)} - ${escapeMensagemHtml(item.perfil)}${item.area_atuacao ? ` / ${escapeMensagemHtml(item.area_atuacao)}` : ""}
                    </option>
                  `).join("")}
                </select>
              </label>
            `}
            <label>Titulo
              <input type="text" id="mensagemComposeTitulo" maxlength="150" value="${escapeMensagemHtml(defaultTitulo)}" required />
            </label>
            <label>Prioridade
              <select id="mensagemComposePrioridade">
                <option value="baixa">Baixa</option>
                <option value="media" selected>Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
            <label class="full-width">Mensagem
              <textarea id="mensagemComposeConteudo" rows="8" required>${escapeMensagemHtml(defaultConteudo)}</textarea>
            </label>
            <label class="full-width">Anexos
              <input type="file" id="mensagemComposeArquivos" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*" multiple />
              <small>Ate 3 arquivos. Voce pode anexar imagem, PDF, Word, Excel ou TXT.</small>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" id="cancelMensagemModal">Cancelar</button>
          <button type="submit" class="btn-confirm" id="submitMensagemModal">${mensagemPai ? "Enviar resposta" : "Enviar mensagem"}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");

  const close = () => {
    overlay.remove();
    document.body.classList.remove("modal-open");
  };

  overlay.querySelector("#closeMensagemModal")?.addEventListener("click", close);
  overlay.querySelector("#cancelMensagemModal")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  if (user?.perfil === "admin") {
    const select = overlay.querySelector("#mensagemComposeCondominio");
    const condominios = await buscarCondominiosDoAdmin().catch(() => []);
    select.innerHTML = condominios.map((item) => `
      <option value="${item.id}" ${String(item.id) === String(mensagensState.condominioId || condominios[0]?.id || "") ? "selected" : ""}>${escapeMensagemHtml(item.nome_fantasia)}</option>
    `).join("");
  }

  const atualizarDestinosMorador = () => {
    if (user?.perfil !== "morador") return;
    const grupoAtual = overlay.querySelector("#mensagemComposeGrupoMorador")?.value || grupoPadraoMorador;
    const select = overlay.querySelector("#mensagemComposeDestinatarioMorador");
    if (!select) return;
    const lista = destinatarios.filter((item) => item.grupo_destino === grupoAtual);
    select.innerHTML = lista.length
      ? lista.map((item) => `
          <option value="${item.id}" ${mensagemPai?.remetente_id === item.id ? "selected" : ""}>
            ${escapeMensagemHtml(item.nome_completo)}${item.area_atuacao ? ` - ${escapeMensagemHtml(item.area_atuacao)}` : ""}
          </option>
        `).join("")
      : `<option value="">Nenhum destino disponivel neste canal</option>`;
  };

  overlay.querySelector("#mensagemComposeGrupoMorador")?.addEventListener("change", atualizarDestinosMorador);
  atualizarDestinosMorador();

  overlay.querySelector("#formMensagemInterna")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = overlay.querySelector("#submitMensagemModal");
    try {
      const destinatariosSelecionados = user?.perfil === "morador"
        ? [overlay.querySelector("#mensagemComposeDestinatarioMorador")?.value].filter(Boolean)
        : [...overlay.querySelector("#mensagemComposeDestinatarios").selectedOptions].map((item) => item.value);
      if (!destinatariosSelecionados.length) {
        throw new Error("Selecione ao menos um destinatario");
      }

      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";

      const anexosInput = overlay.querySelector("#mensagemComposeArquivos");
      const anexos = anexosInput?.files?.length ? await lerArquivosMensagemComoDataUrl(anexosInput.files) : [];

      await criarMensagemInbox({
        condominio_id: overlay.querySelector("#mensagemComposeCondominio")?.value || mensagensState.condominioId || undefined,
        tipo: overlay.querySelector("#mensagemComposeTipo")?.value || "mensagem",
        titulo: overlay.querySelector("#mensagemComposeTitulo")?.value || "",
        conteudo: overlay.querySelector("#mensagemComposeConteudo")?.value || "",
        prioridade: overlay.querySelector("#mensagemComposePrioridade")?.value || "media",
        mensagem_pai_id: mensagemPai?.id || null,
        categoria_evento: mensagemPai ? "resposta_manual" : "mensagem_manual",
        acao_requerida: "responder",
        destinatarios: destinatariosSelecionados,
        anexos,
      });

      if (mensagemPai?.id) {
        await registrarAcaoMensagemInbox(mensagemPai.id, "acionado").catch(() => null);
      }

      showToast(mensagemPai ? "Resposta enviada com sucesso" : "Mensagem enviada com sucesso");
      close();
      mensagensState.caixa = "enviadas";
      mensagensState.selectedId = null;
      await carregarMensagensInboxPainel();
    } catch (error) {
      showToast(error.message || "Erro ao enviar mensagem", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mensagemPai ? "Enviar resposta" : "Enviar mensagem";
    }
  });
}

function lerArquivosMensagemComoDataUrl(fileList) {
  const files = Array.from(fileList || []).slice(0, 3);
  return Promise.all(
    files.map(async (file) => {
      if (String(file.type || "").startsWith("image/")) {
        const dataUrl = await comprimirImagemParaOcorrencia(file);
        return {
          nome_original: file.name,
          data_url: dataUrl,
        };
      }

      const dataUrl = await lerArquivoGenericoComoDataUrl(file);
      return {
        nome_original: file.name,
        data_url: dataUrl,
      };
    }),
  );
}

function lerArquivoGenericoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("Arquivo invalido para envio"));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Cada anexo deve ter no maximo 4 MB"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo anexado"));
    reader.readAsDataURL(file);
  });
}
