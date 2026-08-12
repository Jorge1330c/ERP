// ============================================
// public/configuracion.js - Módulo de Configuración (sin error 404)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('configuracion')) {
        alert('Acceso denegado: no tienes permiso para Configuración.');
        window.location.href = 'index.html';
        return;
    }

    // ============================================
    // 1. PERFIL - Cargar desde localStorage (sin API)
    // ============================================
    function loadUserProfile() {
        const currentUser = getCurrentUser();
        if (currentUser) {
            document.getElementById('nombrePerfil').value = currentUser.nombre || '';
            document.getElementById('emailPerfil').value = currentUser.email || '';
            const telefono = localStorage.getItem('user_telefono') || '';
            const departamento = localStorage.getItem('user_departamento') || 'ventas';
            document.getElementById('telefonoPerfil').value = telefono;
            document.getElementById('departamentoPerfil').value = departamento;

            // Actualizar nombre en el topbar
            const userNameSpan = document.querySelector('.profile-btn span');
            if (userNameSpan) {
                userNameSpan.textContent = currentUser.nombre.toUpperCase();
            }
        }
    }

    async function saveUserProfile(data) {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.id) {
                alert('No se pudo identificar al usuario.');
                return false;
            }

            const updateData = {
                nombre: data.nombre,
                email: data.email,
            };

            const result = await updateUsuario(currentUser.id, updateData);
            if (result) {
                // Actualizar localStorage con los nuevos datos
                const updatedUser = { ...currentUser, nombre: data.nombre, email: data.email };
                setCurrentUser(updatedUser);

                localStorage.setItem('user_telefono', data.telefono || '');
                localStorage.setItem('user_departamento', data.departamento || 'ventas');

                const userNameSpan = document.querySelector('.profile-btn span');
                if (userNameSpan) {
                    userNameSpan.textContent = data.nombre.toUpperCase();
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('Error guardando perfil:', error);
            alert('Error al guardar el perfil: ' + error.message);
            return false;
        }
    }

    // ============================================
    // 2. PREFERENCIAS - Usando themeManager global
    // ============================================
    function loadPreferences() {
        const temaGuardado = localStorage.getItem('tema') || 'sistema';
        document.querySelectorAll('input[name="tema"]').forEach(el => {
            el.checked = (el.value === temaGuardado);
        });

        const idioma = localStorage.getItem('idioma') || 'es';
        document.getElementById('idiomaPreferencia').value = idioma;

        document.getElementById('notifEmail').checked = localStorage.getItem('notifEmail') === 'true';
        document.getElementById('notifStock').checked = localStorage.getItem('notifStock') === 'true';
        document.getElementById('notifResumen').checked = localStorage.getItem('notifResumen') === 'true';
    }

    function savePreferences(data) {
        if (data.tema) {
            localStorage.setItem('tema', data.tema);
            if (window.themeManager) {
                window.themeManager.applyTheme(data.tema);
            } else {
                window.location.reload();
            }
        }
        if (data.idioma) {
            localStorage.setItem('idioma', data.idioma);
        }
        if (data.notifEmail !== undefined) localStorage.setItem('notifEmail', data.notifEmail);
        if (data.notifStock !== undefined) localStorage.setItem('notifStock', data.notifStock);
        if (data.notifResumen !== undefined) localStorage.setItem('notifResumen', data.notifResumen);
    }

    // ============================================
    // 3. SEGURIDAD - Cambiar contraseña
    // ============================================
    async function cambiarPassword(actual, nueva) {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.id) {
                alert('No se pudo identificar al usuario.');
                return false;
            }
            const result = await updateUsuario(currentUser.id, { password: nueva });
            if (result) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            alert('Error al cambiar la contraseña: ' + error.message);
            return false;
        }
    }

    // ============================================
    // 4. Eventos de formularios
    // ============================================
    function setupForms() {
        // Perfil
        const formPerfil = document.getElementById('formPerfil');
        formPerfil.addEventListener('submit', async function (e) {
            e.preventDefault();
            const nombre = document.getElementById('nombrePerfil').value.trim();
            const email = document.getElementById('emailPerfil').value.trim();
            const telefono = document.getElementById('telefonoPerfil').value.trim();
            const departamento = document.getElementById('departamentoPerfil').value;

            if (!nombre || !email) {
                alert('Nombre y email son obligatorios.');
                return;
            }

            const btn = this.querySelector('.btn-save');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const success = await saveUserProfile({ nombre, email, telefono, departamento });
            if (success) {
                btn.innerHTML = '<i class="fas fa-check"></i> Guardado';
                btn.style.background = '#38a169';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                    alert('✅ Perfil actualizado correctamente.');
                }, 1200);
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        // Preferencias - Apariencia
        const formApariencia = document.getElementById('formApariencia');
        formApariencia.addEventListener('submit', function (e) {
            e.preventDefault();
            const tema = document.querySelector('input[name="tema"]:checked').value;
            const idioma = document.getElementById('idiomaPreferencia').value;
            savePreferences({ tema, idioma });
            alert('✅ Preferencias de apariencia guardadas.');
        });

        // Preferencias - Notificaciones
        const formNotificaciones = document.getElementById('formNotificaciones');
        formNotificaciones.addEventListener('submit', function (e) {
            e.preventDefault();
            const notifEmail = document.getElementById('notifEmail').checked;
            const notifStock = document.getElementById('notifStock').checked;
            const notifResumen = document.getElementById('notifResumen').checked;
            savePreferences({ notifEmail, notifStock, notifResumen });
            alert('✅ Configuración de notificaciones guardada.');
        });

        // Seguridad
        const formSeguridad = document.getElementById('formSeguridad');
        formSeguridad.addEventListener('submit', async function (e) {
            e.preventDefault();
            const passActual = document.getElementById('pass_actual').value;
            const passNueva = document.getElementById('pass_nueva').value;
            const passConfirm = document.getElementById('pass_confirm').value;
            const errorDiv = document.getElementById('passMatchError');

            if (!passActual) {
                alert('❌ Ingresa tu contraseña actual.');
                return;
            }
            if (passNueva !== passConfirm) {
                errorDiv.style.display = 'block';
                return;
            } else {
                errorDiv.style.display = 'none';
            }
            if (passNueva.length < 8) {
                alert('❌ La nueva contraseña debe tener al menos 8 caracteres.');
                return;
            }

            const btn = this.querySelector('.btn-save');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
            btn.disabled = true;

            const success = await cambiarPassword(passActual, passNueva);
            if (success) {
                btn.innerHTML = '<i class="fas fa-check"></i> Cambiada';
                btn.style.background = '#38a169';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                    alert('✅ Contraseña actualizada correctamente.');
                    formSeguridad.reset();
                }, 1200);
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        // General (solo lectura)
        const formGeneral = document.getElementById('formGeneral');
        if (formGeneral) {
            formGeneral.addEventListener('submit', function (e) {
                e.preventDefault();
                alert('ℹ️ La información de la empresa es de solo lectura. Contacta al administrador para modificarla.');
            });
        }
    }

    // ============================================
    // 5. Eventos comunes (sidebar, perfil, logout)
    // ============================================
    function setupCommon() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });

        const profileBtn = document.getElementById('profileBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!dropdownMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdownMenu.classList.remove('open');
            }
        });

        document.getElementById('notifBtn').addEventListener('click', function () {
            const badge = this.querySelector('.notif-badge');
            if (badge) badge.style.display = 'none';
            alert('📬 Notificaciones marcadas como leídas.');
        });

        const logoutBtns = [
            document.getElementById('logoutBtn'),
            document.getElementById('logoutDropdown')
        ];
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (confirm('¿Cerrar sesión?')) {
                        logout();
                    }
                });
            }
        });
    }

    // ============================================
    // 6. Tabs
    // ============================================
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const target = this.dataset.tab;
                document.getElementById('tab-' + target).classList.add('active');
            });
        });
    }

    // ============================================
    // 7. Búsqueda
    // ============================================
    function setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const term = this.value.trim().toLowerCase();
                document.querySelectorAll('.config-card').forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = (term === '' || text.includes(term)) ? 'block' : 'none';
                });
            });
        }
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    setupCommon();
    setupTabs();
    setupForms();
    setupSearch();

    // Cargar perfil desde localStorage (sin API)
    loadUserProfile();
    loadPreferences();

    // Asegurar que el nombre en el topbar se actualice (por si acaso)
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    console.log('✅ Módulo de Configuración cargado.');
});