(function () {
  "use strict";

  // Shared decode cache: every booklet instance on the page pulls from the
  // same map, so a page image is only ever fetched and decoded once even if
  // it gets warmed by one booklet's preloader and displayed by another.
  const imageCache = new Map();

  // Resolves once the image has actually finished loading AND decoding (not
  // just once bytes exist), so callers can tell "still loading" apart from
  // "safe to reveal without a decode hitch on the main thread".
  function loadImage(src, priority) {
    if (!src) return Promise.resolve(null);
    let entry = imageCache.get(src);
    if (entry) return entry;
    entry = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      if (priority && "fetchPriority" in img) img.fetchPriority = priority;
      img.onload = () => {
        if (img.decode) {
          img.decode().then(() => resolve(img)).catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, entry);
    return entry;
  }

  // Fills the browser's cache with the rest of the book in the background,
  // a couple of requests at a time, without competing with anything the page
  // still needs for its first paint.
  function preloadAll(urls, concurrency) {
    let i = 0;
    function pump() {
      if (i >= urls.length) return;
      const url = urls[i++];
      loadImage(url, "low").then(pump);
    }
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    idle(() => {
      for (let c = 0; c < concurrency; c++) pump();
    });
  }

  function initBooklet(config) {
    const opener = document.getElementById(config.openerId);
    const modal = document.getElementById(config.modalId);
    if (!opener || !modal) return;

    // Two ways to describe the book: a ready-made array of image URLs
    // (`pages`), or the original numbered-page-directory shorthand
    // (`pageCount` + `imageDir`) kept for backwards compatibility.
    const pages = config.pages
      ? config.pages.slice()
      : Array.from({ length: config.pageCount }, (_, i) => {
          const n = i + 1;
          const s = n < 10 ? `0${n}` : `${n}`;
          return `${config.imageDir}/page-${s}.jpg`;
        });

    const PAGE_COUNT = pages.length;
    const ALT_LABEL = config.altLabel || "document";
    const pageUrl = (n) => (n >= 1 && n <= PAGE_COUNT ? pages[n - 1] : null);

    // Build book leaves: cover alone, then spreads (2,3) (4,5) ..., then a
    // solo back cover if one page is left over.
    const leaves = [[1]];
    let p = 2;
    while (p <= PAGE_COUNT) {
      if (p === PAGE_COUNT) {
        leaves.push([p]);
        p += 1;
      } else {
        leaves.push([p, p + 1]);
        p += 2;
      }
    }

    function slotsFor(leafIdx) {
      if (leafIdx < 0 || leafIdx >= leaves.length) return { left: null, right: null };
      const leafPages = leaves[leafIdx];
      if (leafPages.length === 2) return { left: leafPages[0], right: leafPages[1] };
      if (leafIdx === 0) return { left: null, right: leafPages[0] };
      return { left: leafPages[0], right: null };
    }

    function labelFor(leafIdx) {
      const leafPages = leaves[leafIdx];
      if (leafIdx === 0) return "Cover";
      if (leafIdx === leaves.length - 1 && leafPages.length === 1) return "Back Cover";
      return leafPages.length === 2 ? `Pages ${leafPages[0]}–${leafPages[1]}` : `Page ${leafPages[0]}`;
    }

    const stage = modal.querySelector(".booklet-stage");
    const leftUnder = modal.querySelector(".leaf-under-left");
    const rightUnder = modal.querySelector(".leaf-under-right");
    const leftUnderImg = leftUnder.querySelector("img");
    const rightUnderImg = rightUnder.querySelector("img");
    const leftLeaf = modal.querySelector(".flip-leaf-left");
    const rightLeaf = modal.querySelector(".flip-leaf-right");
    const leftFrontImg = leftLeaf.querySelector(".flip-front img");
    const leftBackImg = leftLeaf.querySelector(".flip-back img");
    const rightFrontImg = rightLeaf.querySelector(".flip-front img");
    const rightBackImg = rightLeaf.querySelector(".flip-back img");
    const counter = modal.querySelector(".booklet-counter");
    const prevBtn = modal.querySelector(".booklet-prev");
    const nextBtn = modal.querySelector(".booklet-next");
    const closeBtn = modal.querySelector(".booklet-close");

    [leftUnderImg, rightUnderImg, leftFrontImg, leftBackImg, rightFrontImg, rightBackImg].forEach((img) => {
      img.decoding = "async";
    });

    let idx = 0;
    let animating = false;
    let isOpen = false;
    let aspectSet = false;

    // The old version set img.src the moment a page became the "current"
    // slot and hoped the network was fast enough to finish inside the 550ms
    // flip. On anything slower than broadband it wasn't, so the bitmap
    // popped in over whatever was already on screen. Now every slot fades in
    // only once the browser has actually decoded it, and the pages either
    // side are kept warm in the cache well before they're needed.
    function setFace(imgEl, pageNum) {
      const src = pageUrl(pageNum);
      if (imgEl.dataset.pageSrc === (src || "")) return;
      imgEl.dataset.pageSrc = src || "";
      imgEl.classList.remove("is-ready");

      if (!src) {
        imgEl.removeAttribute("src");
        imgEl.alt = "";
        return;
      }

      imgEl.alt = `Page ${pageNum} of ${ALT_LABEL}`;
      imgEl.src = src;
      loadImage(src).then((loaded) => {
        if (!loaded || imgEl.dataset.pageSrc !== src) return;
        imgEl.classList.add("is-ready");
        // The stage box is sized as a two-page spread; derive its ratio from
        // whichever page image loads first instead of a hardcoded value, so
        // an image-array booklet with different proportions still lays out
        // without letterboxing or a jump once the real size is known.
        if (!aspectSet && loaded.naturalWidth && loaded.naturalHeight) {
          aspectSet = true;
          stage.style.aspectRatio = `${loaded.naturalWidth * 2} / ${loaded.naturalHeight}`;
        }
      });
    }

    function setVisible(el, show) {
      el.classList.toggle("leaf-hidden", !show);
    }

    // Keeps the two leaves just past what's currently on screen warm, so a
    // quick double-flip never outruns the network even if the user skips
    // past what the initial preload has reached.
    function preloadNeighbors() {
      [slotsFor(idx + 2), slotsFor(idx - 2)].forEach((slot) => {
        [slot.left, slot.right].forEach((n) => {
          const url = pageUrl(n);
          if (url) loadImage(url);
        });
      });
    }

    function refresh() {
      const cur = slotsFor(idx);
      const nextS = slotsFor(idx + 1);
      const prevS = slotsFor(idx - 1);

      setFace(rightFrontImg, cur.right);
      setFace(rightBackImg, nextS.left);
      setVisible(rightLeaf, cur.right != null);

      setFace(leftFrontImg, cur.left);
      setFace(leftBackImg, prevS.right);
      setVisible(leftLeaf, cur.left != null);

      setFace(rightUnderImg, nextS.right);
      setVisible(rightUnder, nextS.right != null);

      setFace(leftUnderImg, prevS.left);
      setVisible(leftUnder, prevS.left != null);

      counter.textContent = labelFor(idx);
      prevBtn.disabled = cur.left == null;
      nextBtn.disabled = cur.right == null;

      preloadNeighbors();
    }

    // Resets a leaf to a given angle with transitions off, then re-enables
    // them on the next paint. A double rAF (rather than reading el.offsetWidth
    // to force a synchronous reflow) flushes the "jump to 0deg" style change
    // without the forced-layout stall that was a chunk of the old jank.
    function snap(el, deg) {
      el.classList.add("no-transition");
      el.style.transform = `rotateY(${deg}deg)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove("no-transition");
        });
      });
    }

    function transitionDurationMs(el) {
      const ms = parseFloat(getComputedStyle(el).transitionDuration) * 1000;
      return Number.isFinite(ms) && ms > 0 ? ms : 550;
    }

    // transitionend is the happy path, but it can fail to fire (tab thrown
    // into the background mid-flip, prefers-reduced-motion zeroing the
    // duration, etc.), so a timeout derived from the actual CSS duration
    // always finishes the flip even if the event never shows up.
    function afterFlip(el, cb) {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", handler);
        clearTimeout(timer);
        cb();
      };
      const handler = (e) => {
        if (e.target === el && e.propertyName === "transform") finish();
      };
      el.addEventListener("transitionend", handler);
      const timer = setTimeout(finish, transitionDurationMs(el) + 120);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      idx = 0;
      snap(leftLeaf, 0);
      snap(rightLeaf, 0);
      refresh();
      preloadAll(pages, 3);
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.addEventListener("keydown", onKey);
      closeBtn.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      opener.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }

    function next() {
      if (animating) return;
      const cur = slotsFor(idx);
      if (cur.right == null || idx + 1 >= leaves.length) return;
      animating = true;
      rightLeaf.classList.add("flipping");
      rightLeaf.style.transform = "rotateY(-180deg)";
      afterFlip(rightLeaf, () => {
        idx++;
        rightLeaf.classList.remove("flipping");
        snap(rightLeaf, 0);
        refresh();
        animating = false;
      });
    }

    function prev() {
      if (animating) return;
      const cur = slotsFor(idx);
      if (cur.left == null || idx - 1 < 0) return;
      animating = true;
      leftLeaf.classList.add("flipping");
      leftLeaf.style.transform = "rotateY(180deg)";
      afterFlip(leftLeaf, () => {
        idx--;
        leftLeaf.classList.remove("flipping");
        snap(leftLeaf, 0);
        refresh();
        animating = false;
      });
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

    stage.addEventListener("click", (e) => {
      const rect = stage.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX > rect.width / 2) next();
      else prev();
    });

    // Warm the cover and first spread immediately (cheap: 3 images) so the
    // very first open already has something decoded to show, then quietly
    // fetch the rest of the book once the opener scrolls near the viewport
    // rather than the moment the page loads.
    loadImage(pageUrl(1));
    loadImage(pageUrl(2));
    loadImage(pageUrl(3));

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            preloadAll(pages, 3);
            io.disconnect();
          }
        },
        { rootMargin: "600px" }
      );
      io.observe(opener);
    } else {
      preloadAll(pages, 3);
    }
  }

  window.initBooklet = initBooklet;

  document.addEventListener("DOMContentLoaded", () => {
    initBooklet({
      openerId: "openBooklet",
      modalId: "bookletModal",
      pageCount: 30,
      imageDir: "images/booklet",
      altLabel: "Playmakers promotional booklet"
    });

    initBooklet({
      openerId: "openDissBooklet",
      modalId: "bookletModalDiss",
      pageCount: 37,
      imageDir: "images/booklet-diss",
      altLabel: "Football Fandom dissertation"
    });

    // New: pass a plain array of image URLs instead of a page-count +
    // directory convention — for a photo set or any gallery that isn't
    // exported from a PDF, e.g.:
    //
    // initBooklet({
    //   openerId: "openGallery",
    //   modalId: "galleryModal",
    //   pages: ["images/gallery/01.jpg", "images/gallery/02.jpg", "images/gallery/03.jpg"],
    //   altLabel: "Project gallery"
    // });
  });
})();
