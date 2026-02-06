const stage = document.getElementById("stage");
const letter = document.getElementById("letter");
const celebration = document.getElementById("celebration");
const sprinkles = document.getElementById("sprinkles");
const kisses = document.getElementById("kisses");
const comets = document.getElementById("comets");
const heartPop = document.getElementById("heart-pop");
const burst = document.getElementById("burst");
const popWrap = document.getElementById("pop-wrap");
const popCards = document.querySelectorAll(".pop-card");
const starsCanvas = document.getElementById("stars-canvas");
const cursorSparks = document.getElementById("cursor-sparks");
const replayButton = document.getElementById("replay");
const openLetterButton = document.getElementById("open-letter");
const closeButton = document.getElementById("close");
const letterModal = document.getElementById("letter-modal");
const letterModalClose = document.getElementById("letter-modal-close");
const doneLetterButton = document.getElementById("done-letter");
// No complex JS needed for stagger as the .letter-modal.active parent class handles the child transitions via CSS delay.
const copyLetterButton = document.getElementById("copy-letter");
const paperBody = document.getElementById("paper-body");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let sprinkleTimer = null;
let kissTimer = null;
let cometTimer = null;
let heartTimer = null;
let tiltX = 0;
let tiltY = 0;
let targetX = 0;
let targetY = 0;
let tiltFrame = null;
let parallaxX = 0;
let parallaxY = 0;
let openProgress = 0;
let touchLastY = null;
let openingTimer = null;
let scrollClassTimer = null;

let lastSparkAt = 0;
const sparkSymbols = ["✦", "✧", "✷", "✨", "❤", "🌹", "🌸"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setOpenProgress = (value) => {
  openProgress = clamp(value, 0, 1);
  letter.style.setProperty("--open", openProgress.toFixed(3));
};

const restartAnimation = (element) => {
  if (!element) return;
  element.style.animation = "none";
  // Force reflow to restart animation.
  element.offsetHeight;
  element.style.animation = "";
};

const markScrollOpening = () => {
  if (!letter) return;
  letter.classList.add("scrolling");
  if (scrollClassTimer) {
    clearTimeout(scrollClassTimer);
  }
  scrollClassTimer = setTimeout(() => {
    letter.classList.remove("scrolling");
    scrollClassTimer = null;
  }, 140);
};

const cancelPendingOpen = () => {
  if (!openingTimer) return;
  clearTimeout(openingTimer);
  openingTimer = null;
  letter.classList.remove("open");
};

const openLoveLetter = () => {
  if (!letterModal) return;
  letterModal.classList.add("active");
  letterModal.setAttribute("aria-hidden", "false");
  if (paperBody) {
    // Ensure focus after paint so selection works on mobile.
    setTimeout(() => paperBody.focus(), 0);
  }
};

const closeLoveLetter = () => {
  if (!letterModal) return;
  letterModal.classList.remove("active");
  letterModal.setAttribute("aria-hidden", "true");
};

const copyLoveLetter = async () => {
  if (!paperBody) return;
  const text = paperBody.innerText.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fall through to legacy copy.
  }

  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "true");
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  temp.remove();
};

const replayCelebration = () => {
  if (!celebration.classList.contains("active")) return;
  spawnBurst();
  startParticles();
  restartAnimation(popWrap);
};

const spawnParticle = (container, content, className) => {
  const item = document.createElement("span");
  item.className = className;
  item.textContent = content;
  const x = Math.random() * 100;
  const y = 60 + Math.random() * 20;
  item.style.left = `${x}%`;
  item.style.top = `${y}%`;
  item.style.fontSize = `${16 + Math.random() * 18}px`;
  item.style.animationDuration = `${3 + Math.random() * 2}s`;
  container.appendChild(item);
  setTimeout(() => item.remove(), 5200);
};

const spawnCursorSpark = (clientX, clientY) => {
  if (!cursorSparks || prefersReducedMotion) return;
  const spark = document.createElement("span");
  spark.className = "cursor-spark";
  spark.textContent =
    sparkSymbols[Math.floor(Math.random() * sparkSymbols.length)];
  spark.style.left = `${clientX}px`;
  spark.style.top = `${clientY}px`;
  spark.style.fontSize = `${12 + Math.random() * 18}px`;
  spark.style.animationDuration = `${650 + Math.random() * 450}ms`;
  cursorSparks.appendChild(spark);
  setTimeout(() => spark.remove(), 1200);
};

