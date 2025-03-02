document.addEventListener("DOMContentLoaded", function () {
  // Check if user has already made cookie choice
  const cookieConsent = localStorage.getItem("cookieConsent");

  if (cookieConsent === null) {
    // If no choice has been made, show the banner
    setTimeout(function () {
      document.getElementById("cookie-banner").classList.remove("hidden");
    }, 1000); // Short delay to avoid immediate popup
  } else if (cookieConsent === "accepted") {
    // If cookies accepted, enable analytics
    enableAnalytics();
  }

  // Set up event listeners
  document
    .getElementById("accept-cookies")
    .addEventListener("click", function () {
      localStorage.setItem("cookieConsent", "accepted");
      document.getElementById("cookie-banner").classList.add("hidden");
      enableAnalytics();
    });

  document
    .getElementById("reject-cookies")
    .addEventListener("click", function () {
      localStorage.setItem("cookieConsent", "rejected");
      document.getElementById("cookie-banner").classList.add("hidden");
      disableAnalytics();
    });
});

function enableAnalytics() {
  // Enable Google Analytics
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-942YNRDMMD");
}

function disableAnalytics() {
  // Disable Google Analytics
  window["ga-disable-G-942YNRDMMD"] = true;
  // Clear existing cookies if possible
  document.cookie.split(";").forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
}
