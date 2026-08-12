// ============================================
// public/admin.js - Administración de usuarios (con carga desde API)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔵 Admin: DOMContentLoaded');

    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }
    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('administracion')) {
        alert('Acceso denegado: no tienes permiso para Administración.');
        window.location.href = 'index.html';
        return;
    }

    let usuarios = [];

    // --- Elementos DOM ---
    const tbody = document.getElementById('userTableBody');
    const totalUsuariosSpan = document.getElementById('totalUsuarios');
    const totalAdminsSpan = document.getElementById('totalAdmins');
    const totalActivosSpan = document.getElementById('totalActivos');
    const totalInactivosSpan = document.getElementById('totalInactivos');
    const userCountSpan = document.getElementById('userCount');
    const searchInput = document.getElementById('globalSearch');
    const openAddBtn = document.getElementById('openAddModal');

    // Modal
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const form = document.getElementById('userForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    // --- Funciones auxiliares ---
    function getEstadoLabel(estado) {
        const map = {
            activo: { label: 'Activo', class: 'status-activo' },
            inactivo: { label: 'Inactivo', class: 'status-inactivo' }
        };
        return map[estado] || { label: estado, class: '' };
    }

    function getPermisosTags(permisos) {
        if (!permisos || permisos.length === 0) return '<span class="perm-tag">Ninguno</span>';
        const map = {
            dashboard: 'Dashboard',
            ventas: 'Ventas',
            inventario: 'Inventario',
            clientes: 'Clientes',
            proveedores: 'Proveedores',
            informes: 'Informes',
            configuracion: 'Configuración',
            administracion: 'Administración',
            formulas: 'Fórmulas'
        };
        return permisos.map(p => `<span class="perm-tag">${map[p] || p}</span>`).join(' ');
    }

    // ============================================
    // OBTENER USUARIO (local o desde API)
    // ============================================
    async function obtenerUsuario(id) {
        // Buscar en el array local
        let usuario = usuarios.find(u => u.id === id);
        if (usuario) return usuario;

        console.warn(`⚠️ Usuario ${id} no encontrado localmente, cargando desde API...`);
        try {
            usuario = await getUsuario(id);
            if (usuario) {
                // Agregar al array local para futuras operaciones
                usuarios.push(usuario);
                console.log(`✅ Usuario ${id} cargado desde API`);
            }
            return usuario;
        } catch (error) {
            console.error(`❌ Error al cargar usuario ${id} desde API:`, error);
            return null;
        }
    }

    // --- Cargar datos ---
    async function loadUsuarios() {
        console.log('🔄 Cargando usuarios...');
        try {
            const data = await getUsuarios();
            if (data) {
                usuarios = data;
                console.log(`✅ Usuarios cargados: ${usuarios.length}`);
                renderTable();
            } else {
                console.warn('⚠️ No se recibieron usuarios');
                usuarios = [];
                renderTable();
            }
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            alert('Error al cargar los usuarios. Revisa la consola.');
        }
    }

    // --- Renderizar tabla ---
    function renderTable() {
        console.log('🖌️ Renderizando tabla de usuarios');
        let filtered = [...usuarios];
        const search = searchInput.value.trim().toLowerCase();
        if (search) {
            filtered = filtered.filter(u =>
                u.nombre.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search) ||
                u.rol.toLowerCase().includes(search)
            );
        }
        filtered.sort((a, b) => b.id - a.id);

        tbody.innerHTML = '';
        filtered.forEach(u => {
            const estado = getEstadoLabel(u.estado);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.id}</strong></td>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td>${u.rol}</td>
                <td><span class="status-badge ${estado.class}">${estado.label}</span></td>
                <td>${getPermisosTags(u.permisos || [])}</td>
                <td>
                    <button class="action-btn edit" data-id="${u.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${u.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        userCountSpan.textContent = filtered.length;
        updateSummaryCards();
        console.log('✅ Tabla renderizada');
    }

    // --- Actualizar tarjetas de resumen ---
    function updateSummaryCards() {
        totalUsuariosSpan.textContent = usuarios.length;
        const admins = usuarios.filter(u => u.rol === 'Administrador').length;
        totalAdminsSpan.textContent = admins;
        const activos = usuarios.filter(u => u.estado === 'activo').length;
        totalActivosSpan.textContent = activos;
        const inactivos = usuarios.filter(u => u.estado === 'inactivo').length;
        totalInactivosSpan.textContent = inactivos;
    }

    // ============================================
    // CRUD
    // ============================================
    async function addUser(data) {
        try {
            const result = await createUsuario(data);
            if (result) {
                alert('✅ Usuario creado correctamente.');
                loadUsuarios();
            }
        } catch (error) {
            alert('❌ Error al crear usuario: ' + error.message);
        }
    }

    async function updateUser(id, data) {
        try {
            const result = await updateUsuario(id, data);
            if (result) {
                alert('✅ Usuario actualizado correctamente.');
                loadUsuarios();
            }
        } catch (error) {
            alert('❌ Error al actualizar usuario: ' + error.message);
        }
    }

    async function deleteUser(id) {
        try {
            const result = await deleteUsuario(id);
            if (result) {
                alert('✅ Usuario eliminado.');
                loadUsuarios();
            }
        } catch (error) {
            alert('❌ Error al eliminar usuario: ' + error.message);
        }
    }

    // ============================================
    // MODAL - ABRIR / CERRAR
    // ============================================
    function openAddModal() {
        console.log('➕ Abriendo modal para nuevo usuario');
        modalTitle.textContent = 'Nuevo usuario';
        editIdInput.value = '';
        form.reset();
        document.querySelector('input[name="estado"][value="activo"]').checked = true;
        document.querySelectorAll('.perm-check').forEach(cb => cb.checked = false);
        document.querySelector('.perm-check[value="dashboard"]').checked = true;
        modalOverlay.classList.add('open');
    }

    // <-- NUEVO: openEditModal mejorado
    async function openEditModal(id) {
        console.log(`✏️ Abriendo modal de edición para usuario ${id}`);

        // Intentar obtener el usuario (local o desde API)
        const user = await obtenerUsuario(id);
        if (!user) {
            alert('❌ No se pudo obtener el usuario. Intenta recargar la página.');
            return;
        }

        modalTitle.textContent = 'Editar usuario #' + id;
        editIdInput.value = id;
        document.getElementById('nombre').value = user.nombre;
        document.getElementById('email').value = user.email;
        document.getElementById('password').value = '';
        document.getElementById('rol').value = user.rol;
        document.querySelector(`input[name="estado"][value="${user.estado}"]`).checked = true;

        // Marcar los permisos
        const permisos = user.permisos || [];
        document.querySelectorAll('.perm-check').forEach(cb => {
            cb.checked = permisos.includes(cb.value);
        });

        modalOverlay.classList.add('open');
        console.log('✅ Modal de edición abierto');
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        form.reset();
        editIdInput.value = '';
    }

    // ============================================
    // FORMULARIO - GUARDAR
    // ============================================
    function getFormData() {
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rol = document.getElementById('rol').value;
        const estado = document.querySelector('input[name="estado"]:checked').value;
        const permisos = [];
        document.querySelectorAll('.perm-check:checked').forEach(cb => {
            permisos.push(cb.value);
        });
        return { nombre, email, password, rol, estado, permisos };
    }

    async function submitForm(e) {
        e.preventDefault();
        console.log('📤 Enviando formulario...');
        const data = getFormData();
        console.log('📋 Datos del formulario:', data);

        if (!data.nombre || !data.email || !data.rol) {
            alert('Por favor completa todos los campos obligatorios (*).');
            return;
        }

        const editId = parseInt(editIdInput.value);
        if (editId) {
            if (!data.password || data.password.trim() === '') {
                delete data.password;
            }
            await updateUser(editId, data);
        } else {
            if (!data.password || data.password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres.');
                return;
            }
            await addUser(data);
        }
        closeModal();
    }

    // ============================================
    // DELEGACIÓN DE EVENTOS (EN EL TBODY)
    // ============================================
    tbody.addEventListener('click', function (e) {
        const target = e.target.closest('.action-btn');
        if (!target) return;

        const id = parseInt(target.dataset.id);
        if (isNaN(id)) {
            console.warn('⚠️ ID no válido');
            return;
        }

        if (target.classList.contains('edit')) {
            console.log('✏️ Click en editar para ID:', id);
            openEditModal(id);
        } else if (target.classList.contains('delete')) {
            console.log('🗑️ Click en eliminar para ID:', id);
            if (confirm('¿Eliminar el usuario #' + id + '?')) {
                deleteUser(id);
            }
        }
    });

    // ============================================
    // EVENTOS COMUNES
    // ============================================
    function setupSidebar() {
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
    }

    function setupProfileDropdown() {
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
    }

    function setupNotifications() {
        document.getElementById('notifBtn').addEventListener('click', function () {
            const badge = this.querySelector('.notif-badge');
            if (badge) badge.style.display = 'none';
            alert('📬 Notificaciones marcadas como leídas.');
        });
    }

    function setupLogout() {
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
    // INICIALIZACIÓN
    // ============================================
    setupSidebar();
    setupProfileDropdown();
    setupNotifications();
    setupLogout();

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
    openAddBtn.addEventListener('click', openAddModal);
    form.addEventListener('submit', submitForm);
    searchInput.addEventListener('input', renderTable);

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    loadUsuarios();
});