const API_URL = "http://localhost:3000";

const loadingBox = document.getElementById("activationLoading");
const errorBox = document.getElementById("activationError");
const summaryBox = document.getElementById("activationSummary");
const form = document.getElementById("activationForm");
const successBox = document.getElementById("activationSuccess");
const btn = document.getElementById("activationBtn");
const btnText = document.getElementById("activationBtnText");
const spinner = document.getElementById("activationSpinner");

const summaryNome = document.getElementById("summaryNome");
const summaryEmail = document.getElementById("summaryEmail");
const summaryCondominio = document.getElementById("summaryCondominio");
const summaryUnidade = document.getElementById("summaryUnidade");
const summaryPapel = document.getElementById("summaryPapel");
const summaryExpira = document.getElementById("summaryExpira");
const summaryRows = document.querySelectorAll("#activationSummary .summary-row");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

function showError(message) {
  loadingBox.classList.add("d-none");
  form.classList.add("d-none");
  summaryBox.classList.add("d-none");
  errorBox.textContent = message;
  errorBox.classList.remove("d-none");
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function setSummaryLabels(tipoConvite) {
  const labels = Array.from(summaryRows).map((row) => row.querySelector("span"));
  if (labels.length < 6) return;

  if (tipoConvite === "funcionario") {
    labels[0].textContent = "Funcionario";
    labels[1].textContent = "Email";
    labels[2].textContent = "Condominio";
    labels[3].textContent = "Area";
    labels[4].textContent = "Cargo";
    labels[5].textContent = "Expira em";
    return;
  }

  labels[0].textContent = "Morador";
  labels[1].textContent = "Email";
  labels[2].textContent = "Condominio";
  labels[3].textContent = "Unidade";
  labels[4].textContent = "Papel";
  labels[5].textContent = "Expira em";
}

async function validateInvite() {
  if (!token) {
    showError("Token de ativacao nao informado.");
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/convites/validar?token=${encodeURIComponent(token)}`,
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.erro || "Convite invalido ou expirado.");
    }

    const convite = data.convite || {};
    const tipoConvite = convite.tipo_convite || "morador";
    setSummaryLabels(tipoConvite);

    summaryNome.textContent = convite.nome_completo || "-";
    summaryEmail.textContent = convite.email || "-";
    summaryCondominio.textContent = convite.condominio || "-";

    if (tipoConvite === "funcionario") {
      summaryUnidade.textContent = convite.area_atuacao
        ? convite.area_atuacao.replace("_", " ").toUpperCase()
        : "-";
      summaryPapel.textContent = convite.cargo || "Funcionario";
    } else {
      summaryUnidade.textContent = convite.torre
        ? `${convite.torre} - ${convite.unidade || "-"}`
        : convite.unidade || "-";
      summaryPapel.textContent = convite.papel || "-";
    }

    summaryExpira.textContent = formatDate(convite.expira_em);

    loadingBox.classList.add("d-none");
    summaryBox.classList.remove("d-none");
    form.classList.remove("d-none");
  } catch (error) {
    console.error(error);
    showError(error.message || "Nao foi possivel validar o convite.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.classList.add("d-none");

  const novaSenha = document.getElementById("novaSenha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  if (novaSenha.length < 6) {
    showError("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (novaSenha !== confirmarSenha) {
    showError("A confirmacao da senha nao confere.");
    return;
  }

  btn.disabled = true;
  btnText.classList.add("d-none");
  spinner.classList.remove("d-none");

  try {
    const response = await fetch(`${API_URL}/convites/ativar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        senha: novaSenha,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.erro || "Nao foi possivel ativar a conta.");
    }

    form.classList.add("d-none");
    summaryBox.classList.add("d-none");
    successBox.classList.remove("d-none");
  } catch (error) {
    console.error(error);
    showError(error.message || "Falha ao ativar a conta.");
  } finally {
    btn.disabled = false;
    btnText.classList.remove("d-none");
    spinner.classList.add("d-none");
  }
});

validateInvite();
