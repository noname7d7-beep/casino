document.addEventListener("DOMContentLoaded", () => {
  const games = [
    {
      id: "mines",
      title: "Mines",
      page: "games/mines.html",
      color: "#2b7cff",
      image: "images/mines.jpg"
    },
    {
      id: "bombucks",
      title: "Bombucks",
      page: "games/bombucks.html",
      color: "#12c2a8"
    },
    {
      id: "brawl-pirates",
      title: "Brawl Pirates",
      page: "games/brawl-pirates.html",
      color: "#8a5af8"
    },
    {
      id: "footballx",
      title: "FootballX",
      page: "games/footballx.html",
      color: "#f6b024"
    },
    {
      id: "lucky-jet",
      title: "Lucky Jet",
      page: "games/lucky-jet.html",
      color: "#ff6471"
    }
  ];

  const grid = document.getElementById("games-grid");
  if (!grid) return;

  games.forEach(game => {
    const card = document.createElement("article");
    card.className = "card";
    card.style.border = `1px solid ${game.color}`;

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    // Если указана картинка — фон = картинка
    if (game.image) {
      thumb.style.background = `url('${game.image}') center/cover no-repeat`;
    } else {
      thumb.style.background = `linear-gradient(135deg, ${game.color}33, ${game.color}11)`;
      thumb.textContent = game.title;
    }

    const title = document.createElement("h3");
    title.className = "title";
    title.textContent = game.title;

    const btn = document.createElement("button");
    btn.className = "open-btn";
    btn.textContent = "OPEN";
    btn.addEventListener("click", () => {
      window.location.href = game.page;
    });

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(btn);
    grid.appendChild(card);
  });
});
