document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  toggle?.addEventListener("click", () => {
    links?.classList.toggle("open");
  });

  const parallaxImages = document.querySelectorAll(".parallax-frame-wide img:not(.no-parallax-shift)");
  if (parallaxImages.length) {
    let ticking = false;

    const updateParallax = () => {
      const viewportCenter = window.innerHeight / 2;
      for (const img of parallaxImages) {
        const rect = img.parentElement.getBoundingClientRect();
        const frameCenter = rect.top + rect.height / 2;
        const offset = (frameCenter - viewportCenter) * 0.15;
        img.style.transform = `translateY(${offset}px)`;
      }
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    window.addEventListener("scroll", requestTick);
    window.addEventListener("resize", requestTick);
    updateParallax();
  }

  // Infinite horizontal galleries: each track's content is followed by an
  // identical, aria-hidden clone. Once the user scrolls past the end of the
  // real set and into the clone, silently rewind by exactly one set's width
  // so the loop back to the start is invisible.
  document.querySelectorAll(".gallery-track").forEach((track) => {
    const clone = track.querySelector(".gallery-track-clone");
    if (!clone) return;

    track.addEventListener(
      "scroll",
      () => {
        const trackRect = track.getBoundingClientRect();
        const cloneRect = clone.getBoundingClientRect();
        const setWidth = cloneRect.left - trackRect.left + track.scrollLeft;

        if (setWidth > 0 && track.scrollLeft >= setWidth) {
          track.scrollLeft -= setWidth;
        }
      },
      { passive: true }
    );
  });
});
