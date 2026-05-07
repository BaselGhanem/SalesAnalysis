// إدارة حالة التطبيق
const AppState = {
    mode: 'value', // 'value' or 'qty'
    filters: {
        team: 'all',
        area: 'all',
        rep: 'all',
        startDate: '2026-01',
        endDate: '2026-12'
    },
    filteredData: []
};

// تهيئة أزرار التبديل
document.getElementById('btn-val').addEventListener('click', (e) => {
    AppState.mode = 'value';
    toggleButtons(e.target);
    runAnalyticsEngine();
});

document.getElementById('btn-qty').addEventListener('click', (e) => {
    AppState.mode = 'qty';
    toggleButtons(e.target);
    runAnalyticsEngine();
});

function toggleButtons(activeBtn) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}
function initFilters() {
    // تعبئة القوائم المنسدلة
    populateSelect('filter-team', teamsData);
    populateSelect('filter-area', areasData);
    populateSelect('filter-rep', employees.map(e => ({ value: e.id, label: e.name })));

    // ربط مستمعي الأحداث
    document.querySelectorAll('.filter-select, .filter-input').forEach(el => {
        el.addEventListener('change', (e) => {
            AppState.filters[e.target.id.replace('filter-', '').replace('-start', 'Start').replace('-end', 'End')] = e.target.value;
            runAnalyticsEngine();
        });
    });
}

function populateSelect(elementId, dataArray) {
    const select = document.getElementById(elementId);
    dataArray.forEach(item => {
        const isObj = typeof item === 'object';
        const option = document.createElement('option');
        option.value = isObj ? item.value : item;
        option.textContent = isObj ? item.label : item;
        select.appendChild(option);
    });
}

function applyDataFilters() {
    const { team, area, rep, startDate, endDate } = AppState.filters;
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    
    // تصحيح نهاية الشهر
    endObj.setMonth(endObj.getMonth() + 1); 

    AppState.filteredData = salesData.filter(record => {
        const emp = employees.find(e => e.id === record.repId);
        const recordDate = new Date(record.date);
        
        const matchTeam = team === 'all' || emp.team === team;
        const matchArea = area === 'all' || emp.area === area;
        const matchRep = rep === 'all' || record.repId.toString() === rep;
        const matchDate = recordDate >= startObj && recordDate < endObj;

        return matchTeam && matchArea && matchRep && matchDate;
    });
}
function updateKPIs() {
    const container = document.getElementById('kpi-container');
    container.innerHTML = ''; // تفريغ

    if(AppState.filteredData.length === 0) return;

    let total = 0;
    let targetTotal = 0;
    const isValue = AppState.mode === 'value';

    AppState.filteredData.forEach(record => {
        total += isValue ? record.soldValue : record.soldQty;
    });

    // حساب الهدف بناءً على الفريق المختار أو إجمالي الشركة
    if (AppState.filters.team !== 'all') {
        targetTotal = targets2026[AppState.filters.team][isValue ? 'value' : 'qty'];
    } else {
        Object.values(targets2026).forEach(t => targetTotal += t[isValue ? 'value' : 'qty']);
    }

    const achievementRate = ((total / targetTotal) * 100).toFixed(1);
    const prefix = isValue ? 'JOD ' : '';

    container.innerHTML = `
        <div class="kpi-card">
            <h3>إجمالي المبيعات (${isValue ? 'قيمة' : 'كمية'})</h3>
            <div class="kpi-value">${prefix}${total.toLocaleString()}</div>
            <div class="kpi-target">الهدف لعام 2026: ${prefix}${targetTotal.toLocaleString()}</div>
        </div>
        <div class="kpi-card">
            <h3>نسبة التحقيق (YTD)</h3>
            <div class="kpi-value ${achievementRate >= 100 ? 'text-success' : 'text-danger'}">
                ${achievementRate}%
            </div>
            <div class="kpi-target">المتوقع: 100% بنهاية 2026</div>
        </div>
    `;
}
let chartsInstance = {};

function updateCharts() {
    renderBarChart();
    renderPieChart();
}

function renderBarChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (chartsInstance.sales) chartsInstance.sales.destroy();

    // تجميع البيانات حسب الأشهر
    const monthlyData = {};
    AppState.filteredData.forEach(record => {
        const month = record.date.slice(0, 7); // YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + (AppState.mode === 'value' ? record.soldValue : record.soldQty);
    });

    chartsInstance.sales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(monthlyData).sort(),
            datasets: [{
                label: `المبيعات (${AppState.mode})`,
                data: Object.values(monthlyData),
                borderColor: '#0056b3',
                backgroundColor: 'rgba(0, 86, 179, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderPieChart() {
    const ctx = document.getElementById('teamsChart').getContext('2d');
    if (chartsInstance.teams) chartsInstance.teams.destroy();

    const teamDataAgg = {};
    AppState.filteredData.forEach(record => {
        const teamName = employees.find(e => e.id === record.repId).team;
        teamDataAgg[teamName] = (teamDataAgg[teamName] || 0) + (AppState.mode === 'value' ? record.soldValue : record.soldQty);
    });

    chartsInstance.teams = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(teamDataAgg),
            datasets: [{
                data: Object.values(teamDataAgg),
                backgroundColor: ['#0056b3', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
function updateVisitsTable() {
    const tbody = document.getElementById('visits-body');
    tbody.innerHTML = '';

    if (AppState.filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">لا توجد بيانات مطابقة لفلاتر البحث الحالية.</td></tr>`;
        return;
    }

    // تجميع الزيارات لكل مندوب
    const repVisits = {};
    AppState.filteredData.forEach(record => {
        if (!repVisits[record.repId]) {
            repVisits[record.repId] = { target: 0, actual: 0 };
        }
        repVisits[record.repId].target += record.targetVisits;
        repVisits[record.repId].actual += record.actualVisits;
    });

    // استخدام DocumentFragment لرفع الأداء (Performance Optimization)
    const fragment = document.createDocumentFragment();

    Object.keys(repVisits).forEach(repId => {
        const emp = employees.find(e => e.id == repId);
        const data = repVisits[repId];
        const coverage = ((data.actual / data.target) * 100).toFixed(1);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td><span style="background:var(--bg-main); padding: 4px 8px; border-radius: 4px;">${emp.team}</span></td>
            <td>${emp.area}</td>
            <td>${data.target}</td>
            <td>${data.actual}</td>
            <td style="color: ${coverage < 80 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                ${coverage}%
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
}
let debounceTimer;
function runAnalyticsEngine() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applyDataFilters();
        updateKPIs();
        updateCharts();
        updateVisitsTable();
        generateSWOT();
    }, 200);
}
function generateSWOT() {
    const swotList = document.getElementById('swot-list');
    swotList.innerHTML = '';
    
    if (AppState.filteredData.length === 0) {
        swotList.innerHTML = `<li class="empty-state">غير متوفر</li>`;
        return;
    }

    // تحليل ذكي مبسط
    const totalVisits = AppState.filteredData.reduce((sum, r) => sum + r.actualVisits, 0);
    const targetVisits = AppState.filteredData.reduce((sum, r) => sum + r.targetVisits, 0);
    const visitCoverage = (totalVisits / targetVisits) * 100;

    const insights = [];
    if (visitCoverage < 85) {
        insights.push(`🔴 <strong>نقطة ضعف (Weakness):</strong> تغطية الزيارات الحالية (${visitCoverage.toFixed(1)}%) أقل من المعيار المطلوب لعام 2026.`);
    } else {
        insights.push(`🟢 <strong>نقطة قوة (Strength):</strong> أداء ميداني ممتاز بتغطية زيارات تتجاوز ${visitCoverage.toFixed(1)}%.`);
    }

    // التركيز على فريق Azord كعنصر استراتيجي (مثال)
    const azordData = AppState.filteredData.filter(r => employees.find(e => e.id === r.repId).team === 'Azord');
    if(azordData.length > 0) {
        insights.push(`🔵 <strong>فرصة (Opportunity):</strong> فريق Azord يحافظ على استقرار مستمر، يمكن توجيه استثمارات إضافية لزيادة حصته السوقية.`);
    }

    swotList.innerHTML = insights.map(i => `<li style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">${i}</li>`).join('');
}

// نقطة الانطلاق (App Initialization)
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    runAnalyticsEngine();
});


