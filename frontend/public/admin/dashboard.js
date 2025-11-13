const API_BASE = "/api";

const GAMES = [
  { id: "aviator",     name: "Aviator" },
  { id: "mines",       name: "Mines" },
  { id: "plinko",      name: "Plinko" },
  { id: "chickenroad", name: "Chicken Road" },
  { id: "footballx",   name: "FootballX" },
  { id: "thimbles",    name: "Thimbles" },
];

function getToken() {
  return localStorage.getItem("mt_admin_token");
}

function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
  }
  return token;
}

function renderCards() {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  GAMES.forEach(game => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.game = game.id;

    card.innerHTML = `
      <div class="card-title">
        <span>${game.name}</span>
        <span class="tag">7 сигналов / код</span>
      </div>

      <div class="field-row">
        <input class="code-input" type="text" readonly value="—" />
        <button class="copy-btn">копия</button>
      </div>

      <button class="gen-btn">Получить промо</button>
      <div class="status"></div>
    `;

    container.appendChild(card);
  });
}

async function loadExistingCodes() {
  const token = ensureAuth();
  try {
    const res = await fetch(`${API_BASE}/admin/list`, {
      headers: { "X-Admin-Token": token },
    });
    if (!res.ok) return;
    const list = await res.json();

    // берём самый свежий код по каждой игре
    const latestByGame = {};
    for (const item of list) {
      if (!latestByGame[item.game]) {
        latestByGame[item.game] = item;
      }
    }

    document.querySelectorAll(".card").forEach(card => {
      const gameId = card.dataset.game;
      const item = latestByGame[gameId];
      if (item) {
        card.querySelector(".code-input").value = item.code;
        card.querySelector(".status").textContent =
          `Использовано: ${item.used}/${item.max_uses}`;
      }
    });
  } catch (e) {
    console.error("loadExistingCodes error", e);
  }
}

async function generateForGame(gameId, card) {
  const token = ensureAuth();
  const status = card.querySelector(".status");
  status.textContent = "Генерация...";

  try {
    const res = await fetch(`${API_BASE}/admin/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": token,
      },
      body: JSON.stringify({ game: gameId }),
    });

    const data = await res.json();

    if (!res.ok) {
      status.textContent = data.detail || "Ошибка генерации";
      return;
    }

    card.querySelector(".code-input").value = data.code;
    status.textContent = `Создан код, попыток: ${data.max_uses}`;
  } catch (e) {
    status.textContent = "Ошибка соединения";
  }
}

function attachHandlers() {
  const container = document.getElementById("cards");

  container.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (!card) return;

    const gameId = card.dataset.game;

    if (e.target.classList.contains("gen-btn")) {
      generateForGame(gameId, card);
    }

    if (e.target.classList.contains("copy-btn")) {
      const input = card.querySelector(".code-input");
      const value = input.value;
      if (!value || value === "—") return;

      navigator.clipboard.writeText(value).then(() => {
        const status = card.querySelector(".status");
        status.textContent = "Скопировано";
        setTimeout(() => {
          if (status.textContent === "Скопировано") status.textContent = "";
        }, 1200);
      });
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("mt_admin_token");
    window.location.href = "login.html";
  });
}

// init
document.addEventListener("DOMContentLoaded", () => {
  ensureAuth();
  renderCards();
  attachHandlers();
  loadExistingCodes();
});