const maybeSpark = (clientX, clientY) => {
  const now = performance.now();
  if (now - lastSparkAt < 35) return;
  lastSparkAt = now;
  spawnCursorSpark(clientX, clientY);
};

const setupStars = () => {
  if (!starsCanvas || prefersReducedMotion) return;
  const context = starsCanvas.getContext("2d", { alpha: true });
  if (!context) return;

  let width = 0;
  let height = 0;
  let stars = [];

  const resize = () => {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = window.innerWidth;
    height = window.innerHeight;
    starsCanvas.width = Math.floor(width * dpr);
    starsCanvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const create = () => {
    const target = Math.round((window.innerWidth * window.innerHeight) / 14000);
    const count = Math.max(90, Math.min(170, target));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: 0.15 + Math.random() * 0.35,
      tw: 2 + Math.random() * 6,
      r: 0.2 + Math.random() * 1.2,
    }));
  };

  const frame = (time) => {
    context.clearRect(0, 0, width, height);
    const t = time / 1000;
    const positions = [];

    for (const star of stars) {
      const depth = 0.35 + (1 - star.z) * 0.85;
      star.x += star.vx * depth;
      star.y += star.vy * depth;

      if (star.y > height + 30) {
        star.y = -30;
        star.x = Math.random() * width;
        star.z = Math.random();
      }
      if (star.x < -30) star.x = width + 30;
      if (star.x > width + 30) star.x = -30;

      const px = star.x + parallaxX * 40 * depth;
      const py = star.y + parallaxY * 40 * depth;
      const tw = 0.55 + 0.45 * Math.sin(t * star.tw + star.z * 10);
      const alpha = 0.12 + tw * 0.35 * depth;
      positions.push({ x: px, y: py, a: alpha, r: star.r * (0.6 + depth) });
    }

    const maxDist = 120;
    context.lineWidth = 1;
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) continue;
        const a = (1 - dist / maxDist) * 0.12;
        context.strokeStyle = `rgba(255, 200, 220, ${a})`;
        context.beginPath();
        context.moveTo(positions[i].x, positions[i].y);
        context.lineTo(positions[j].x, positions[j].y);
        context.stroke();
      }
    }

    for (const p of positions) {
      context.fillStyle = `rgba(255, 255, 255, ${p.a})`;
      context.beginPath();
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
    }

    requestAnimationFrame(frame);
  };

  resize();
  create();
  window.addEventListener("resize", () => {
    resize();
    create();
  });
  requestAnimationFrame(frame);
};

const spawnBurst = () => {
  burst.innerHTML = "";
  const count = 30;
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("span");
    const dx = (Math.random() - 0.5) * 420;
    const dy = (Math.random() - 0.5) * 320;
    const dz = (Math.random() - 0.5) * 160;
    dot.style.left = "50%";
    dot.style.top = "50%";
    dot.style.setProperty("--dx", `${dx}px`);
    dot.style.setProperty("--dy", `${dy}px`);
    dot.style.setProperty("--dz", `${dz}px`);
    dot.style.animationDelay = `${Math.random() * 0.3}s`;
    burst.appendChild(dot);
  }
  setTimeout(() => {
    burst.innerHTML = "";
  }, 1800);
};

const spawnComet = () => {
  const comet = document.createElement("span");
  comet.className = "comet";
  const y = Math.random() * 60 + 10;
  const angle = -20 + Math.random() * 40;
  comet.style.top = `${y}%`;
  comet.style.left = `${Math.random() * 40}%`;
  comet.style.setProperty("--angle", `${angle}deg`);
  comets.appendChild(comet);
  setTimeout(() => comet.remove(), 3800);
};

const spawnHeartPop = () => {
  const heart = document.createElement("span");
  heart.textContent = "💗";
  const x = 35 + Math.random() * 30;
  const y = 55 + Math.random() * 20;
  heart.style.left = `${x}%`;
  heart.style.top = `${y}%`;
  heart.style.fontSize = `${18 + Math.random() * 18}px`;
  heartPop.appendChild(heart);
  setTimeout(() => heart.remove(), 2800);
};

const startParticles = () => {
  stopParticles();
  if (prefersReducedMotion) return;
  sprinkleTimer = setInterval(() => {
    spawnParticle(sprinkles, "✦", "sprinkle");
    spawnParticle(sprinkles, "✧", "sprinkle");
    spawnParticle(sprinkles, "✷", "sprinkle");
  }, 200);
  kissTimer = setInterval(() => {
    spawnParticle(kisses, "💋", "kiss");
  }, 350);
  cometTimer = setInterval(() => {
    spawnComet();
  }, 700);
  heartTimer = setInterval(() => {
    spawnHeartPop();
  }, 500);
};

