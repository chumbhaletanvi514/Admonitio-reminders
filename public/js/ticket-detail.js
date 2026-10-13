const token = localStorage.getItem('admonitio_token');
const coordDataStr = localStorage.getItem('coordinator_data');

if (!token || !coordDataStr) {
    window.location.href = '/login.html';
}

let coordinator = JSON.parse(coordDataStr || '{}');

function updateCoordinatorDisplay() {
    document.getElementById('coordName').textContent = coordinator.name || 'Coordinator';
    const email = coordinator.notificationEmail || coordinator.username || 'ashok.maintenance@college.edu';
    document.getElementById('coordEmail').textContent = `${email} ⚙️`;
    document.getElementById('coordAvatar').textContent = coordinator.name 
        ? coordinator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
        : 'AK';
}
updateCoordinatorDisplay();

const urlParams = new URLSearchParams(window.location.search);
const deviceCode = urlParams.get('code') || 'WC-A3-042';

let currentTicket = null;
let completedSteps = [];

async function loadWorkflowData() {
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

        currentTicket = data.activeTicket;
        if (!currentTicket) {
            document.getElementById('ticketCodeTitle').textContent = 'No Active Ticket';
            document.getElementById('ticketDetailSubtitle').textContent = 'All cooler maintenance issues are currently resolved.';
            return;
        }

        document.getElementById('ticketCodeTitle').textContent = `Ticket #${currentTicket.ticketNumber}`;
        document.getElementById('ticketDetailSubtitle').textContent = `Category: ${currentTicket.category} · Specification: ${currentTicket.specification}`;
        document.getElementById('severityBadge').textContent = `${currentTicket.severity} Severity`;

        completedSteps = currentTicket.completedSteps || [];
        updateStepsUI();

    } catch (err) {
        console.error('Error fetching workflow:', err);
    }
}

function updateStepsUI() {
    const totalDone = completedSteps.length;
    document.getElementById('completionStatusPill').textContent = `${totalDone} of 4 Steps Completed`;

    [1, 2, 3, 4].forEach(stepNum => {
        const card = document.getElementById(`card-step-${stepNum}`);
        const statusText = document.getElementById(`status-step-${stepNum}`);

        if (completedSteps.includes(stepNum)) {
            card.classList.add('completed');
            statusText.textContent = 'Completed ✓';
        } else {
            card.classList.remove('completed');
            statusText.textContent = 'Pending';
        }
    });
}

// When a coordinator clicks any of the 4 step buttons:
async function handleStepOpen(stepNumber, dummyUrl) {
    // 1. Open the form link in a new tab
    window.open(dummyUrl, '_blank');

    if (!currentTicket) return;

    // 2. Mark this step completed in the backend
    try {
        const res = await fetch('/api/devices/step-complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ticketId: currentTicket.id,
                stepNumber
            })
        });

        const data = await res.json();
        if (data.success) {
            completedSteps = data.completedSteps;
            updateStepsUI();

            // 3. Show popup modal asking: Leave Here vs. Go Ahead
            showStepChoiceModal(stepNumber);
        }
    } catch (err) {
        console.error('Error recording step:', err);
    }
}

function showStepChoiceModal(stepNumber) {
    const remaining = 4 - completedSteps.length;
    document.getElementById('modalHeading').textContent = `Step ${stepNumber} Completed!`;
    
    if (remaining === 0) {
        document.getElementById('modalMessage').textContent =
            'All 4 steps are now complete! In 7 days, a follow-up check will ask if this cooler is physically working.';
    } else {
        document.getElementById('modalMessage').textContent =
            `You have finished step ${stepNumber}. ${remaining} step${remaining > 1 ? 's are' : ' is'} remaining. If you leave now, daily reminders will notify you of pending steps.`;
    }

    document.getElementById('stepChoiceModal').classList.add('active');
}

// Left Modal Button: "Leave the process till here"
function handleLeaveProcess() {
    document.getElementById('stepChoiceModal').classList.remove('active');
    // Returns to dashboard overview
    window.location.href = '/dashboard.html';
}

// Right Modal Button: "Go Ahead"
function handleGoAhead() {
    document.getElementById('stepChoiceModal').classList.remove('active');
    // Stays on page so they can click other step cards
}

// PROFILE SETTINGS MODAL LOGIC
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

function logout() {
    localStorage.removeItem('admonitio_token');
    localStorage.removeItem('coordinator_data');
    window.location.href = '/login.html';
}

loadWorkflowData();