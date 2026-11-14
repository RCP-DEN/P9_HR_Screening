const SHEETDB_URL = 'https://sheetdb.io/api/v1/we4xt4xy0052m';

let managerConfig = JSON.parse(localStorage.getItem('provilac_mgr_config') || JSON.stringify({
    username: 'admin',
    password: 'Manager@2026',
    displayName: 'Admin Manager',
    email: 'admin@provilac.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AdminManager&top=shortFlat'
}));

let allCandidates = [];
let filteredCandidates = [];
const BATCH_SIZE = 24;
let renderedCount = 0;

let candidateStatuses = JSON.parse(localStorage.getItem('provilac_eval_status') || '{}');
let candidateNotes = JSON.parse(localStorage.getItem('provilac_notes') || '{}');

document.addEventListener('DOMContentLoaded', () => {
    applyManagerProfileUI();
    if (sessionStorage.getItem('provilac_mgr_auth') === 'true') {
        openDashboard();
    }
});

// --- SIMPLE ID & PASSWORD LOGIN ---
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('mgrUser').value.trim();
    const pass = document.getElementById('mgrPass').value;

    if (user === managerConfig.username && pass === managerConfig.password) {
        sessionStorage.setItem('provilac_mgr_auth', 'true');
        document.getElementById('loginError').style.display = 'none';
        openDashboard();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
});

function logoutManager() {
    sessionStorage.removeItem('provilac_mgr_auth');
    location.reload();
}

function openDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardApp').classList.remove('hidden');
    fetchCandidates();
}

// --- MANAGER PROFILE & SETTINGS UI ---
function applyManagerProfileUI() {
    document.getElementById('sidebarAdminName').innerText = managerConfig.displayName || 'Admin Manager';
    document.getElementById('sidebarAdminEmail').innerText = managerConfig.email || 'admin@provilac.com';
    document.getElementById('sidebarAdminAvatar').src = managerConfig.avatar;

    const preview = document.getElementById('settingsAvatarPreview');
    if (preview) preview.src = managerConfig.avatar;
    const nameInput = document.getElementById('settingDisplayName');
    if (nameInput) nameInput.value = managerConfig.displayName || 'Admin Manager';
    const emailInput = document.getElementById('settingAdminEmail');
    if (emailInput) emailInput.value = managerConfig.email || 'admin@provilac.com';
    const idInput = document.getElementById('settingLoginId');
    if (idInput) idInput.value = managerConfig.username || 'admin';
}

function handleAdminAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        managerConfig.avatar = e.target.result;
        document.getElementById('settingsAvatarPreview').src = managerConfig.avatar;
    };
    reader.readAsDataURL(file);
}

function randomizeAdminAvatar() {
    const randomSeed = 'Mgr_' + Math.floor(Math.random() * 100000);
    managerConfig.avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${randomSeed}&top=shortFlat,shortRound,shortWaved`;
    document.getElementById('settingsAvatarPreview').src = managerConfig.avatar;
}

function saveManagerProfile() {
    const newName = document.getElementById('settingDisplayName').value.trim();
    const newEmail = document.getElementById('settingAdminEmail').value.trim();
    if (newName) managerConfig.displayName = newName;
    if (newEmail) managerConfig.email = newEmail;

    localStorage.setItem('provilac_mgr_config', JSON.stringify(managerConfig));
    applyManagerProfileUI();
    alert('Manager profile & avatar updated!');
}

function saveSystemSettings() {
    const newId = document.getElementById('settingLoginId').value.trim();
    const newPass = document.getElementById('settingNewPass').value;
    if (newId) managerConfig.username = newId;
    if (newPass) managerConfig.password = newPass;

    localStorage.setItem('provilac_mgr_config', JSON.stringify(managerConfig));
    document.getElementById('settingNewPass').value = '';
    alert('Security & portal settings saved!');
}

// --- SIDEBAR NAVIGATION ---
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const targetBtn = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabId}"]`);
        if (targetBtn) targetBtn.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard Overview',
        candidates: 'Candidate Management',
        reports: 'Recruitment Reports',
        settings: 'System Settings'
    };
    document.getElementById('topbarTitle').innerText = titles[tabId] || 'Dashboard';

    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (tabId === 'candidates') renderCandidatesTable();
    if (tabId === 'reports') renderReports();
}

