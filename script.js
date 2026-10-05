(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;
  const preloader = document.querySelector(".preloader");
  const workSection = document.querySelector(".work-section");
  const workTrack = document.querySelector(".work-track");
  const workProgress = document.querySelector(".work-progress span");
  const canvas = document.querySelector(".particle-canvas");
  const context = canvas.getContext("2d");
  const cursor = document.querySelector(".cursor");
  const cursorLabel = document.querySelector(".cursor__label");
  const timelinePath = document.querySelector(".timeline__path path");

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let scrollY = window.scrollY;
  let previousScrollY = scrollY;
  let pointerX = viewportWidth / 2;
  let pointerY = viewportHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;
  let frameRequested = false;
  let canvasFrame = 0;
  let particles = [];
  let maxWorkShift = 0;

  function splitHeroText() {
    document.querySelectorAll(".split-text").forEach((line) => {
      const text = line.textContent.trim();
      line.setAttribute("aria-label", text);
      line.setAttribute("aria-hidden", "true");
      line.replaceChildren(...Array.from(text, (character, index) => {
        const letter = document.createElement("span");
        letter.className = "letter";
        letter.style.transitionDelay = `${Math.min(index * 35, 650)}ms`;
        letter.textContent = character === " " ? "\u00a0" : character;
        return letter;
      }));
    });
  }

  function startPreloader() {
    const count = preloader.querySelector(".preloader__count");
    const line = preloader.querySelector(".preloader__line");
    if (reducedMotion) {
      count.textContent = "100";
      line.style.transform = "scaleX(1)";
      preloader.classList.add("is-done");
      document.body.classList.add("is-loaded");
      return;
    }

    const startedAt = performance.now();
    const duration = 950;
    function update(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * 100);
      count.textContent = String(value).padStart(2, "0");
      line.style.transform = `scaleX(${eased})`;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        window.setTimeout(() => {
          preloader.classList.add("is-done");
          document.body.classList.add("is-loaded");
        }, 120);
      }
    }
    requestAnimationFrame(update);
  }

  function setWorkDimensions() {
    if (!workSection || !workTrack) return;
    maxWorkShift = Math.max(0, workTrack.scrollWidth - viewportWidth);
    workSection.style.height = `${viewportHeight + maxWorkShift}px`;
  }

  function splitAboutCopy() {
    const copy = document.querySelector(".about__scrub");
    if (!copy) return;
    const words = copy.textContent.trim().split(/\s+/);
    copy.replaceChildren(...words.map((word, index) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.append(document.createTextNode(index === words.length - 1 ? "" : " "));
      return span;
    }));
  }

  function observeReveals() {
    const revealElements = document.querySelectorAll(".section-heading, .about__title, .about__copy, .experience__title, .timeline-item");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-in-view"));
      return;
    }
    revealElements.forEach((element) => element.classList.add("reveal"));
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in-view");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealElements.forEach((element) => observer.observe(element));
  }

  function updateScrollEffects() {
    frameRequested = false;
    const scrollable = document.documentElement.scrollHeight - viewportHeight;
    document.querySelector(".scroll-progress").style.transform = `scaleX(${scrollable > 0 ? scrollY / scrollable : 0})`;

    document.querySelectorAll("[data-parallax]").forEach((element) => {
      const speed = Number(element.dataset.parallax);
      element.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
    });

    if (workSection && maxWorkShift > 0) {
      const sectionStart = workSection.offsetTop;
      const progress = Math.max(0, Math.min((scrollY - sectionStart) / maxWorkShift, 1));
      workTrack.style.transform = `translate3d(${-progress * maxWorkShift}px, 0, 0)`;
      workProgress.style.transform = `scaleX(${progress})`;
    }

    const about = document.querySelector(".about");
    const aboutCopy = document.querySelectorAll(".about__scrub .word");
    if (about && aboutCopy.length) {
      const bounds = about.getBoundingClientRect();
      const progress = Math.max(0, Math.min((viewportHeight * 0.82 - bounds.top) / (bounds.height * 0.72), 1));
      const litCount = Math.ceil(progress * aboutCopy.length);
      aboutCopy.forEach((word, index) => word.classList.toggle("is-lit", index < litCount));
    }

    if (timelinePath) {
      const timeline = timelinePath.closest(".timeline").getBoundingClientRect();
      const progress = Math.max(0, Math.min((viewportHeight * 0.85 - timeline.top) / (timeline.height * 0.8), 1));
      timelinePath.style.strokeDashoffset = String(1 - progress);
    }

    if (scrollY !== previousScrollY) {
      const marquee = document.querySelector(".marquee");
      const distance = Math.abs(scrollY - previousScrollY);
      marquee.dataset.reverse = String(scrollY < previousScrollY);
      marquee.style.setProperty("--marquee-duration", `${Math.max(8, 30 - Math.min(distance, 30) * .45)}s`);
      previousScrollY = scrollY;
    }
  }

  function requestScrollUpdate() {
    scrollY = window.scrollY;
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(updateScrollEffects);
    }
  }

  function setupCanvas() {
    if (!context) return;
    window.cancelAnimationFrame(canvasFrame);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(viewportWidth * pixelRatio);
    canvas.height = Math.floor(viewportHeight * pixelRatio);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const count = Math.min(72, Math.floor((viewportWidth * viewportHeight) / 18000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight,
      vx: (Math.random() - .5) * .22,
      vy: (Math.random() - .5) * .22
    }));
    drawParticles();
  }

  function drawParticles() {
    if (!context) return;
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    particles.forEach((particle, index) => {
      if (!reducedMotion) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > viewportWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > viewportHeight) particle.vy *= -1;
      }
      const dx = pointerX - particle.x;
      const dy = pointerY - particle.y;
      const distanceToPointer = Math.hypot(dx, dy);
      if (!reducedMotion && distanceToPointer < 120 && distanceToPointer > 0) {
        particle.x -= dx / distanceToPointer * .12;
        particle.y -= dy / distanceToPointer * .12;
      }
      for (let next = index + 1; next < particles.length; next += 1) {
        const other = particles[next];
        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
        if (distance < 105) {
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = `rgba(188, 139, 255, ${.14 * (1 - distance / 105)})`;
          context.stroke();
        }
      }
      context.beginPath();
      context.arc(particle.x, particle.y, 1.15, 0, Math.PI * 2);
      context.fillStyle = "rgba(244, 241, 234, .42)";
      context.fill();
    });
    if (!reducedMotion) canvasFrame = requestAnimationFrame(drawParticles);
  }

  function setupPointerEffects() {
    if (!finePointer || reducedMotion) return;
    document.body.classList.add("has-custom-cursor");
    window.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursor.classList.add("is-visible");
    }, { passive: true });

    function animateCursor() {
      cursorX += (pointerX - cursorX) * .16;
      cursorY += (pointerY - cursorY) * .16;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    document.querySelectorAll("a, button, .project-card").forEach((target) => {
      target.addEventListener("pointerenter", () => {
        cursor.classList.add("is-hovering");
        cursorLabel.textContent = target.dataset.cursor || "";
      });
      target.addEventListener("pointerleave", () => cursor.classList.remove("is-hovering"));
    });

    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) * .16;
        const y = (event.clientY - bounds.top - bounds.height / 2) * .16;
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; });
    });

    document.querySelectorAll(".hero__title").forEach((title) => {
      title.addEventListener("pointermove", (event) => {
        const bounds = title.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) * .008;
        const y = (event.clientY - bounds.top - bounds.height / 2) * .008;
        title.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      title.addEventListener("pointerleave", () => { title.style.transform = ""; });
    });

    document.querySelectorAll(".project-card").forEach((card) => {
      const visual = card.querySelector(".project-card__visual");
      card.addEventListener("pointermove", (event) => {
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        visual.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
      });
      card.addEventListener("pointerleave", () => { visual.style.transform = ""; });
    });
  }

  function setupThemeToggle() {
    const toggle = document.querySelector(".theme-toggle");
    toggle.addEventListener("click", () => {
      const light = root.dataset.theme !== "light";
      root.dataset.theme = light ? "light" : "noir";
      toggle.setAttribute("aria-pressed", String(light));
      toggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      toggle.querySelector(".theme-toggle__text").textContent = light ? "Dark" : "Light";
      document.querySelector('meta[name="theme-color"]').content = light ? "#eeeae2" : "#07070c";
    });
  }

  function setupEmailCopy() {
    const button = document.querySelector(".email-button");
    const status = document.querySelector(".copy-status");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.email);
        status.textContent = "Email copied.";
      } catch (error) {
        status.textContent = "Copy unavailable. Email: " + button.dataset.email;
      }
    });
  }

  function setupResize() {
    window.addEventListener("resize", () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      setWorkDimensions();
      setupCanvas();
      requestScrollUpdate();
    }, { passive: true });
  }

  splitHeroText();
  splitAboutCopy();
  document.querySelector("#year").textContent = String(new Date().getFullYear());
  setWorkDimensions();
  observeReveals();
  setupCanvas();
  setupPointerEffects();
  setupThemeToggle();
  setupEmailCopy();
  setupResize();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  startPreloader();
  updateScrollEffects();
})();
