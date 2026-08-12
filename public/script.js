// ============================================
// public/script.js - Dashboard (con gráfico de doble barra y compras reales)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // --- Actualizar nombre del usuario en el topbar ---
    function updateUserName() {
        const user = getCurrentUser();
        const userNameSpan = document.getElementById('userNameDisplay');
        if (user && user.nombre && userNameSpan) {
            userNameSpan.textContent = user.nombre.toUpperCase();
        }
    }

    // --- Mostrar/ocultar spinner de carga ---
    function showLoading(show) {
        const kpiValues = document.querySelectorAll('.kpi-value');
        kpiValues.forEach(el => {
            if (show) {
                el.textContent = '...';
            }
        });
    }

    // --- Cargar datos para el dashboard ---
    async function loadDashboardData() {
        showLoading(true);

        try {
            let pedidos = [];
            let productos = [];
            let clientes = [];
            let compras = [];

            // Obtener datos en paralelo
            const [pedidosData, productosData, clientesData, comprasData] = await Promise.all([
                getPedidos(),
                getProductos(),
                getClientes(),
                getCompras()
            ]);

            pedidos = Array.isArray(pedidosData) ? pedidosData : [];
            productos = Array.isArray(productosData) ? productosData : [];
            clientes = Array.isArray(clientesData) ? clientesData : [];
            compras = Array.isArray(comprasData) ? comprasData : [];

            console.log('📊 Dashboard - Datos cargados:');
            console.log('Pedidos:', pedidos.length);
            console.log('Productos:', productos.length);
            console.log('Clientes:', clientes.length);
            console.log('Compras:', compras.length);

            // --- Actualizar KPI ---
            const pedidosCompletados = pedidos.filter(p => p.estado === 'completado' || p.estado === 'enviado');
            const totalVentas = pedidosCompletados.reduce((acc, p) => {
                return acc + (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
            }, 0);

            document.getElementById('kpiTotalVentas').textContent = '$ ' + totalVentas.toFixed(2);
            document.getElementById('kpiTotalPedidos').textContent = pedidos.length;
            document.getElementById('kpiTotalClientes').textContent = clientes.length;
            const ingresosNetos = totalVentas * 0.7; // Margen estimado del 30%
            document.getElementById('kpiIngresosNetos').textContent = '$ ' + ingresosNetos.toFixed(2);

            // --- Tabla de pedidos recientes ---
            const tbody = document.getElementById('recentOrdersBody');
            tbody.innerHTML = '';
            if (pedidos && pedidos.length > 0) {
                const recent = [...pedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
                recent.forEach(p => {
                    const total = (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
                    const estadoClass = {
                        pendiente: 'pending',
                        completado: 'completed',
                        cancelado: 'cancelled',
                        enviado: 'shipped'
                    }[p.estado] || '';
                    const estadoLabel = p.estado || 'Desconocido';
                    let productoLabel = 'Varios';
                    if (p.items && p.items.length === 1) {
                        const prodId = p.items[0].producto_id;
                        const prod = productos.find(pr => pr.id === prodId);
                        productoLabel = prod ? prod.nombre : 'Producto #' + prodId;
                    } else if (p.items && p.items.length > 1) {
                        productoLabel = p.items.length + ' productos';
                    }
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#${p.id}</td>
                        <td>${getClienteNombre(p.cliente_id, clientes)}</td>
                        <td>${productoLabel}</td>
                        <td>${p.fecha}</td>
                        <td>$${total.toFixed(2)}</td>
                        <td><span class="status ${estadoClass}">${estadoLabel}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay pedidos recientes</td></tr>';
            }

            // --- Actividad reciente ---
            const activityList = document.getElementById('activityList');
            if (pedidos.length > 0) {
                const recent = [...pedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 3);
                activityList.innerHTML = '';
                recent.forEach(p => {
                    const total = (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <i class="fas fa-check-circle green"></i>
                        <div>
                            <strong>Pedido #${p.id}</strong> - $${total.toFixed(2)}
                            <span class="time">${p.fecha}</span>
                        </div>
                    `;
                    activityList.appendChild(li);
                });
                if (recent.length < 3) {
                    const li = document.createElement('li');
                    li.innerHTML = `<i class="fas fa-info-circle blue"></i><div><strong>Sin más actividad reciente</strong><span class="time">--</span></div>`;
                    activityList.appendChild(li);
                }
            } else {
                activityList.innerHTML = `<li><i class="fas fa-info-circle blue"></i><div><strong>No hay actividad reciente</strong><span class="time">--</span></div></li>`;
            }

            // --- GRÁFICO DE VENTAS Y COMPRAS MENSUALES (DOBLE BARRA) ---
            const ventasPorMes = new Array(12).fill(0);
            const comprasPorMes = new Array(12).fill(0);
            const añoActual = new Date().getFullYear();

            // Ventas (pedidos completados/enviados)
            pedidos.filter(p => p.estado === 'completado' || p.estado === 'enviado').forEach(p => {
                const fecha = new Date(p.fecha);
                if (fecha.getFullYear() === añoActual) {
                    const mes = fecha.getMonth();
                    const total = (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
                    ventasPorMes[mes] += total;
                }
            });

            // Compras (usando el total de la tabla compras)
            compras.forEach(c => {
                const fecha = new Date(c.fecha);
                if (fecha.getFullYear() === añoActual) {
                    const mes = fecha.getMonth();
                    const total = parseFloat(c.total) || 0; // Asegurar número
                    comprasPorMes[mes] += total;
                }
            });

            const maxValor = Math.max(
                Math.max(...ventasPorMes, 0),
                Math.max(...comprasPorMes, 0),
                1
            );

            // Generar las barras si no existen
            const barChart = document.getElementById('barChart');
            if (barChart.children.length === 0) {
                const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                meses.forEach((mes, index) => {
                    const item = document.createElement('div');
                    item.className = 'bar-item';
                    item.dataset.month = index;
                    const group = document.createElement('div');
                    group.className = 'bar-group';
                    const barVenta = document.createElement('div');
                    barVenta.className = 'bar bar-venta';
                    barVenta.style.height = '0%';
                    const barCompra = document.createElement('div');
                    barCompra.className = 'bar bar-compra';
                    barCompra.style.height = '0%';
                    group.appendChild(barVenta);
                    group.appendChild(barCompra);
                    item.appendChild(group);
                    const span = document.createElement('span');
                    span.textContent = mes;
                    item.appendChild(span);
                    barChart.appendChild(item);
                });
            }

            const barItems = document.querySelectorAll('.bar-item');
            barItems.forEach((item, index) => {
                // Asegurar que venta y compra sean números
                const venta = Number(ventasPorMes[index]) || 0;
                const compra = Number(comprasPorMes[index]) || 0;
                const barVenta = item.querySelector('.bar-venta');
                const barCompra = item.querySelector('.bar-compra');
                if (barVenta) {
                    const pctVenta = (venta / maxValor) * 100;
                    barVenta.style.height = Math.max(pctVenta, 5) + '%';
                }
                if (barCompra) {
                    const pctCompra = (compra / maxValor) * 100;
                    barCompra.style.height = Math.max(pctCompra, 5) + '%';
                }
                item.title = `Ventas: $${venta.toFixed(2)} | Compras: $${compra.toFixed(2)}`;
            });

            // --- Actualizar leyenda del gráfico (si existe) ---
            const legendContainer = document.getElementById('chartLegend');
            if (legendContainer) {
                legendContainer.innerHTML = `
                    <span style="display:inline-block; margin-right:1rem;">
                        <span style="display:inline-block; width:12px; height:12px; background:var(--accent); border-radius:2px;"></span> Ventas
                    </span>
                    <span style="display:inline-block;">
                        <span style="display:inline-block; width:12px; height:12px; background:#38a169; border-radius:2px;"></span> Compras
                    </span>
                `;
            }

        } catch (error) {
            console.error('Error general cargando dashboard:', error);
            document.querySelectorAll('.kpi-value').forEach(el => el.textContent = 'Error');
        } finally {
            showLoading(false);
        }
    }

    // --- Obtener nombre de cliente ---
    function getClienteNombre(id, clientes) {
        if (!clientes || clientes.length === 0) return 'Cliente #' + id;
        const c = clientes.find(cl => cl.id === id);
        return c ? c.nombre : 'Cliente #' + id;
    }

    // --- Sidebar y topbar común ---
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

    // --- Inicialización ---
    setupCommon();
    updateUserName();
    loadDashboardData();

    console.log('✅ Dashboard cargado correctamente.');
});