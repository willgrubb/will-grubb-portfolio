function initBooklet(config) {
  const opener = document.getElementById(config.openerId);
  const modal = document.getElementById(config.modalId);
  if (!opener || !modal) return;

  const PAGE_COUNT = config.pageCount;
  const IMAGE_DIR = config.imageDir;
  const ALT_LABEL = config.altLabel;

  const pagePath = (n) => {
    const s = n < 10 ? `0${n}` : `${n}`;
    return `${IMAGE_DIR}/page-${s}.jpg`;
  };

  // Build book leaves: cover alone, then spreads (2,3) (4,5) ..., then a solo back cover if one page is left over.
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
    const pages = leaves[leafIdx];
    if (pages.length === 2) return { left: pages[0], right: pages[1] };
    if (leafIdx === 0) return { left: null, right: pages[0] };
    return { left: pages[0], right: null };
  }

  function labelFor(leafIdx) {
    const pages = leaves[leafIdx];
    if (leafIdx === 0) return "Cover";
    if (leafIdx === leaves.length - 1 && pages.length === 1) return "Back Cover";
    return pages.length === 2 ? `Pages ${pages[0]}–${pages[1]}` : `Page ${pages[0]}`;
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

  let idx = 0;
  let animating = false;

  function setImg(imgEl, pageNum) {
    imgEl.src = pageNum ? pagePath(pageNum) : "";
    imgEl.alt = pageNum ? `Page ${pageNum} of ${ALT_LABEL}` : "";
  }

  function setVisible(el, show) {
    el.classList.toggle("leaf-hidden", !show);
  }

  function refresh() {
    const cur = slotsFor(idx);
    const nextS = slotsFor(idx + 1);
    const prevS = slotsFor(idx - 1);

    setImg(rightFrontImg, cur.right);
    setImg(rightBackImg, nextS.left);
    setVisible(rightLeaf, cur.right != null);

    setImg(leftFrontImg, cur.left);
    setImg(leftBackImg, prevS.right);
    setVisible(leftLeaf, cur.left != null);

    setImg(rightUnderImg, nextS.right);
    setVisible(rightUnder, nextS.right != null);

    setImg(leftUnderImg, prevS.left);
    setVisible(leftUnder, prevS.left != null);

    counter.textContent = labelFor(idx);
    prevBtn.disabled = cur.left == null;
    nextBtn.disabled = cur.right == null;
  }

  function open() {
    idx = 0;
    leftLeaf.style.transition = "none";
    rightLeaf.style.transition = "none";
    leftLeaf.style.transform = "rotateY(0deg)";
    rightLeaf.style.transform = "rotateY(0deg)";
    refresh();
    void stage.offsetWidth;
    leftLeaf.style.transition = "";
    rightLeaf.style.transition = "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKey);
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKey);
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
    rightLeaf.style.transition = "";
    requestAnimationFrame(() => {
      rightLeaf.style.transform = "rotateY(-180deg)";
    });
    rightLeaf.addEventListener("transitionend", function handler(e) {
      if (e.propertyName !== "transform") return;
      rightLeaf.removeEventListener("transitionend", handler);
      idx++;
      rightLeaf.style.transition = "none";
      rightLeaf.style.transform = "rotateY(0deg)";
      rightLeaf.classList.remove("flipping");
      refresh();
      void rightLeaf.offsetWidth;
      rightLeaf.style.transition = "";
      animating = false;
    });
  }

  function prev() {
    if (animating) return;
    const cur = slotsFor(idx);
    if (cur.left == null || idx - 1 < 0) return;
    animating = true;
    leftLeaf.classList.add("flipping");
    leftLeaf.style.transition = "";
    requestAnimationFrame(() => {
      leftLeaf.style.transform = "rotateY(180deg)";
    });
    leftLeaf.addEventListener("transitionend", function handler(e) {
      if (e.propertyName !== "transform") return;
      leftLeaf.removeEventListener("transitionend", handler);
      idx--;
      leftLeaf.style.transition = "none";
      leftLeaf.style.transform = "rotateY(0deg)";
      leftLeaf.classList.remove("flipping");
      refresh();
      void leftLeaf.offsetWidth;
      leftLeaf.style.transition = "";
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
    if (clickX > rect.width / 2) {
      next();
    } else {
      prev();
    }
  });
}

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
});
