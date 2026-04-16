const form = document.getElementById("loginForm");
const btn = document.getElementById("loginBtn");
const btnText = document.getElementById("loginBtnText");
const spinner = document.getElementById("loginSpinner");
const errorBox = document.getElementById("loginError");

const API_URL = "http://localhost:3000";

// carregar email salvo
window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("remember_email");
  if (savedEmail) {
    document.getElementById("email").value = savedEmail;
    document.getElementById("rememberMe").checked = true;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("d-none");

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const remember = document.getElementById("rememberMe").checked;

  // loading ON
  btn.disabled = true;
  btnText.classList.add("d-none");
  spinner.classList.remove("d-none");

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha, origem: "web" }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || "Falha ao autenticar");
    }

    // salvar token
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    // lembrar email
    if (remember) {
      localStorage.setItem("remember_email", email);
    } else {
      localStorage.removeItem("remember_email");
    }

    // redirecionamento (ajustamos depois por perfil)
    window.location.href = "dashboard.html";
  } catch (err) {
    errorBox.innerText = err.message;
    errorBox.classList.remove("d-none");
  } finally {
    // loading OFF
    btn.disabled = false;
    btnText.classList.remove("d-none");
    spinner.classList.add("d-none");
  }
});
