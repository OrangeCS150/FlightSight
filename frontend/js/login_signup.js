
document.addEventListener("DOMContentLoaded", () => {
  /* ================= LOGIN PAGE LOGIC ================= */
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageBox = document.getElementById("message");

    function showLoginMessage(text, type = "error") {
      if (!messageBox) return;
      messageBox.textContent = text;
      messageBox.classList.remove("error", "success");
      if (text) messageBox.classList.add(type);
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoginMessage("");

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        showLoginMessage("Please enter both email and password.");
        return;
      }

      try {
        const response = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          showLoginMessage(data.error || "Login failed.");
          return;
        }

        showLoginMessage("Login successful. Redirecting…", "success");

        setTimeout(() => {
          window.location.href = "homePage.html";
        }, 600);
      } catch (err) {
        console.error("Login error:", err);
        showLoginMessage("Something went wrong. Please try again.");
      }
    });
  }

  /* ================= SIGNUP PAGE LOGIC ================= */
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const messageBox = document.getElementById("message");

    function showSignupMessage(text, type = "error") {
      if (!messageBox) return;
      messageBox.textContent = text;
      messageBox.classList.remove("error", "success");
      if (text) messageBox.classList.add(type);
    }

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showSignupMessage("");

      const first_name = firstNameInput.value.trim();
      const last_name = lastNameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      const confirmPassword = confirmPasswordInput.value.trim();

      if (!first_name || !last_name || !email || !password || !confirmPassword) {
        showSignupMessage("Please fill out all fields.");
        return;
      }

      if (password !== confirmPassword) {
        showSignupMessage("Passwords do not match.");
        return;
      }

      try {
        const response = await fetch("/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ first_name, last_name, email, password }),
        });

        let data;
        try {
          data = await response.json();
        } catch (err) {
          console.error("Could not parse JSON from /auth/signup", err);
          showSignupMessage("Unexpected server response.");
          return;
        }

        if (!response.ok) {
          showSignupMessage(data.error || "Sign up failed.");
          return;
        }

        showSignupMessage("Account created! Redirecting to sign in…", "success");

        setTimeout(() => {
          window.location.href = "login.html";
        }, 900);
      } catch (err) {
        console.error("Signup error:", err);
        showSignupMessage("Something went wrong. Please try again.");
      }
    });
  }
});