// 1. Guard check: Require valid token
const token = localStorage.getItem('admonitio_token');
const coordDataStr = localStorage.getItem('coordinator_data');

if (!token || !coordDataStr) {
    window.location.href = '/login.html';
}

const coordinator = JSON.parse(coordDataStr || '{}');

// 2. Set Coordinator Details in Top Bar
document.getElementById('coordName').textContent = coordinator.name || 'Coordinator';
document.getElementById('coordRole').textContent = coordinator.roleTitle || 'Water Cooler Admin';
document.getElementById('coordAvatar').textContent = coordinator.name 
    ? coordinator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'AK';

document.getElementById('currentDateText').textContent = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
});

// 3. Fetch Dashboard Data from Backend
async function fetchDashboard() {
    try {
        const response = await fetch('/api/devices/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();
        if (!data.success) return;

        // Render Stats
        document.getElementById('statTotalCoolers').textContent = data.stats.totalDevices;
        document.getElementById('statActiveTickets').textContent = data.stats.activeTicketsCount;
        document.getElementById('statInMaintenance').textContent = data.stats.inMaintenanceCount;
        document.getElementById('statResolvedTickets').textContent = data.stats.resolvedTicketsCount;
        document.getElementById('deviceCountBadge').textContent = `${data.devices.length} Devices Found`;

        // Render Device Cards
        renderDevices(data.devices);

    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function renderDevices(devices) {
    const container = document.getElementById('devicesContainer');
    container.innerHTML = '';

    devices.forEach(device => {
        const activeCount = device.tickets.filter(t => t.status === 'OPEN' || t.status === 'UNDER_REVIEW').length;
        const resolvedCount = device.tickets.filter(t => t.status === 'RESOLVED').length;
        const inMaintCount = device.tickets.filter(t => t.status === 'IN_PROGRESS').length;

        let statusText = 'Online';
        let statusStyle = 'color: #34D399;';
        let isCritical = false;

        if (activeCount > 0) {
            statusText = 'Issue Reported';
            statusStyle = 'color: #FECACA;';
            isCritical = true;
        } else if (inMaintCount > 0 || device.filterHealth < 20) {
            statusText = 'Maintenance';
            statusStyle = 'color: #FBBF24;';
        }

        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
            <div class="device-card-top ${isCritical ? 'has-issue' : ''}">
                <div class="device-card-top-row">
                    <div class="device-type-tag">💧 Water Cooler</div>
                    <div class="device-health-label" style="${statusStyle}">${statusText}</div>
                </div>
                <h3 class="device-card-name">${device.name}</h3>
                <div class="device-card-location">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${device.location}
                </div>
            </div>
            <div class="device-card-body">
                <div class="device-card-specs">
                    <div class="mini-stat"><div class="ms-label">Model</div><div class="ms-value">${device.model}</div></div>
                    <div class="mini-stat"><div class="ms-label">Filter</div><div class="ms-value" style="${device.filterHealth < 20 ? 'color: var(--danger);' : ''}">${device.filterHealth}%</div></div>
                    <div class="mini-stat"><div class="ms-label">Code</div><div class="ms-value">${device.deviceCode}</div></div>
                </div>
                <div class="device-ticket-summary">
                    <div class="ticket-count-group">
                        <div><span class="tc-dot active"></span>${activeCount} Active</div>
                        <div><span class="tc-dot resolved"></span>${resolvedCount} Resolved</div>
                    </div>
                    <a href="/ticket-detail?code=${device.deviceCode}" class="view-device-btn">
                        Manage &rarr;
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function logout() {
    localStorage.removeItem('admonitio_token');
    localStorage.removeItem('coordinator_data');
    window.location.href = '/login.html';
}

// Initial load
fetchDashboard();