const stopParticles = () => {
  if (sprinkleTimer) clearInterval(sprinkleTimer);
  if (kissTimer) clearInterval(kissTimer);
  if (cometTimer) clearInterval(cometTimer);
  if (heartTimer) clearInterval(heartTimer);
  sprinkleTimer = null;
  kissTimer = null;
  cometTimer = null;
  heartTimer = null;
  sprinkles.innerHTML = "";
  kisses.innerHTML = "";
  comets.innerHTML = "";
  heartPop.innerHTML = "";
};

const openLetter = () => {
  if (celebration.classList.contains("active")) return;
  if (openingTimer) return;
  setOpenProgress(1);
  letter.classList.add("open");
  letter.classList.remove("scrolling");
  openingTimer = setTimeout(
    () => {
      celebration.classList.add("active");
      celebration.setAttribute("aria-hidden", "false");
      spawnBurst();
      startParticles();
      openingTimer = null;
      if (window.rose3D) window.rose3D.start();
    },
    prefersReducedMotion ? 0 : 320
  );
};

const closeLetter = () => {
  if (openingTimer) {
    clearTimeout(openingTimer);
    openingTimer = null;
  }
  setOpenProgress(0);
  letter.classList.remove("open");
  letter.classList.remove("scrolling");
  celebration.classList.remove("active");
  celebration.setAttribute("aria-hidden", "true");
  stopParticles();
  if (window.rose3D) window.rose3D.stop();
  closeLoveLetter();
  parallaxX = 0;
  parallaxY = 0;
};

// Click is now optional/fallback, but let's keep it for accessibility 
// or if they click the envelope directly
letter.addEventListener("click", openLetter);
closeButton.addEventListener("click", closeLetter);

celebration.addEventListener("click", (event) => {
  if (event.target === celebration) {
    closeLetter();
  }
});

