window.addEventListener("load", function() {
  const params = new URLSearchParams(window.location.search);
  const skipPreloader = params.get("skipPreloader");

  const preloader = document.getElementById("preloader");
  const content = document.getElementById("page-content");

  if (skipPreloader) {
    // Si viene con ?skipPreloader=true, no mostramos la animación
    preloader.style.display = "none";
    content.style.display = "block";
  } else {
    // Caso normal: mostramos el preloader 3 segundos
    setTimeout(function() {
      preloader.style.display = "none";
      content.style.display = "block";
    }, 3000);
  }
});
