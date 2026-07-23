function initSlider(config) {
  const opener = document.getElementById(config.openerId);
  const modal = document.getElementById(config.modalId);
  if (!opener || !modal) return;

  const vertical = config.orientation === "vertical";
  const track = modal.querySelector(".slider-track");
  const prevBtn = modal.querySelector(".slider-prev");
  const nextBtn = modal.querySelector(".slider-next");
  const closeBtn = modal.querySelector(".slider-close");
  const counter = modal.querySelector(".slider-counter");

  const pageCount = config.pageCount;
  let current = 0;

  const pagePath = (n) => {
    const s = n < 10 ? `0${n}` : `${n}`;
    return `${config.imageDir}/page-${s}.jpg`;
  };

  // Build slides once.
  if (!track.dataset.built) {
    for (let i = 1; i <= pageCount; i++) {
      const slide = document.createElement("div");
      slide.className = "slider-slide";
      const img = document.createElement("img");
      img.src = pagePath(i);
      img.loading = "lazy";
      img.alt = `Page ${i} of ${config.altLabel}`;
      slide.appendChild(img);
      track.appendChild(slide);
    }
    track.dataset.built = "true";
  }

  function updateUI() {
    counter.textContent = `${current + 1} / ${pageCount}`;
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= pageCount - 1;
  }

  function goTo(i) {
    current = Math.max(0, Math.min(pageCount - 1, i));
    const slide = track.children[current];
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: vertical ? "nearest" : "start",
      block: vertical ? "start" : "nearest"
    });
    updateUI();
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  function open() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKey);
    // Jump to the first slide instantly (no smooth scroll on open).
    if (vertical) track.scrollTop = 0;
    else track.scrollLeft = 0;
    current = 0;
    updateUI();
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    if (vertical) {
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
    } else {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
  }

  opener.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    prev();
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  // Keep the counter in sync when the user scrolls/swipes manually.
  let scrollTimer = null;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      current = vertical
        ? Math.round(track.scrollTop / track.clientHeight)
        : Math.round(track.scrollLeft / track.clientWidth);
      updateUI();
    }, 100);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSlider({
    openerId: "openDesignProcess",
    modalId: "sliderModalDesignProcess",
    pageCount: 13,
    imageDir: "images/slider-designprocess",
    altLabel: "Playmakers design process",
    orientation: "horizontal"
  });

  initSlider({
    openerId: "openMarketResearch",
    modalId: "sliderModalMarketResearch",
    pageCount: 33,
    imageDir: "images/slider-marketresearch",
    altLabel: "Playmakers market research report",
    orientation: "vertical"
  });

  initSlider({
    openerId: "openColourboard",
    modalId: "sliderModalColourboard",
    pageCount: 13,
    imageDir: "images/slider-colourboard",
    altLabel: "Weedo colourboard and design pack",
    orientation: "vertical"
  });

  initSlider({
    openerId: "openDevPack",
    modalId: "sliderModalDevPack",
    pageCount: 16,
    imageDir: "images/slider-devpack",
    altLabel: "Weedo development pack AW24",
    orientation: "horizontal"
  });

  initSlider({
    openerId: "openDesignProcessPS",
    modalId: "sliderModalDesignProcessPS",
    pageCount: 14,
    imageDir: "images/slider-paulsmith",
    altLabel: "Paul Smith design process",
    orientation: "horizontal"
  });

  initSlider({
    openerId: "openMarketResearchPS",
    modalId: "sliderModalMarketResearchPS",
    pageCount: 9,
    imageDir: "images/slider-psmarket",
    altLabel: "Paul Smith market research report",
    orientation: "vertical"
  });
});