if (replayButton) replayButton.addEventListener("click", replayCelebration);
if (openLetterButton) openLetterButton.addEventListener("click", openLoveLetter);
if (letterModalClose) letterModalClose.addEventListener("click", closeLoveLetter);
if (doneLetterButton) doneLetterButton.addEventListener("click", closeLoveLetter);
if (copyLetterButton) copyLetterButton.addEventListener("click", copyLoveLetter);
if (letterModal) {
  letterModal.addEventListener("click", (event) => {
    if (event.target === letterModal) {
      closeLoveLetter();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (letterModal?.classList.contains("active")) {
    closeLoveLetter();
    return;
  }
  if (celebration.classList.contains("active")) {
    closeLetter();
  }
});

const normalizeWheelDelta = (event) => {
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  if (event.deltaMode === 2) delta *= window.innerHeight;
  return delta;
};

window.addEventListener(
  "wheel",
  (event) => {
    if (celebration.classList.contains("active")) return;
    event.preventDefault();
    markScrollOpening();
    const delta = normalizeWheelDelta(event);
    setOpenProgress(openProgress + delta / 950);
    if (openingTimer && openProgress < 0.98) {
      cancelPendingOpen();
      return;
    }
    if (openProgress >= 1) {
      openLetter();
    }
  },
  { passive: false }
);

stage.addEventListener(
  "touchstart",
  (event) => {
    if (celebration.classList.contains("active")) return;
    touchLastY = event.touches?.[0]?.clientY ?? null;
  },
  { passive: true }
);

stage.addEventListener(
  "touchmove",
  (event) => {
    if (celebration.classList.contains("active")) return;
    const y = event.touches?.[0]?.clientY;
    if (typeof y !== "number" || typeof touchLastY !== "number") return;
    const delta = touchLastY - y;
    touchLastY = y;
    markScrollOpening();
    setOpenProgress(openProgress + delta / 700);
    if (openingTimer && openProgress < 0.98) {
      cancelPendingOpen();
      event.preventDefault();
      return;
    }
    if (openProgress >= 1) {
      openLetter();
    }
    event.preventDefault();
  },
  { passive: false }
);

stage.addEventListener("touchend", () => {
  touchLastY = null;
});

const updateTilt = () => {
  tiltX += (targetX - tiltX) * 0.08;
  tiltY += (targetY - tiltY) * 0.08;
  letter.style.setProperty("--tilt-x", `${tiltX}deg`);
  letter.style.setProperty("--tilt-y", `${tiltY}deg`);
  tiltFrame = requestAnimationFrame(updateTilt);
};

stage.addEventListener("pointermove", (event) => {
  const rect = stage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  targetX = x * 16;
  targetY = -y * 16;
  parallaxX = x;
  parallaxY = y;
  letter.style.setProperty("--shift-x", `${x * 14}px`);
  letter.style.setProperty("--shift-y", `${y * 12}px`);
  maybeSpark(event.clientX, event.clientY);
  if (!tiltFrame) {
    tiltFrame = requestAnimationFrame(updateTilt);
  }
});

// Bunny eye tracking
const bunny = document.querySelector(".bunny");

window.addEventListener("pointermove", (e) => {
  if (!bunny) return;
  const rekt = bunny.getBoundingClientRect();
  const anchorX = rekt.left + rekt.width / 2;
  const anchorY = rekt.top + rekt.height / 2;

  const dx = e.clientX - anchorX;
  const dy = e.clientY - anchorY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.min(3, Math.hypot(dx, dy) / 40);

  const moveX = Math.cos(angle) * distance;
  const moveY = Math.sin(angle) * distance;

  // Since we can't select pseudo-elements in JS, we update CSS variables
  // or use the style element injection, BUT here I will just use a simpler approach
  // by querying the eye element directly if it wasn't a pseudo.
  // Wait, I made it a pseudo element in CSS. 
  // Let's modify the CSS to use CSS variables for the pupils position.
  document.documentElement.style.setProperty("--eye-x", `${moveX}px`);
  document.documentElement.style.setProperty("--eye-y", `${moveY}px`);
});

stage.addEventListener("pointerleave", () => {
  targetX = 0;
  targetY = 0;
  parallaxX = 0;
  parallaxY = 0;
  letter.style.setProperty("--shift-x", "0px");
  letter.style.setProperty("--shift-y", "0px");
});

// Card Stack Logic
const handleStackClick = (e) => {
  const card = e.currentTarget;
  // If we are currently animating, ignore
  if (card.classList.contains("swiping-out")) return;

  // Animate out
  card.classList.add("swiping-out");

  setTimeout(() => {
    // Move to back
    popWrap.appendChild(card);
    card.classList.remove("swiping-out");
    card.classList.add("secondary-card");
    card.classList.remove("active-card");

    // Activate new top
    const newTop = popWrap.querySelector(".pop-card:first-child");
    if (newTop) {
      newTop.classList.remove("secondary-card");
      newTop.classList.add("active-card");
    }
  }, 300); // Wait for half animation
};

if (popWrap && popCards.length) {
  popCards.forEach((card, index) => {
    if (index === 0) card.classList.add("active-card");
    else card.classList.add("secondary-card");

    card.addEventListener("click", handleStackClick);
  });
}

// Falling Petals Logic
const petalContainer = document.getElementById("petal-container");

const spawnFallingPetal = () => {
  if (!petalContainer || prefersReducedMotion) return;

  const petal = document.createElement("div");
  petal.className = "petal";

  // Random start position
  const left = Math.random() * 100;
  petal.style.left = `${left}%`;

  // Random animation properties
  const duration = 6 + Math.random() * 6; // 6-12s fall
  const delay = Math.random() * 5;
  const rotation = Math.random() * 360;

  // We can use Web Animations API for complex fall paths without cluttering CSS
  // or simple CSS transitions. Let's use WAAPI for performance and randomness.

  const keyframes = [
    { transform: `translate(0, -20px) rotate(${rotation}deg)`, opacity: 0 },
    { transform: `translate(${Math.random() * 100 - 50}px, 20vh) rotate(${rotation + 90}deg)`, opacity: 1, offset: 0.2 },
    { transform: `translate(${Math.random() * 100 - 50}px, 105vh) rotate(${rotation + 360}deg)`, opacity: 0 }
  ];

  const anim = petal.animate(keyframes, {
    duration: duration * 1000,
    delay: delay * 1000,
    easing: "linear"
  });

  petalContainer.appendChild(petal);

  anim.onfinish = () => petal.remove();
};

// Spawn initial batch
for (let i = 0; i < 15; i++) spawnFallingPetal();

// Continue spawning
setInterval(spawnFallingPetal, 1200);

setupStars();
setOpenProgress(0);
