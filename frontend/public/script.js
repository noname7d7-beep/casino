
// General interactions: loader, sound, language
const loader = document.getElementById('loader');
const app = document.getElementById('app');
const langBtn = document.getElementById('langBtn');
const soundBtn = document.getElementById('soundBtn');
const bgAudio = document.getElementById('bgAudio');
const canvas = document.getElementById('bgcanvas');

let lang = 'ru';
langBtn.addEventListener('click', ()=>{
  lang = (lang === 'ru') ? 'en' : 'ru';
  langBtn.textContent = lang.toUpperCase();
  // future: update texts dynamically
});

soundBtn.addEventListener('click', ()=>{
  if(bgAudio.paused){
    bgAudio.play().catch(()=>{});
    soundBtn.textContent = '🔊';
  } else {
    bgAudio.pause();
    soundBtn.textContent = '🔈';
  }
});

// loader animation (2s) then show app
setTimeout(()=>{
  loader.style.opacity = '0';
  setTimeout(()=>{ loader.style.display = 'none'; app.classList.remove('hidden'); }, 600);
}, 2000);

// background particles on canvas
const ctx = canvas.getContext('2d');
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;
const particles = [];
for(let i=0;i<60;i++){
  particles.push({x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.6+0.6, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, hue: Math.random()*360});
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // subtle gradient overlay
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,"rgba(8,2,20,0.6)");
  g.addColorStop(1,"rgba(10,5,30,0.6)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy;
    if(p.x < -20) p.x = W+20;
    if(p.x > W+20) p.x = -20;
    if(p.y < -20) p.y = H+20;
    if(p.y > H+20) p.y = -20;
    ctx.beginPath();
    const hue = 260 + (Math.sin(p.hue)*40);
    ctx.fillStyle = `hsla(${hue},80%,60%,0.12)`;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}
draw();

window.addEventListener('resize', ()=>{ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
