// Handle Back to Top button functionality
document.addEventListener("DOMContentLoaded", function () {
  const backToTopButton = document.querySelector(".back-to-top");

  // Show button when user scrolls down 300px
  window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
      backToTopButton.classList.add("visible");
    } else {
      backToTopButton.classList.remove("visible");
    }
  });

  // Scroll to top when clicked
  backToTopButton.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Make sure message is displayed for Snake game
  const messageElement = document.getElementById("message");
  if (messageElement) {
    messageElement.style.display = "block";
  }
});