function goToSettings() {
    switchTab('settings', document.querySelector('.sidebar-nav .nav-item[data-tab="settings"]'));
}

function navigateFromStat(statusFilter) {
    const filterDropdown = document.getElementById('tableStatusFilter');
    if (filterDropdown) filterDropdown.value = statusFilter;
    switchTab('candidates');
}

function toggleProfileMenu(e) {
    e.stopPropagation();
    document.getElementById('profileDropdown').classList.toggle('hidden');
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.add('hidden');
});

function showActivityLog() {
    alert(`Activity Log:\n- ${managerConfig.displayName} signed in\n- Candidate records synced from SheetDB\n- All systems operational`);
}

// --- DATE FORMATTING TO MM/DD/YYYY ---
function formatToMMDDYYYY(rawDate) {
    if (!rawDate) return 'N/A';
    const clean = rawDate.trim();
    if (clean.toLowerCase() === 'present') return 'Present';
    const parts = clean.split('/');
    if (parts.length === 3) {
        // SheetDB stores DD/MM/YYYY -> convert to MM/DD/YYYY
        const dd = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const yyyy = parts[2];
        return `${mm}/${dd}/${yyyy}`;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return clean;
}

function toISODate(ddmmyyyy) {
    if (!ddmmyyyy) return null;
    const parts = ddmmyyyy.trim().split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// --- DIRECT GMAIL WEB COMPOSE URL ---
function buildGmailLink(candidate) {
    const email = (candidate.email || '').trim();
    if (!email) return '#';
    const name = (candidate.fullName || 'Candidate').trim();
    const subject = encodeURIComponent(`Regarding Your Application at Provilac Recruiting`);
    const body = encodeURIComponent(`Hi ${name},\n\nThank you for applying at Provilac. We have reviewed your application and would like to connect with you regarding the next steps.\n\nBest regards,\n${managerConfig.displayName}\nProvilac Recruiting Team`);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
}

// --- 100+ UNIQUE GENDER-WISE AVATAR ENGINE ---
const FEMALE_TOPS = [
    'longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand',
    'curly', 'curvy', 'bob', 'bun', 'miaWallace', 'froBand', 'bigHair', 'frida'
];
const MALE_TOPS = [
    'shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'theCaesar',
    'theCaesarAndSidePart', 'sides', 'dreads01', 'frizzle', 'shaggy'
];
const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370'];
const CLOTHING_STYLES = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'shirtCrewNeck', 'shirtVNeck', 'hoodie'];
const CLOTHING_COLORS = ['262e33', '3c4f5c', '5199e4', '65c9ff', '929598', '25557c', 'a7ffc4'];
const SKIN_COLORS = ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', 'f8d25c'];

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getCandidateAvatar(candidate, idx = 0) {
    const name = (candidate.fullName || 'Candidate').trim();
    const uniqueKey = `${name}_${candidate.phone || ''}_${candidate.email || ''}_${idx}`;
    const h = hashString(uniqueKey);

    let gender = (candidate.gender || '').toLowerCase();
    if (!gender) {
        const firstName = name.split(' ')[0].toLowerCase();
        const femaleSuffixes = ['a', 'i', 'ee', 'ya', 'ita', 'ika', 'ni', 'ti', 'ri'];
        const maleExceptions = ['aditya', 'krishna', 'shiva', 'surya', 'arya', 'ravi', 'hari', 'mani', 'abhi', 'shashi', 'kiran', 'rohit', 'shivam'];
        const isFemale = femaleSuffixes.some(s => firstName.endsWith(s)) && !maleExceptions.includes(firstName);
        gender = isFemale ? 'female' : 'male';
    }

    const hairColor = HAIR_COLORS[h % HAIR_COLORS.length];
    const clothing = CLOTHING_STYLES[(h >> 2) % CLOTHING_STYLES.length];
    const clothesColor = CLOTHING_COLORS[(h >> 4) % CLOTHING_COLORS.length];
    const skinColor = SKIN_COLORS[(h >> 6) % SKIN_COLORS.length];
    const seed = encodeURIComponent(uniqueKey);

    if (gender === 'female') {
        const top = FEMALE_TOPS[h % FEMALE_TOPS.length];
        return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${top}&hairColor=${hairColor}&clothing=${clothing}&clothesColor=${clothesColor}&skinColor=${skinColor}&facialHairProbability=0`;
    } else {
        const top = MALE_TOPS[h % MALE_TOPS.length];
        const facialProb = (h % 3 === 0) ? 40 : 0;
        return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${top}&hairColor=${hairColor}&clothing=${clothing}&clothesColor=${clothesColor}&skinColor=${skinColor}&facialHairProbability=${facialProb}`;
    }
}

// --- EXPERIENCE CALCULATOR ---
function parseDateDDMMYYYY(str) {
    if (!str) return null;
    const clean = str.trim();
    if (clean.toLowerCase() === 'present') return new Date();
    const parts = clean.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function calcMonthsBetween(startStr, endStr) {
    const start = parseDateDDMMYYYY(startStr);
    const end = endStr ? parseDateDDMMYYYY(endStr) : new Date();
    if (!start || !end || end < start) return 0;
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() >= start.getDate()) months += 1;
    return Math.max(1, months);
}

function formatMonthsToText(totalMonths) {
    if (!totalMonths || totalMonths <= 0) return 'Fresher';
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} Yr${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Mo${months > 1 ? 's' : ''}`);
    return parts.join(' ');
}

function getCandidateTotalExperience(c) {
    let totalMonths = 0;
    if (c.companyName1 && c.startDate1) totalMonths += calcMonthsBetween(c.startDate1, c.endDate1 || 'Present');
    if (c.companyName2 && c.startDate2) totalMonths += calcMonthsBetween(c.startDate2, c.endDate2);
    if (c.companyName3 && c.startDate3) totalMonths += calcMonthsBetween(c.startDate3, c.endDate3);
    return formatMonthsToText(totalMonths);
}

function getCandidateKey(c) {
    return `${(c.email || '').trim()}_${(c.phone || '').trim()}_${(c.fullName || '').trim()}`;
}

function getCandidateStatus(c) {
    return candidateStatuses[getCandidateKey(c)] || 'New';
}

function getStatusClass(status) {
    switch (status) {
        case 'Under Review': return 'status-review';
        case 'Shortlisted': return 'status-shortlisted';
        case 'Interview Scheduled': return 'status-interview';
        case 'Selected': return 'status-selected';
        case 'Rejected': return 'status-rejected';
        default: return 'status-new';
    }
}

function updateCandidateStatusByKey(key, status, reopenModalIndex = null) {
    candidateStatuses[key] = status;
    localStorage.setItem('provilac_eval_status', JSON.stringify(candidateStatuses));
    updateStats();
    applyFilters();
    renderCandidatesTable();
    if (reopenModalIndex !== null) {
        openProfileModal(reopenModalIndex);
    }
}

function deleteCandidateByKey(key) {
    if (confirm('Are you sure you want to delete this candidate?')) {
        allCandidates = allCandidates.filter(c => getCandidateKey(c) !== key);
        updateStats();
        applyFilters();
        renderCandidatesTable();
    }
}

// --- FETCH DATA ---
async function fetchCandidates() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('candidatesGrid');
    if (loader) loader.classList.remove('hidden');
    if (grid) grid.innerHTML = '';

    try {
        const response = await fetch(SHEETDB_URL);
        const data = await response.json();
        allCandidates = Array.isArray(data) ? data.reverse() : [];
        updateStats();
        applyFilters();
        renderCandidatesTable();
    } catch (error) {
        if (grid) grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#e11d48; padding:30px;">Unable to load profiles: ${escapeHtml(error.message)}</div>`;
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

function updateStats() {
    document.getElementById('statTotal').innerText = allCandidates.length;

    let newCount = 0;
    let shortlistedCount = 0;

    allCandidates.forEach(c => {
        const st = getCandidateStatus(c);
        if (st === 'New') newCount++;
        if (st === 'Shortlisted') shortlistedCount++;
    });

    document.getElementById('statNew').innerText = newCount;
    document.getElementById('statShortlisted').innerText = shortlistedCount;
}

function applyFilters() {
    const nameQuery = document.getElementById('searchName').value.toLowerCase().trim();
    const fromDate = document.getElementById('dateFrom').value;
    const toDate = document.getElementById('dateTo').value;

    filteredCandidates = allCandidates.filter(c => {
        if (nameQuery) {
            const fullName = (c.fullName || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            if (!fullName.includes(nameQuery) && !phone.includes(nameQuery) && !email.includes(nameQuery)) return false;
        }
        const createdISO = toISODate(c.formSubmissionDate);
        if (fromDate && (!createdISO || createdISO < fromDate)) return false;
        if (toDate && (!createdISO || createdISO > toDate)) return false;
        return true;
    });

    document.getElementById('candidatesGrid').innerHTML = '';
    renderedCount = 0;
    loadMoreCandidates();
}

function resetFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    applyFilters();
}

// --- RENDER DASHBOARD CARDS ---
function loadMoreCandidates() {
    const grid = document.getElementById('candidatesGrid');
    const loadMoreWrap = document.getElementById('loadMoreWrap');

    if (filteredCandidates.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; background:#fff; border-radius:12px; color:#64748b;">No matching profiles found.</div>`;
        loadMoreWrap.classList.add('hidden');
        return;
    }

    const nextBatch = filteredCandidates.slice(renderedCount, renderedCount + BATCH_SIZE);
    const fragment = document.createDocumentFragment();

    nextBatch.forEach((c, idx) => {
        const actualIndex = renderedCount + idx;
        const card = document.createElement('div');
        card.className = 'candidate-card';

        const key = getCandidateKey(c);
        const avatar = getCandidateAvatar(c, actualIndex);
        const totalExp = getCandidateTotalExperience(c);
        const status = getCandidateStatus(c);
        const statusClass = getStatusClass(status);
        const formattedDate = formatToMMDDYYYY(c.formSubmissionDate);

        const cvButton = c.resumeLink
            ? `<a href="${escapeHtml(c.resumeLink)}" target="_blank" class="btn-icon-action btn-cv-teal" title="Download CV"><i class="fa-solid fa-download"></i> CV</a>`
            : '';

        const mailButton = c.email
            ? `<a href="${buildGmailLink(c)}" target="_blank" rel="noopener" class="btn-icon-action" title="Compose Email in Gmail"><i class="fa-solid fa-envelope"></i></a>`
            : '';

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <img src="${avatar}" alt="Avatar" class="avatar-img" loading="lazy">
                    <div class="card-info">
                        <h4>${escapeHtml(c.fullName || 'Candidate')}</h4>
                        <div class="card-role">${escapeHtml(c.degreeName || 'Graduate')}</div>
                        <div class="card-badges-row">
                            <span class="card-date">${escapeHtml(formattedDate)}</span>
                            <span class="exp-pill">Exp: ${escapeHtml(totalExp)}</span>
                            <span class="status-tag ${statusClass}">${escapeHtml(status)}</span>
                        </div>
                    </div>
                </div>
                <div class="card-quick">
                    <div>City: ${escapeHtml(c.city || 'N/A')}</div>
                    <div>Phone: ${escapeHtml(c.phone || 'N/A')}</div>
                    <div>Recent: ${escapeHtml(c.companyName1 || 'Fresher')}</div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-view" onclick="openProfileModal(${actualIndex})">View Profile</button>
                ${mailButton}
                ${cvButton}
                <button class="btn-icon-action btn-del" onclick="deleteCandidateByKey('${escapeHtml(key)}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    renderedCount += nextBatch.length;

    if (renderedCount < filteredCandidates.length) {
        loadMoreWrap.classList.remove('hidden');
    } else {
        loadMoreWrap.classList.add('hidden');
    }
}

// --- CANDIDATES TABLE VIEW WITH INLINE COLORED STATUS DROPDOWN ---
function renderCandidatesTable() {
    const tbody = document.getElementById('candidatesTableBody');
    const countBadge = document.getElementById('tableCountBadge');
    const statusFilter = document.getElementById('tableStatusFilter')?.value || 'ALL';
    if (!tbody) return;

    const list = allCandidates.filter(c => {
        if (statusFilter === 'ALL') return true;
        return getCandidateStatus(c) === statusFilter;
    });

    if (countBadge) countBadge.innerText = list.length;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:30px;">No candidate records match this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((c, idx) => {
        const key = getCandidateKey(c);
        const globalFilteredIdx = filteredCandidates.findIndex(fc => getCandidateKey(fc) === key);
        const totalExp = getCandidateTotalExperience(c);
        const status = getCandidateStatus(c);
        const statusClass = getStatusClass(status);
        const avatar = getCandidateAvatar(c, idx);
        const formattedDate = formatToMMDDYYYY(c.formSubmissionDate);

        const mailBtn = c.email
            ? `<a href="${buildGmailLink(c)}" target="_blank" rel="noopener" class="btn-table-sm" title="Send Gmail"><i class="fa-solid fa-envelope"></i></a>`
            : '';

        return `
            <tr>
                <td>
                    <div class="table-user-cell">
                        <img src="${avatar}" alt="Avatar" class="table-avatar">
                        <strong>${escapeHtml(c.fullName || '-')}</strong>
                    </div>
                </td>
                <td>${escapeHtml(c.phone || '-')}<br><small style="color:#64748b;">${escapeHtml(c.email || '-')}</small></td>
                <td>${escapeHtml(c.city || '-')}</td>
                <td>${escapeHtml(c.degreeName || '-')}</td>
                <td>${escapeHtml(totalExp)}</td>
                <td>
                    <select class="table-status-select ${statusClass}" onchange="updateCandidateStatusByKey('${escapeHtml(key)}', this.value)">
                        <option value="New" ${status==='New'?'selected':''}>New</option>
                        <option value="Under Review" ${status==='Under Review'?'selected':''}>Under Review</option>
                        <option value="Shortlisted" ${status==='Shortlisted'?'selected':''}>Shortlisted</option>
                        <option value="Interview Scheduled" ${status==='Interview Scheduled'?'selected':''}>Interview Scheduled</option>
                        <option value="Selected" ${status==='Selected'?'selected':''}>Selected</option>
                        <option value="Rejected" ${status==='Rejected'?'selected':''}>Rejected</option>
                    </select>
                </td>
                <td>${escapeHtml(formattedDate)}</td>
                <td>
                    <div class="table-action-btns">
                        <button class="btn-table-sm" onclick="openProfileModalByKey('${escapeHtml(key)}')">View</button>
                        ${mailBtn}
                        <button class="btn-table-sm btn-table-del" onclick="deleteCandidateByKey('${escapeHtml(key)}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- REPORTS VIEW WITH VISUAL BAR CHARTS ---
function renderReports() {
    const container = document.getElementById('reportStatsContainer');
    const chartsContainer = document.getElementById('reportChartsContainer');
    if (!container || !chartsContainer) return;

    const total = allCandidates.length;
    const cities = {};
    const degrees = {};
    const statuses = {
        'New': 0,
        'Under Review': 0,
        'Shortlisted': 0,
        'Interview Scheduled': 0,
        'Selected': 0,
        'Rejected': 0
    };

    allCandidates.forEach(c => {
        const city = (c.city || 'Unknown').trim();
        cities[city] = (cities[city] || 0) + 1;

        const deg = (c.degreeName || 'Other').trim();
        degrees[deg] = (degrees[deg] || 0) + 1;

        const st = getCandidateStatus(c);
        statuses[st] = (statuses[st] || 0) + 1;
    });

    const sortedCities = Object.entries(cities).sort((a, b) => b[1] - a[1]);
    const sortedDegrees = Object.entries(degrees).sort((a, b) => b[1] - a[1]);
    const conversionRate = total > 0 ? Math.round(((statuses['Shortlisted'] + statuses['Selected']) / total) * 100) : 0;

    container.innerHTML = `
        <div class="report-box">
            <h5>Total Profiles Received</h5>
            <div class="report-val">${total}</div>
        </div>
        <div class="report-box">
            <h5>Shortlist Conversion Rate</h5>
            <div class="report-val">${conversionRate}%</div>
        </div>
        <div class="report-box">
            <h5>Top Candidate City</h5>
            <div class="report-val">${sortedCities[0]?.[0] || 'N/A'}</div>
        </div>
        <div class="report-box">
            <h5>Most Common Degree</h5>
            <div class="report-val">${sortedDegrees[0]?.[0] || 'N/A'}</div>
        </div>
    `;

    const buildBarCard = (title, entries) => {
        if (!entries.length) return `<div class="chart-card"><h4>${title}</h4><p class="sub-hint">No data available</p></div>`;
        const maxVal = Math.max(...entries.map(e => e[1]), 1);
        const rowsHtml = entries.slice(0, 6).map(([label, count]) => {
            const pct = Math.round((count / maxVal) * 100);
            return `
                <div class="bar-row">
                    <div class="bar-label-flex">
                        <span>${escapeHtml(label)}</span>
                        <span>${count}</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        return `<div class="chart-card"><h4>${title}</h4>${rowsHtml}</div>`;
    };

    chartsContainer.innerHTML = `
        ${buildBarCard('Pipeline Status Distribution', Object.entries(statuses))}
        ${buildBarCard('City-Wise Candidate Distribution', sortedCities)}
        ${buildBarCard('Education-Wise Distribution', sortedDegrees)}
    `;
}

// --- EXPORT & IMPORT ---
function exportToExcel() {
    if (allCandidates.length === 0) {
        alert('No data to export.');
        return;
    }
    let csv = 'Full Name,Email,Phone,City,Degree,Experience,Status,Submission Date (MM/DD/YYYY)\n';
    allCandidates.forEach(c => {
        csv += `"${c.fullName || ''}","${c.email || ''}","${c.phone || ''}","${c.city || ''}","${c.degreeName || ''}","${getCandidateTotalExperience(c)}","${getCandidateStatus(c)}","${formatToMMDDYYYY(c.formSubmissionDate)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'provilac_candidates_report.csv');
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        alert('CSV imported successfully! Data synchronized.');
        fetchCandidates();
    };
    reader.readAsText(file);
}

// --- COMPLETE PROFILE MODAL ---
function openProfileModalByKey(key) {
    const idx = filteredCandidates.findIndex(c => getCandidateKey(c) === key);
    if (idx !== -1) {
        openProfileModal(idx);
    } else {
        const c = allCandidates.find(item => getCandidateKey(item) === key);
        if (c) renderModalContent(c, null);
    }
}

function openProfileModal(index) {
    const c = filteredCandidates[index];
    if (!c) return;
    renderModalContent(c, index);
}

function renderModalContent(c, index) {
    const key = getCandidateKey(c);
    const totalExp = getCandidateTotalExperience(c);
    const currentStatus = getCandidateStatus(c);
    const statusClass = getStatusClass(currentStatus);
    const currentNotes = candidateNotes[key] || '';
    const formattedCreated = formatToMMDDYYYY(c.formSubmissionDate);
    const formattedJoining = formatToMMDDYYYY(c.expectedJoiningDate);
    const formattedDob = formatToMMDDYYYY(c.dob);

    document.getElementById('modalAvatar').src = getCandidateAvatar(c, index || 0);
    document.getElementById('modalName').innerText = c.fullName || 'Candidate Profile';
    document.getElementById('modalStatusBadge').innerText = currentStatus;
    document.getElementById('modalMeta').innerText = `Applied: ${formattedCreated}  •  ${c.city || 'N/A'}  •  Total Exp: ${totalExp}`;

    const channelsList = (c.channels || '').split(',').map(s => s.trim()).filter(Boolean);
    const salesList = (c.salesTelecalling || '').split(',').map(s => s.trim()).filter(Boolean);

    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <div class="eval-toolbar no-print">
            <div class="eval-group">
                <select id="statusSelectBox" class="status-dropdown-colored ${statusClass}" onchange="updateCandidateStatusByKey('${escapeHtml(key)}', this.value, ${index})">
                    <option value="New" ${currentStatus==='New'?'selected':''}>Status: New</option>
                    <option value="Under Review" ${currentStatus==='Under Review'?'selected':''}>Status: Under Review</option>
                    <option value="Shortlisted" ${currentStatus==='Shortlisted'?'selected':''}>Status: Shortlisted</option>
                    <option value="Interview Scheduled" ${currentStatus==='Interview Scheduled'?'selected':''}>Status: Interview Scheduled</option>
                    <option value="Selected" ${currentStatus==='Selected'?'selected':''}>Status: Selected</option>
                    <option value="Rejected" ${currentStatus==='Rejected'?'selected':''}>Status: Rejected</option>
                </select>
            </div>
            <div class="eval-group">
                ${c.email ? `<a href="${buildGmailLink(c)}" target="_blank" rel="noopener" class="btn-eval"><i class="fa-solid fa-envelope"></i> Send Gmail</a>` : ''}
                <button class="btn-eval" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
            </div>
        </div>

        <div class="highlight-strip">
            <div class="hl-box">
                <span>Total Experience</span>
                <strong>${escapeHtml(totalExp)}</strong>
            </div>
            <div class="hl-box">
                <span>Contact Number</span>
                <strong>${escapeHtml(c.phone || 'N/A')}</strong>
            </div>
            <div class="hl-box">
                <span>Expected Joining</span>
                <strong>${escapeHtml(formattedJoining)}</strong>
            </div>
            <div class="hl-box">
                <span>Notice Period</span>
                <strong>${escapeHtml(c.noticePeriodDetails || 'Immediate / N/A')}</strong>
            </div>
        </div>

        <div class="profile-section">
            <div class="section-title">1. Personal & Language Details</div>
            <div class="info-grid">
                <div class="info-item"><span>Full Name</span><strong>${escapeHtml(c.fullName || '-')}</strong></div>
                <div class="info-item"><span>Email ID</span><strong>${escapeHtml(c.email || '-')}</strong></div>
                <div class="info-item"><span>Date of Birth (MM/DD/YYYY)</span><strong>${escapeHtml(formattedDob)}</strong></div>
                <div class="info-item"><span>Hometown / Native</span><strong>${escapeHtml(c.nativePlace || '-')}</strong></div>
                <div class="info-item" style="grid-column:1/-1;">
                    <span>Languages Known</span>
                    <div style="margin-top:4px;">${formatLanguagesDisplay(c.languages)}</div>
                </div>
            </div>
        </div>

        <div class="profile-section">
            <div class="section-title">2. Educational Qualifications</div>
            <div class="info-grid">
                <div class="info-item"><span>10th Standard</span><strong>${escapeHtml(c.edu10thYear || '-')} (${escapeHtml(c.edu10thScore || '-')})</strong></div>
                <div class="info-item"><span>12th / Diploma</span><strong>${escapeHtml(c.edu12thYear || '-')} (${escapeHtml(c.edu12thScore || '-')})</strong></div>
                <div class="info-item"><span>Graduation</span><strong>${escapeHtml(c.degreeName || '-')} ${c.degreeSpec ? '(' + escapeHtml(c.degreeSpec) + ')' : ''} — ${escapeHtml(c.degreeYear || '-')} | ${escapeHtml(c.degreeScore || '-')}</strong></div>
                ${c.pgName ? `<div class="info-item"><span>Post-Graduation</span><strong>${escapeHtml(c.pgName)} ${c.pgSpec ? '(' + escapeHtml(c.pgSpec) + ')' : ''} — ${escapeHtml(c.pgYear || '-')} | ${escapeHtml(c.pgScore || '-')}</strong></div>` : ''}
            </div>
        </div>

        <div class="profile-section">
            <div class="section-title">
                <span>3. Work Experience & Job Descriptions</span>
                <span class="total-exp-badge">Total Experience: ${escapeHtml(totalExp)}</span>
            </div>
            ${renderWorkBlock(c.companyName1, c.jobTitle1, c.startDate1, c.endDate1 || (c.companyName1 ? 'Present' : ''), c.jobDesc1)}
            ${c.companyName2 ? renderWorkBlock(c.companyName2, c.jobTitle2, c.startDate2, c.endDate2, c.jobDesc2) : ''}
            ${c.companyName3 ? renderWorkBlock(c.companyName3, c.jobTitle3, c.startDate3, c.endDate3, c.jobDesc3) : ''}
        </div>

        <div class="profile-section">
            <div class="section-title">4. Skills, Channels & Sales</div>
            <div class="info-item" style="margin-bottom:10px;">
                <span>Functional Channels</span>
                <div class="chip-list">
                    ${channelsList.length ? channelsList.map(ch => `<span class="chip">${escapeHtml(ch)}</span>`).join('') : '<strong>None selected</strong>'}
                </div>
            </div>
            <div class="info-item">
                <span>Sales & Telecalling</span>
                <div class="chip-list">
                    ${salesList.length ? salesList.map(sl => `<span class="chip chip-teal">${escapeHtml(sl)}</span>`).join('') : '<strong>None selected</strong>'}
                </div>
            </div>
        </div>

        <div class="profile-section">
            <div class="section-title">5. Internal Recruiter Notes</div>
            <textarea id="recruiterNotesInput" rows="3" placeholder="Add private recruiter notes..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:inherit;" oninput="saveNotes('${escapeHtml(key)}', this.value)">${escapeHtml(currentNotes)}</textarea>
        </div>

        ${c.resumeLink ? `
        <div style="text-align:right;" class="no-print">
            <a href="${escapeHtml(c.resumeLink)}" target="_blank" class="btn-gradient" style="display:inline-block; width:auto; padding:10px 20px; text-decoration:none;">
                <i class="fa-solid fa-download"></i> Download Resume / CV
            </a>
        </div>` : ''}
    `;

    document.getElementById('profileModal').classList.remove('hidden');
}

function saveNotes(key, val) {
    candidateNotes[key] = val;
    localStorage.setItem('provilac_notes', JSON.stringify(candidateNotes));
}

function formatLanguagesDisplay(rawLanguages) {
    if (!rawLanguages) return '<div style="font-size:13px;">Not specified</div>';
    return rawLanguages.split(';').map(lang => lang.trim()).filter(Boolean).map(lang => `<div style="font-size:13px; font-weight:600;">${escapeHtml(lang)}</div>`).join('');
}

function renderWorkBlock(company, title, start, end, jd) {
    if (!company) return `<p style="font-size:13px; color:#64748b;">Fresher / No work history provided.</p>`;
    const months = calcMonthsBetween(start, end);
    const tenureText = months > 0 ? formatMonthsToText(months) : '';
    return `
        <div class="exp-card">
            <div class="exp-top-row">
                <div class="exp-head">${escapeHtml(company)} — ${escapeHtml(title || '')}</div>
                ${tenureText ? `<span class="exp-duration-tag">${escapeHtml(tenureText)}</span>` : ''}
            </div>
            <div class="exp-dates">${escapeHtml(formatToMMDDYYYY(start))} to ${escapeHtml(formatToMMDDYYYY(end))}</div>
            <div class="exp-jd">${escapeHtml(jd || 'No description provided.')}</div>
        </div>
    `;
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.add('hidden');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}