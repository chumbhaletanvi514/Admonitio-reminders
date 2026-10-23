let coordinator = {};
let globalDevices = [];

// 1. Session verification & Header population
async function initSession() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        coordinator = data.coordinator;
        updateCoordinatorHeader();

        const dateEl = document.getElementById('currentDateText');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        fetchDashboard();
    } catch (err) {
        window.location.href = '/login';
    }
}

function updateCoordinatorHeader() {
    const avatarEl = document.getElementById('coordAvatar');
    if (avatarEl && coordinator.name) {
        avatarEl.textContent = coordinator.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }
}

// 2. Fetch Dashboard Data from Backend (Cookies sent automatically)
async function fetchDashboard() {
    try {
        const response = await fetch('/api/devices/dashboard');

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (!data.success) return;

        globalDevices = data.devices;

        // Render 3 Stats
        document.getElementById('statTotalCoolers').textContent = data.stats.totalDevices;
        document.getElementById('statActiveTickets').textContent = data.stats.activeTicketsCount;
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
        const activeCount = device.tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'STEPS_COMPLETED').length;
        const resolvedCount = device.tickets.filter(t => t.status === 'RESOLVED').length;

        const hasActiveIssue = activeCount > 0;

        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
            <div class="device-card-top ${hasActiveIssue ? 'has-issue' : ''}">
                <div class="device-card-top-row">
                    ${hasActiveIssue ? '<div class="device-health-label" style="color: #FECACA;">Issue Reported</div>' : ''}
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

// 3. Direct Internal Issue Modal Handlers
function openDirectIssueModal() {
    const select = document.getElementById('directDeviceSelect');
    if (select) {
        select.innerHTML = globalDevices.map(d => `<option value="${d.deviceCode}">${d.name} (${d.deviceCode})</option>`).join('');
    }
    document.getElementById('directIssueModal').classList.add('active');
}

function closeDirectIssueModal() {
    document.getElementById('directIssueModal').classList.remove('active');
}

async function handleDirectIssueSubmit(e) {
    e.preventDefault();
    const deviceCode = document.getElementById('directDeviceSelect').value;
    const category = document.getElementById('directCategorySelect').value;
    const specification = document.getElementById('directSpecInput').value.trim();
    const severity = document.getElementById('directSeveritySelect').value;

    try {
        const res = await fetch('/api/devices/direct-complaint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceCode, category, specification, severity })
        });

        const data = await res.json();
        if (data.success) {
            closeDirectIssueModal();
            showToast(`Complaint logged for ${deviceCode}!`);
            fetchDashboard();
        } else {
            alert(data.message || 'Failed to create complaint');
        }
    } catch (err) {
        console.error(err);
        alert('Server error creating complaint.');
    }
}

// 4. Profile Modal Handlers
function openProfileModal() {
    const currentMail = coordinator.notificationEmail || coordinator.username || '';
    document.getElementById('editEmailInput').value = currentMail;
    document.getElementById('editPasswordInput').value = '';
    document.getElementById('profileSettingsModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileSettingsModal').classList.remove('active');
}

async function handleProfileSave(e) {
    e.preventDefault();
    const notificationEmail = document.getElementById('editEmailInput').value;
    const newPassword = document.getElementById('editPasswordInput').value;

    try {
        const res = await fetch('/api/devices/profile-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationEmail, newPassword })
        });

        const data = await res.json();
        if (data.success) {
            coordinator = { ...coordinator, ...data.coordinator };
            updateCoordinatorHeader();
            closeProfileModal();
            showToast('Profile settings saved successfully!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error('Error saving profile:', err);
    }
}

function showToast(text) {
    const toast = document.getElementById('dashToastBox');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
        window.location.href = '/login';
    }
}

async function triggerManualReminderScan() {
    showToast('Running water cooler reminder scan...');
    try {
        const res = await fetch('/api/reminders/trigger-water-coolers', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Water cooler scan complete! Check console.');
        }
    } catch (e) {
        console.error(e);
    }
}

// Start
initSession();