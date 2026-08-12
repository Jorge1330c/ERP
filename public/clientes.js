// ============================================
// public/clientes.js - Módulo de Clientes (con RUC)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('clientes')) {
        alert('Acceso denegado: no tienes permiso para Clientes.');
        window.location.href = 'index.html';
        return;
    }

    let clientes = [];

    // --- Elementos DOM ---
    const tbody = document.getElementById('clienteTableBody');
    const totalClientesSpan = document.getElementById('totalClientes');
    const clientesMesSpan = document.getElementById('clientesMes');
    const clientesEmailSpan = document.getElementById('clientesEmail');
    const clientesTelefonoSpan = document.getElementById('clientesTelefono');
    const clientesRUCSpan = document.getElementById('clientesRUC');
    const clienteCountSpan = document.getElementById('clienteCount');

    const searchInput = document.getElementById('globalSearch');
    const openAddBtn = document.getElementById('openAddModal');

    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const form = document.getElementById('clienteForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    // --- Cargar clientes ---
    async function loadClientes() {
        const data = await getClientes();
        if (data) {
            clientes = data;
            renderTable();
        }
    }

    // --- Renderizar tabla ---
    function renderTable() {
        let filtered = [...clientes];
        const search = searchInput.value.trim().toLowerCase();
        if (search) {
            filtered = filtered.filter(c =>
                c.nombre.toLowerCase().includes(search) ||
                (c.email && c.email.toLowerCase().includes(search)) ||
                (c.telefono && c.telefono.includes(search)) ||
                (c.ruc && c.ruc.includes(search))
            );
        }
        filtered.sort((a, b) => b.id - a.id);

        tbody.innerHTML = '';
        filtered.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.id}</strong></td>
                <td>${c.nombre}</td>
                <td>${c.email || '-'}</td>
                <td>${c.telefono || '-'}</td>
                <td>${c.ruc || '-'}</td>
                <td>${c.created_at ? c.created_at.split('T')[0] : '-'}</td>
                <td>
                    <button class="action-btn edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        clienteCountSpan.textContent = filtered.length;
        updateSummaryCards();

        // Eventos de acciones
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                openEditModal(id);
            });
        });
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Eliminar el cliente #' + id + '?')) {
                    deleteCliente(id);
                }
            });
        });
    }

    // --- Actualizar tarjetas de resumen ---
    function updateSummaryCards() {
        totalClientesSpan.textContent = clientes.length;

        const hoy = new Date();
        const mes = hoy.getMonth();
        const año = hoy.getFullYear();
        const clientesMes = clientes.filter(c => {
            if (!c.created_at) return false;
            const fecha = new Date(c.created_at);
            return fecha.getMonth() === mes && fecha.getFullYear() === año;
        });
        clientesMesSpan.textContent = clientesMes.length;

        const conEmail = clientes.filter(c => c.email && c.email.trim() !== '');
        clientesEmailSpan.textContent = conEmail.length;

        const conTelefono = clientes.filter(c => c.telefono && c.telefono.trim() !== '');
        clientesTelefonoSpan.textContent = conTelefono.length;

        const conRUC = clientes.filter(c => c.ruc && c.ruc.trim() !== '');
        if (clientesRUCSpan) clientesRUCSpan.textContent = conRUC.length;
    }

    // --- CRUD ---
    async function addCliente(data) {
        const result = await createCliente(data);
        if (result) loadClientes();
    }

    async function updateCliente(id, data) {
        const result = await updateCliente(id, data);
        if (result) loadClientes();
    }

    async function deleteCliente(id) {
        const result = await deleteCliente(id);
        if (result) loadClientes();
    }

    // --- Formulario ---
    function getFormData() {
        return {
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            ruc: document.getElementById('ruc').value.trim()
        };
    }

    async function submitForm(e) {
        e.preventDefault();
        const data = getFormData();
        if (!data.nombre) {
            alert('El nombre es obligatorio.');
            return;
        }
        const editId = parseInt(editIdInput.value);
        if (editId) {
            await updateCliente(editId, data);
        } else {
            await addCliente(data);
        }
        closeModal();
    }

    // --- Modal ---
    function openAddModal() {
        modalTitle.textContent = 'Nuevo cliente';
        editIdInput.value = '';
        form.reset();
        modalOverlay.classList.add('open');
    }

    function openEditModal(id) {
        const cliente = clientes.find(c => c.id === id);
        if (!cliente) return;
        modalTitle.textContent = 'Editar cliente';
        editIdInput.value = id;
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('telefono').value = cliente.telefono || '';
        document.getElementById('ruc').value = cliente.ruc || '';
        modalOverlay.classList.add('open');
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        form.reset();
        editIdInput.value = '';
    }

    // --- Eventos comunes (sidebar, perfil, notificaciones, logout, export) ---
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
    // EXPORTACIÓN A CSV Y PDF
    // ============================================
    function exportarClientes() {
        const tbody = document.getElementById('clienteTableBody');
        const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'RUC', 'Fecha Registro'];
        const rows = tbody.querySelectorAll('tr');
        const data = [];
        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = {};
                cells.forEach((cell, index) => {
                    rowData[headers[index] || 'col' + index] = cell.textContent.trim();
                });
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            alert('No hay clientes para exportar.');
            return;
        }

        // CSV
        const csv = convertToCSV(data, headers);
        downloadFile(csv, 'clientes.csv', 'text/csv;charset=utf-8;');

        // PDF
        generatePDF(data, headers, 'clientes');
    }

    // Funciones auxiliares de exportación
    function convertToCSV(data, headers) {
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            const values = headers.map(h => {
                let val = row[h] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += values.join(',') + '\n';
        });
        return csv;
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob(['\uFEFF' + content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function generatePDF(data, headers, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text('Reporte de ' + filename.charAt(0).toUpperCase() + filename.slice(1), 14, 22);
        doc.setFontSize(10);
        doc.text('Fecha: ' + new Date().toLocaleDateString(), 14, 30);

        const tableData = data.map(row => headers.map(h => row[h] || ''));
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [26, 42, 58] }
        });

        doc.save(filename + '.pdf');
    }

    // Asignar evento al botón Exportar
    document.getElementById('exportBtn')?.addEventListener('click', exportarClientes);

    // --- Inicialización ---
    setupCommon();
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

    loadClientes();

});