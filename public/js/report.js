const ISSUE_SPECIFICATIONS = {
    'cooling': {
        title: 'Cooling Fault',
        specs: [
            'Water is room temperature / warm',
            'Motor running continuously but not chilling',
            'Cooling switch tripped / not activating',
            'Water cooler exterior feels unusually hot'
        ]
    },
    'leakage': {
        title: 'Water Leakage',
        specs: [
            'Water pooling on floor beneath cooler',
            'Continuous drip from the cold tap',
            'Inlet water pipe leaking behind unit',
            'Drain tray overflowing / clogged'
        ]
    },
    'power': {
        title: 'Power & Electrical',
        specs: [
            'Power indicator lights completely off',
            'Trips electrical MCB upon usage',
            'Buzzing electrical noise with no cooling output',
            'Burnt smell or loose wall socket connection'
        ]
    },
    'dispenser': {
        title: 'No Water Flow',
        specs: [
            'No water comes out when push tap is pressed',
            'Extremely low flow / slow trickle',
            'Push button stuck in closed position',
            'Main supply line dry'
        ]
    },
    'quality': {
        title: 'Water Quality',
        specs: [
            'Muddy, yellow, or cloudy water coming out',
            'Foul chlorine or unpleasant odor',
            'Metallic or bitter taste in water',
            'Sediment or particles visible in cup'
        ]
    },
    'physical': {
        title: 'Physical Damage',
        specs: [
            'Tap handle broken or snapped off',
            'Drip tray cracked, loose, or displaced',
            'Outer metal panel detached or exposed',
            'Top cover missing or unfastened'
        ]
    }
};

// URL query parameter parsing or default to WC-A3-042
const urlParams = new URLSearchParams(window.location.search);
const currentDeviceCode = urlParams.get('device') || 'WC-A3-042';

let currentCategory = 'cooling';
let selectedSpecification = ISSUE_SPECIFICATIONS['cooling'].specs[0];
let selectedSeverity = 'medium';
let loadedDevice = null;

// ==========================================
// 1. SINGLE-SELECTION: CATEGORY TILES
// ==========================================
function selectCategory(catKey, cardEl) {
    currentCategory = catKey;

    // Deselect all category tiles first
    document.querySelectorAll('.category-tile').forEach(tile => {
        tile.classList.remove('selected');
    });

    // Select only the clicked category tile
    if (cardEl) {
        cardEl.classList.add('selected');
    }

    // Refresh matching specifications for this category
    renderSpecifications(catKey);
}

