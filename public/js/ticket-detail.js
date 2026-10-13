const token = localStorage.getItem('admonitio_token');
const coordDataStr = localStorage.getItem('coordinator_data');

if (!token || !coordDataStr) {
    window.location.href = '/login.html';
}

const coordinator = JSON.parse(coordDataStr || '{}');
document.getElementById('coordName').textContent = coordinator.name || 'Coordinator';
document.getElementById('coordAvatar').textContent = coordinator.name 
    ? coordinator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'AK';

const urlParams = new URLSearchParams(window.location.search);
const deviceCode = urlParams.get('code') || 'WC-A3-042';

let currentActiveTicket = null;

async function loadTicketData() {
    try {
        const res = await fetch(`/api/devices/detail/${deviceCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();
        if (!data.success) return;

        const dev = data.device;
        currentActiveTicket = data.activeTicket;

        document.getElementById('devModel').textContent = dev.model;
        document.getElementById('devFilter').textContent = `${dev.filterHealth}%`;
        document.getElementById('devCode').textContent = dev.deviceCode;
        document.getElementById('historySubtitle').textContent = `Activity records for ${dev.name} (${dev.location})`;

        renderActiveTicket(currentActiveTicket, dev);
        renderHistoryList(data.history);

    } catch (err) {
        console.error('Error fetching detail:', err);
    }
}

function renderActiveTicket(ticket, device) {
    const card = document.getElementById('issueCard');
    const header = document.getElementById('issueHeader');
    const title = document.getElementById('ticketTitle');
    const date = document.getElementById('ticketDate');
    const loc = document.getElementById('ticketLocation');
    const spec = document.getElementById('ticketSpecBox');
    const badge = document.getElementById('ticketSeverityBadge');
    const statusPill = document.getElementById('activeStatusPill');

    if (!ticket || ticket.status === 'RESOLVED') {
        card.className = 'active-issue-card all-clear';
        header.className = 'issue-card-header all-clear';
        title.textContent = 'No Pending Issues';
        date.textContent = 'System Healthy';
        loc.textContent = `${device.name} · ${device.location}`;
        spec.innerHTML = '<strong>Device is operational.</strong> All complaints resolved or no active tickets logged.';
        badge.style.display = 'none';
        statusPill.textContent = 'Status: Healthy';
        statusPill.style.color = '#059669';
        document.getElementById('actionMenu').style.display = 'none';
        return;
    }

    title.textContent = `Ticket #${ticket.ticketNumber}`;
    date.textContent = `Reported: ${new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    loc.textContent = `${device.name} · ${device.location}`;
    spec.innerHTML = `<strong>Category:</strong> ${ticket.category}<br><strong>Specification:</strong> ${ticket.specification}`;
    badge.textContent = ticket.severity;

    if (ticket.status === 'IN_PROGRESS') {
        card.className = 'active-issue-card in-progress';
        header.className = 'issue-card-header in-progress';
        badge.style.background = '#D97706';
        statusPill.textContent = 'Status: In Progress / Maintenance';
        statusPill.style.color = '#D97706';
    } else {
        card.className = 'active-issue-card';
        header.className = 'issue-card-header';
        badge.style.background = '#991B1B';
        statusPill.textContent = 'Status: Action Required';
        statusPill.style.color = '#991B1B';
    }
}

function renderHistoryList(history) {
    const container = document.getElementById('historyList');
    container.innerHTML = '';

    if (!history || history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:14px;">No past history recorded.</p>';
        return;
    }

    history.forEach(t => {
        const item = document.createElement('div');
        item.className = 'history-record-card';
        item.innerHTML = `
            <div>
                <div style="font-size:15px; font-weight:700; color:var(--text-main);">${t.category}</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:2px;">${t.specification}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Ref: ${t.ticketNumber}</div>
            </div>
            <div style="text-align:right;">
                <span class="history-ticket-tag" style="background:${t.status === 'RESOLVED' ? 'var(--success-light)' : 'var(--warning-light)'}; color:${t.status === 'RESOLVED' ? '#059669' : '#D97706'};">${t.status}</span>
                <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">${new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function executeAction(actionName, targetStatus) {
    if (!currentActiveTicket) return;

    try {
        const res = await fetch('/api/devices/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ticketId: currentActiveTicket.id,
                action: actionName,
                status: targetStatus
            })
        });

        const data = await res.json();
        if (data.success) {
            showToast(`${actionName}! Status updated.`);
            loadTicketData();
        } else {
            alert(data.message || 'Action failed');
        }
    } catch (e) {
        console.error(e);
        alert('Could not update action');
    }
}

function showToast(text) {
    const toast = document.getElementById('toastMsg');
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function logout() {
    localStorage.removeItem('admonitio_token');
    localStorage.removeItem('coordinator_data');
    window.location.href = '/login.html';
}

loadTicketData();