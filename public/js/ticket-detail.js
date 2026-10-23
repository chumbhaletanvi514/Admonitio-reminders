let coordinator = {};
const urlParams = new URLSearchParams(window.location.search);
const deviceCode = urlParams.get('code') || 'WC-A3-042';

let currentTicket = null;
let completedSteps = [];

// 1. Session verification & Header population
async function initTicketPage() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        coordinator = data.coordinator;
        updateCoordinatorDisplay();

        loadWorkflowData();
    } catch (err) {
        window.location.href = '/login';
    }
}

function updateCoordinatorDisplay() {
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

async function loadWorkflowData() {
    try {
        const res = await fetch(`/api/devices/detail/${deviceCode}`);

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        if (!data.success) return;

        const coolerTitleEl = document.getElementById('coolerTitle');
        if (coolerTitleEl) coolerTitleEl.textContent = `${data.device.name} (${data.device.deviceCode})`;

        const activeTickets = data.allActiveTickets || (data.activeTicket ? [data.activeTicket] : []);
        renderComplaintsList(activeTickets);

        currentTicket = data.activeTicket;
        const resetBtn = document.getElementById('btnResetCooler');

        if (!currentTicket) {
            document.getElementById('ticketDetailSubtitle').textContent = 'All cooler maintenance issues are currently resolved.';
            if (resetBtn) resetBtn.style.display = 'none';
            completedSteps = [];
            updateStepsUI();
            return;
        }

        document.getElementById('ticketDetailSubtitle').textContent = 
            `${activeTickets.length} active complaint${activeTickets.length > 1 ? 's' : ''} reported. Complete the 4 steps to dispatch technician.`;
        if (resetBtn) resetBtn.style.display = 'inline-flex';

        completedSteps = currentTicket.completedSteps || [];
        updateStepsUI();

    } catch (err) {
        console.error('Error fetching workflow:', err);
    }
}

function renderComplaintsList(tickets) {
    const container = document.getElementById('complaintsContainer');
    const countBadge = document.getElementById('activeComplaintsCount');
    if (!container) return;

    container.innerHTML = '';
    countBadge.textContent = `${tickets.length} Pending Issue${tickets.length !== 1 ? 's' : ''}`;

    if (tickets.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--text-muted); font-size: 14px;">
                 No pending complaints! This water cooler is running cleanly.
            </div>
        `;
        return;
    }

    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'complaint-item-card';
        const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        card.innerHTML = `
            <div class="c-item-top">
                <span class="c-id">${ticket.ticketNumber}</span>
                <span class="c-sev ${ticket.severity}">${ticket.severity}</span>
            </div>
            <div class="c-cat">${ticket.category}</div>
            <div class="c-spec">${ticket.specification}</div>
            <div class="c-time">Logged: ${formattedDate}</div>
        `;
        container.appendChild(card);
    });
}

function updateStepsUI() {
    const totalDone = completedSteps.length;
    document.getElementById('completionStatusPill').textContent = `${totalDone} of 4 Steps Completed`;

    [1, 2, 3, 4].forEach(stepNum => {
        const card = document.getElementById(`card-step-${stepNum}`);
        const statusText = document.getElementById(`status-step-${stepNum}`);

        if (card) {
            if (completedSteps.includes(stepNum)) {
                card.classList.add('completed');
                if (statusText) statusText.textContent = 'Completed ✓';
            } else {
                card.classList.remove('completed');
                if (statusText) statusText.textContent = 'Pending';
            }
        }
    });
}

async function handleStepOpen(stepNumber, dummyUrl) {
    window.open(dummyUrl, '_blank');

    try {
        const payload = {
            stepNumber: stepNumber,
            deviceCode: deviceCode
        };

        if (currentTicket && currentTicket.id) {
            payload.ticketId = currentTicket.id;
        }

        const res = await fetch('/api/devices/step-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            completedSteps = data.completedSteps || [];
            updateStepsUI();
            showStepChoiceModal(stepNumber);
        } else {
            console.error('Step update error:', data.message);
        }
    } catch (err) {
        console.error('Error recording step:', err);
    }
}

// RESET COOLER CYCLE: Marks all complaints resolved & stops reminders
async function handleResetCooler() {
    if (!confirm(`Mark all active complaints for ${deviceCode} as resolved and stop reminder emails?`)) {
        return;
    }

    try {
        const res = await fetch('/api/devices/reset-cooler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceCode: deviceCode })
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadWorkflowData();
        } else {
            alert(data.message || 'Failed to reset cooler');
        }
    } catch (e) {
        console.error('Reset connection error:', e);
        alert('Server connection error during reset.');
    }
}

function showStepChoiceModal(stepNumber) {
    const remaining = 4 - completedSteps.length;
    document.getElementById('modalHeading').textContent = `Step ${stepNumber} Completed!`;
    
    if (remaining === 0) {
        document.getElementById('modalMessage').textContent =
            'All 4 steps are complete! When the technician replaces/fixes the parts on-ground, click "Reset & Mark All Resolved" to complete the cycle.';
    } else {
        document.getElementById('modalMessage').textContent =
            `You finished step ${stepNumber}. ${remaining} step${remaining > 1 ? 's are' : ' is'} remaining. If you leave now, daily reminders will notify you of pending steps.`;
    }

    document.getElementById('stepChoiceModal').classList.add('active');
}

function handleLeaveProcess() {
    document.getElementById('stepChoiceModal').classList.remove('active');
    window.location.href = '/dashboard';
}

function handleGoAhead() {
    document.getElementById('stepChoiceModal').classList.remove('active');
}

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationEmail, newPassword })
        });

        const data = await res.json();
        if (data.success) {
            coordinator = { ...coordinator, ...data.coordinator };
            updateCoordinatorDisplay();
            closeProfileModal();
            alert('Profile updated successfully!');
        } else {
            alert(data.message || 'Update failed');
        }
    } catch (err) {
        console.error('Error saving profile:', err);
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
        window.location.href = '/login';
    }
}

// Start
initTicketPage();