// ==========================================
// 2. SINGLE-SELECTION: SEVERITY BUTTONS
// ==========================================
function selectSeverity(sevKey, btnEl) {
    selectedSeverity = sevKey;

    // Deselect all severity buttons first
    document.querySelectorAll('.severity-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Select only the clicked severity button
    if (btnEl) {
        btnEl.classList.add('selected');
    }
}

// ==========================================
// 3. RENDER SPECIFICATION CHIPS
// ==========================================
function renderSpecifications(categoryKey) {
    const catData = ISSUE_SPECIFICATIONS[categoryKey];
    if (!catData) return;

    const badge = document.getElementById('currentCategoryBadge');
    if (badge) {
        badge.textContent = catData.title;
    }

    const container = document.getElementById('specChipsContainer');
    if (!container) return;
    container.innerHTML = '';

    // Default to the first specification in the list
    selectedSpecification = catData.specs[0];

    catData.specs.forEach((specText, idx) => {
        const chip = document.createElement('div');
        chip.className = `spec-chip-item ${idx === 0 ? 'selected' : ''}`;
        
        chip.onclick = () => {
            // Deselect all sibling specification chips
            document.querySelectorAll('.spec-chip-item').forEach(c => c.classList.remove('selected'));
            // Select only clicked chip
            chip.classList.add('selected');
            selectedSpecification = specText;
        };

        chip.innerHTML = `
            <div class="spec-chip-radio"></div>
            <div class="spec-chip-label">${specText}</div>
        `;
        container.appendChild(chip);
    });
}

// ==========================================
// 4. FETCH LIVE DEVICE DATA FROM BACKEND
// ==========================================
async function loadDeviceData() {
    try {
        const res = await fetch(`/api/tickets/device/${currentDeviceCode}`);
        const data = await res.json();

        if (data.success && data.device) {
            loadedDevice = data.device;
            
            const nameEl = document.getElementById('deviceName');
            const locEl = document.getElementById('deviceLocation');
            const codeEl = document.getElementById('deviceCodeVal');
            const filterEl = document.getElementById('deviceFilterVal');
            const countEl = document.getElementById('pastTicketCountText');
            const histCodeEl = document.getElementById('historyDeviceCode');

            if (nameEl) nameEl.textContent = loadedDevice.name;
            if (locEl) locEl.textContent = loadedDevice.location;
            if (codeEl) codeEl.textContent = loadedDevice.deviceCode;
            if (filterEl) filterEl.textContent = `${loadedDevice.filterHealth}%`;
            if (countEl) countEl.textContent = `${loadedDevice.tickets.length} complaints recorded on this unit`;
            if (histCodeEl) histCodeEl.textContent = loadedDevice.deviceCode;

            renderHistory(loadedDevice.tickets);
        }
    } catch (e) {
        console.error('Failed to load device info:', e);
    }
}

// ==========================================
// 5. RENDER DEVICE HISTORY LIST
// ==========================================
function renderHistory(tickets) {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p style="font-size:14px; color:var(--text-muted); grid-column: span 2; text-align:center; padding: 32px;">No past maintenance logs found for this device.</p>';
        return;
    }

    tickets.forEach(t => {
        const item = document.createElement('div');
        item.className = 'history-ticket-card';
        
        const isResolved = t.status === 'RESOLVED';
        const tagBg = isResolved ? 'var(--success-light)' : 'var(--warning-light)';
        const tagColor = isResolved ? '#059669' : '#D97706';
        const tagBorder = isResolved ? 'var(--success-border)' : 'var(--warning-border)';

        item.innerHTML = `
            <div class="history-ticket-header">
                <span class="history-ticket-id">${t.ticketNumber}</span>
                <span class="history-ticket-tag" style="background:${tagBg}; color:${tagColor}; border:1px solid ${tagBorder};">${t.status}</span>
            </div>
            <div style="font-size:15px; font-weight:700; color:var(--text-main);">${t.category}</div>
            <div style="font-size:13px; color:var(--text-secondary);">${t.specification}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                Logged on: ${new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        `;
        container.appendChild(item);
    });
}

// ==========================================
// 6. SUBMIT COMPLAINT TICKET
// ==========================================
async function submitTicket() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="spin-animation" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.5;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        Transmitting Ticket...
    `;

    try {
        const res = await fetch('/api/tickets/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceCode: currentDeviceCode,
                category: ISSUE_SPECIFICATIONS[currentCategory].title,
                specification: selectedSpecification,
                severity: selectedSeverity
            })
        });

        const data = await res.json();
        if (data.success && data.ticket) {
            document.getElementById('receiptTicketId').textContent = data.ticket.ticketNumber;
            document.getElementById('receiptDeviceLabel').textContent = loadedDevice ? loadedDevice.name : currentDeviceCode;
            document.getElementById('receiptCategory').textContent = data.ticket.category;
            document.getElementById('receiptSpecText').textContent = data.ticket.specification;

            switchView('view-confirmation');
            loadDeviceData(); // Re-fetch updated tickets
        } else {
            alert(data.message || 'Error creating ticket');
        }
    } catch (err) {
        console.error(err);
        alert('Server connection error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Submit Complaint Ticket
        `;
    }
}

// ==========================================
// 7. VIEW SWITCHING
// ==========================================
function switchView(viewId) {
    document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==========================================
// INITIAL SETUP ON PAGE LOAD
// ==========================================
renderSpecifications('cooling');
loadDeviceData();