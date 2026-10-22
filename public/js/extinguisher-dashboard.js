const token = localStorage.getItem('admonitio_token');
const coordDataStr = localStorage.getItem('coordinator_data');

if (!token || !coordDataStr) {
    window.location.href = '/login';
}

let coordinator = JSON.parse(coordDataStr || '{}');
let globalExtinguishers = [];

function updateCoordinatorHeader() {
    const avatarEl = document.getElementById('coordAvatar');
    if (avatarEl) {
        avatarEl.textContent = coordinator.name 
            ? coordinator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
            : 'TN';
    }
}
updateCoordinatorHeader();

document.getElementById('currentDateText').textContent = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
});

// 1. Fetch Extinguisher Dashboard Data
async function fetchExtinguishers() {
    try {
        const response = await fetch('/api/extinguishers/dashboard', {
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

        globalExtinguishers = data.devices;

        // Render Stats
        document.getElementById('statTotalExtinguishers').textContent = data.stats.totalExtinguishers;
        document.getElementById('statValid').textContent = data.stats.validCount;
        document.getElementById('statCritical').textContent = data.stats.criticalCount + data.stats.expiredCount;
        document.getElementById('deviceCountBadge').textContent = `${data.devices.length} Cylinders Found`;

        // Render Cards
        renderExtinguishers(data.devices);

    } catch (err) {
        console.error('Error loading extinguisher dashboard:', err);
    }
}

function renderExtinguishers(devices) {
    const container = document.getElementById('extinguishersContainer');
    container.innerHTML = '';

    devices.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';

        const expFormatted = dev.expiryDate 
            ? new Date(dev.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Not Configured';

        let statusBadgeText = 'Certified';
        if (dev.status === 'EXPIRED') {
            statusBadgeText = 'Expired';
        } else if (dev.status === 'CRITICAL') {
            statusBadgeText = `${dev.daysRemaining} Days Left`;
        }

        card.innerHTML = `
            <div class="device-card-top ${dev.status !== 'VALID' ? 'has-issue' : ''}">
                <div class="device-card-top-row">
                    <span class="badge-status ${dev.status}">${statusBadgeText}</span>
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${dev.deviceCode}</span>
                </div>
                <h3 class="device-card-name" style="margin-top: 6px;">${dev.name}</h3>
                <div class="device-card-location">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${dev.location}
                </div>
            </div>

            <div class="device-card-body">
                <div class="fe-spec-strip">
                    <div class="fe-spec-item">
                        <span class="fe-spec-label">Type</span>
                        <span class="fe-spec-val">${dev.extinguisherType || 'ABC Dry Powder'}</span>
                    </div>
                    <div class="fe-spec-item">
                        <span class="fe-spec-label">Capacity</span>
                        <span class="fe-spec-val">${dev.capacity || '6 KG'}</span>
                    </div>
                </div>

                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                    <strong>Expiry Date:</strong> ${expFormatted}
                </div>

                <div class="fe-card-footer">
                    <button class="btn-update-date" onclick="openSingleDateModal('${dev.deviceCode}', '${dev.name}', '${dev.expiryDate ? dev.expiryDate.split('T')[0] : ''}')">
                        ✏️ Edit Date
                    </button>
                    <button class="btn-quick-renew" onclick="quickRenewOneYear('${dev.deviceCode}')">
                         Replace (+1 Yr)
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 2. Quick One-Click Renew (+1 Year) from Dashboard
async function quickRenewOneYear(deviceCode) {
    if (!confirm(`Mark ${deviceCode} as certified and extend its expiry by +1 year from today?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/extinguishers/confirm-replaced?deviceCode=${deviceCode}`);
        if (res.ok) {
            showToast(`${deviceCode} renewed for +1 year!`);
            fetchExtinguishers();
        } else {
            alert('Failed to renew extinguisher.');
        }
    } catch (e) {
        console.error(e);
        alert('Server error renewing extinguisher.');
    }
}

// 3. Single Date Modal
function openSingleDateModal(deviceCode, name, currentDateStr) {
    document.getElementById('editDeviceCode').value = deviceCode;
    document.getElementById('singleDateHeading').textContent = `Set Expiry for ${name}`;
    document.getElementById('singleDateInput').value = currentDateStr || '';
    document.getElementById('singleDateModal').classList.add('active');
}

function closeSingleDateModal() {
    document.getElementById('singleDateModal').classList.remove('active');
}

async function handleSingleDateSubmit(e) {
    e.preventDefault();
    const deviceCode = document.getElementById('editDeviceCode').value;
    const expiryDate = document.getElementById('singleDateInput').value;

    try {
        const res = await fetch('/api/extinguishers/update-expiry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ deviceCode, expiryDate })
        });

        const data = await res.json();
        if (data.success) {
            closeSingleDateModal();
            showToast(`Expiry updated for ${deviceCode}!`);
            fetchExtinguishers();
        } else {
            alert(data.message || 'Error updating date');
        }
    } catch (err) {
        console.error(err);
    }
}

// 4. Bulk Date Modal
function openBulkDateModal() {
    document.getElementById('bulkDateModal').classList.add('active');
}

function closeBulkDateModal() {
    document.getElementById('bulkDateModal').classList.remove('active');
}

async function handleBulkDateSubmit(e) {
    e.preventDefault();
    const expiryDate = document.getElementById('bulkDateInput').value;

    if (!confirm(`Apply ${expiryDate} as the expiry date for ALL campus extinguishers?`)) {
        return;
    }

    try {
        const res = await fetch('/api/extinguishers/bulk-update-expiry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ expiryDate })
        });

        const data = await res.json();
        if (data.success) {
            closeBulkDateModal();
            showToast(data.message);
            fetchExtinguishers();
        } else {
            alert(data.message || 'Bulk update failed');
        }
    } catch (err) {
        console.error(err);
    }
}

// 5. Profile & Reminders
function openProfileModal() {
    document.getElementById('editEmailInput').value = coordinator.notificationEmail || coordinator.username || '';
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notificationEmail, newPassword })
        });

        const data = await res.json();
        if (data.success) {
            coordinator = { ...coordinator, ...data.coordinator };
            localStorage.setItem('coordinator_data', JSON.stringify(coordinator));
            updateCoordinatorHeader();
            closeProfileModal();
            showToast('Profile settings saved!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error(err);
    }
}

function showToast(text) {
    const toast = document.getElementById('dashToastBox');
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function logout() {
    localStorage.removeItem('admonitio_token');
    localStorage.removeItem('coordinator_data');
    window.location.href = '/login';
}

async function triggerManualReminderScan() {
    showToast('Running extinguisher expiry scan...');
    try {
        const res = await fetch('/api/reminders/trigger-extinguishers', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Extinguisher scan complete! Check console.');
        }
    } catch (e) {
        console.error(e);
    }
}

fetchExtinguishers();