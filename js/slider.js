function initSlider(config) {
  var opener = document.getElementById(config.openerId);
  var modal = document.getElementById(config.modalId);
  if (!opener || !modal) return;

  var vertical = config.orientation === "vertical";
  var track = modal.querySelector(".slider-track");
  var prevBtn = modal.querySelector(".slider-prev");
  var nextBtn = modal.querySelector(".slider-next");
  var closeBtn = modal.querySelector(".slider-close");
  var counter = modal.querySelector(".slider-counter");

  var pageCount = config.pageCount;
  var current = 0;

  function pagePath(n) {
    var s = n < 10 ? "0" + n : "" + n;
    return config.imageDir + "/page-" + s + ".jpg";
  }

  // Build slides once.
  if (!track.dataset.built) {
    for (var i = 1; i <= pageCount; i++) {
      var slide = document.createElement("div");
      slide.className = "slider-slide";
      var img = document.createElement("img");
      img.src = pagePath(i);
      img.loading = "lazy";
      img.alt = "Page " + i + " of " + config.altLabel;
      slide.appendChild(img);
      track.appendChild(slide);
    }
    track.dataset.built = "true";
  }

  function updateUI() {
    counter.textContent = (current + 1) + " / " + pageCount;
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= pageCount - 1;
  }

  function goTo(i) {
    current = Math.max(0, Math.min(pageCount - 1, i));
    var slide = track.children[current];
    if (slide) {
      slide.scrollIntoView({
        behavior: "smooth",
        inline: vertical ? "nearest" : "start",
        block: vertical ? "start" : "nearest"
      });
    }
    updateUI();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

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

  opener.addEventListener("click", function (e) {
    e.preventDefault();
    open();
  });
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    prev();
  });
  nextBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    next();
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });

  // Keep the counter in sync when the user scrolls/swipes manually.
  var scrollTimer = null;
  track.addEventListener("scroll", function () {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      if (vertical) {
        var slideHeight = track.clientHeight;
        current = Math.round(track.scrollTop / slideHeight);
      } else {
        var slideWidth = track.clientWidth;
        current = Math.round(track.scrollLeft / slideWidth);
      }
      updateUI();
    }, 100);
  });
}

document.addEventListener("DOMContentLoaded", function () {
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
