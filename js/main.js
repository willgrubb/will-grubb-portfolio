document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  var parallaxImages = document.querySelectorAll(".parallax-frame-wide img:not(.no-parallax-shift)");
  if (parallaxImages.length) {
    var ticking = false;

    var updateParallax = function () {
      var viewportCenter = window.innerHeight / 2;
      parallaxImages.forEach(function (img) {
        var rect = img.parentElement.getBoundingClientRect();
        var frameCenter = rect.top + rect.height / 2;
        var offset = (frameCenter - viewportCenter) * 0.15;
        img.style.transform = "translateY(" + offset + "px)";
      });
      ticking = false;
    };

    var requestTick = function () {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    window.addEventListener("scroll", requestTick);
    window.addEventListener("resize", requestTick);
    updateParallax();
  }
});
