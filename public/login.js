// ============================================
// public/login.js - Lógica de inicio de sesión
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const togglePassword = document.getElementById('togglePassword');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnSpinner = loginBtn.querySelector('.btn-spinner');

    // Mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function () {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        this.textContent = isPassword ? '🙈' : '👁️';
    });

    // Limpiar errores al escribir
    emailInput.addEventListener('input', function () {
        emailError.textContent = '';
        this.style.borderColor = '';
    });
    passwordInput.addEventListener('input', function () {
        passwordError.textContent = '';
        this.style.borderColor = '';
    });

    function validateForm() {
        let isValid = true;
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            emailError.textContent = 'El correo electrónico es obligatorio.';
            emailInput.style.borderColor = '#e53e3e';
            isValid = false;
        } else if (!emailRegex.test(email)) {
            emailError.textContent = 'Ingresa un correo electrónico válido.';
            emailInput.style.borderColor = '#e53e3e';
            isValid = false;
        } else {
            emailInput.style.borderColor = '';
        }

        if (!password) {
            passwordError.textContent = 'La contraseña es obligatoria.';
            passwordInput.style.borderColor = '#e53e3e';
            isValid = false;
        } else if (password.length < 6) {
            passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            passwordInput.style.borderColor = '#e53e3e';
            isValid = false;
        } else {
            passwordInput.style.borderColor = '';
        }

        return isValid;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        emailError.textContent = '';
        passwordError.textContent = '';
        emailInput.style.borderColor = '';
        passwordInput.style.borderColor = '';

        if (!validateForm()) return;

        loginBtn.disabled = true;
        btnText.textContent = 'Cargando...';
        btnSpinner.classList.remove('hidden');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const data = await login(email, password);
            setToken(data.token);
            setCurrentUser(data.usuario);
            window.location.href = 'index.html';
        } catch (error) {
            // Mensaje específico para cuenta inactiva
            if (error.message.toLowerCase().includes('inactiva')) {
                alert('❌ Tu cuenta está inactiva. Contacta al administrador.');
            } else {
                alert('❌ ' + error.message);
            }
            loginBtn.disabled = false;
            btnText.textContent = 'Iniciar sesión';
            btnSpinner.classList.add('hidden');
        }
    });
});