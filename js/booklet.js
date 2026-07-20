function initBooklet(config) {
  var opener = document.getElementById(config.openerId);
  var modal = document.getElementById(config.modalId);
  if (!opener || !modal) return;

  var PAGE_COUNT = config.pageCount;
  var IMAGE_DIR = config.imageDir;
  var ALT_LABEL = config.altLabel;

  function pagePath(n) {
    var s = n < 10 ? "0" + n : "" + n;
    return IMAGE_DIR + "/page-" + s + ".jpg";
  }

  // Build book leaves: cover alone, then spreads (2,3) (4,5) ..., then a solo back cover if one page is left over.
  var leaves = [[1]];
  var p = 2;
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
    var pages = leaves[leafIdx];
    if (pages.length === 2) return { left: pages[0], right: pages[1] };
    if (leafIdx === 0) return { left: null, right: pages[0] };
    return { left: pages[0], right: null };
  }

  function labelFor(leafIdx) {
    var pages = leaves[leafIdx];
    if (leafIdx === 0) return "Cover";
    if (leafIdx === leaves.length - 1 && pages.length === 1) return "Back Cover";
    return pages.length === 2 ? "Pages " + pages[0] + "–" + pages[1] : "Page " + pages[0];
  }

  var stage = modal.querySelector(".booklet-stage");
  var leftUnder = modal.querySelector(".leaf-under-left");
  var rightUnder = modal.querySelector(".leaf-under-right");
  var leftUnderImg = leftUnder.querySelector("img");
  var rightUnderImg = rightUnder.querySelector("img");
  var leftLeaf = modal.querySelector(".flip-leaf-left");
  var rightLeaf = modal.querySelector(".flip-leaf-right");
  var leftFrontImg = leftLeaf.querySelector(".flip-front img");
  var leftBackImg = leftLeaf.querySelector(".flip-back img");
  var rightFrontImg = rightLeaf.querySelector(".flip-front img");
  var rightBackImg = rightLeaf.querySelector(".flip-back img");
  var counter = modal.querySelector(".booklet-counter");
  var prevBtn = modal.querySelector(".booklet-prev");
  var nextBtn = modal.querySelector(".booklet-next");
  var closeBtn = modal.querySelector(".booklet-close");

  var idx = 0;
  var animating = false;

  function setImg(imgEl, pageNum) {
    imgEl.src = pageNum ? pagePath(pageNum) : "";
    imgEl.alt = pageNum ? "Page " + pageNum + " of " + ALT_LABEL : "";
  }

  function setVisible(el, show) {
    el.classList.toggle("leaf-hidden", !show);
  }

  function refresh() {
    var cur = slotsFor(idx);
    var nextS = slotsFor(idx + 1);
    var prevS = slotsFor(idx - 1);

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
    var cur = slotsFor(idx);
    if (cur.right == null || idx + 1 >= leaves.length) return;
    animating = true;
    rightLeaf.classList.add("flipping");
    rightLeaf.style.transition = "";
    requestAnimationFrame(function () {
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
    var cur = slotsFor(idx);
    if (cur.left == null || idx - 1 < 0) return;
    animating = true;
    leftLeaf.classList.add("flipping");
    leftLeaf.style.transition = "";
    requestAnimationFrame(function () {
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

  stage.addEventListener("click", function (e) {
    var rect = stage.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    if (clickX > rect.width / 2) {
      next();
    } else {
      prev();
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
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
