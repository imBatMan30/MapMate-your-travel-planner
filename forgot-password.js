// DOM Elements
const findAccountForm = document.getElementById("find-account-form");
const resetPasswordForm = document.getElementById("reset-password-form");
const emailInput = document.getElementById("email");
const securityQuestionInput = document.getElementById("security-question");
const securityAnswerInput = document.getElementById("security-answer");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");
const passwordStrengthBar = document.querySelector(".password-strength-bar");

// Show notification
function showNotification(message, type = "error") {
    const notification = type === "error" ? errorMessage : successMessage;
    notification.textContent = message;
    notification.style.display = "flex";
    notification.className = `${type}-message`;
    setTimeout(() => {
        notification.style.display = "none";
    }, 5000);
}

// Password strength checker
function updatePasswordStrength() {
    const password = newPasswordInput.value;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength++;

    passwordStrengthBar.className = "password-strength-bar";
    if (strength === 1) passwordStrengthBar.classList.add("weak");
    else if (strength === 2) passwordStrengthBar.classList.add("medium");
    else if (strength === 3) passwordStrengthBar.classList.add("strong");
    else passwordStrengthBar.style.width = "0%";
}

// Handle Find Account form submission
findAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    // Show loading state
    const findButton = findAccountForm.querySelector(".button");
    findButton.classList.add("loading");
    findButton.disabled = true;

    try {
        const response = await fetch("/get-security-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();

        if (data.success) {
            securityQuestionInput.value = data.question;
            findAccountForm.style.display = "none";
            resetPasswordForm.style.display = "block";
            showNotification("Security question retrieved successfully!", "success");
        } else {
            showNotification(data.message, "error");
        }
    } catch (err) {
        console.error("Error fetching security question:", err);
        showNotification("Failed to connect to server. Please try again.", "error");
    } finally {
        findButton.classList.remove("loading");
        findButton.disabled = false;
    }
});

// Handle Reset Password form submission
resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const security_answer = securityAnswerInput.value.trim();
    const new_password = newPasswordInput.value;
    const confirm_password = confirmPasswordInput.value;

    if (new_password !== confirm_password) {
        showNotification("Passwords do not match!", "error");
        return;
    }

    // Basic password strength validation
    if (new_password.length < 8) {
        showNotification("Password must be at least 8 characters long!", "error");
        return;
    }

    // Show loading state
    const resetButton = resetPasswordForm.querySelector(".button");
    resetButton.classList.add("loading");
    resetButton.disabled = true;

    try {
        const response = await fetch("/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, security_answer, new_password }),
        });
        const data = await response.json();

        if (data.success) {
            showNotification("Password reset successfully! Redirecting to login...", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        } else {
            showNotification(data.message, "error");
        }
    } catch (err) {
        console.error("Error resetting password:", err);
        showNotification("Failed to connect to server. Please try again.", "error");
    } finally {
        resetButton.classList.remove("loading");
        resetButton.disabled = false;
    }
});

// Password strength real-time update
newPasswordInput.addEventListener("input", updatePasswordStrength);

// Add button ripple effect
function addButtonAnimations() {
    const buttons = document.querySelectorAll(".button");
    buttons.forEach((button) => {
        button.addEventListener("click", function (e) {
            if (!this.classList.contains("loading")) {
                const ripple = document.createElement("span");
                ripple.classList.add("ripple");
                this.appendChild(ripple);

                const x = e.clientX - e.target.offsetLeft;
                const y = e.clientY - e.target.offsetTop;

                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;

                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    });
}

// Add CSS for ripple effect
const style = document.createElement("style");
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize button animations
addButtonAnimations();