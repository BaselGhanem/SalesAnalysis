// ==========================================
// 1. إعدادات النظام وإدارة الحالة (State Management)
// ==========================================
const AppState = {
    mode: 'value', // 'value' or 'qty'
    filters: { team: 'all', area: 'all', rep: 'all', item: 'all', specialty: 'all', startDate: '2026-01', endDate: '2026-12' },
    filteredSales: [],
    filteredVisits: []
};

// حاويات البيانات الخام (سيتم تعبئتها عبر الـ Fetch)
let rawEmployees = [];
let rawSales = [];
let rawVisits = [];

// أهداف المبيعات الشهرية (كمتغير إعدادات للنظام)
const monthlyTargets = {
    "Azord": { qty: 5000, value: 50000 },
    "URO": { qty: 3000, value: 45000 },
    "Matador": { qty: 4000, value: 30000 },
    "Mixif": { qty: 2500, value: 20000 },
    "Clavodar": { qty: 6000, value: 65000 }
};

// ==========================================
// 2. محرك تحميل البيانات (Data Fetching Engine)
// ==========================================
async function initEnterpriseSystem() {
    try {
        // تحميل الملفات الثلاثة بالتوازي لأعلى أداء (Promise.all)
        const [empRes, salesRes, visitsRes] = await Promise.all([
            fetch('assets/data/employees.json'),
            fetch('assets/data/sales.json'),
            fetch('assets/data/visits.json')
        ]);

        rawEmployees = await empRes.json();
        rawSales = await salesRes.json();
        rawVisits = await visitsRes.json();

        // بمجرد نجاح التحميل، نبدأ تهيئة الفلاتر الذكية ومحرك التحليل
        initSmartFilters();
        runAnalyticsEngine();

    } catch (error) {
        console.error("Critical Error Loading Data:", error);
        document.getElementById('kpi-container').innerHTML = 
            '<div style="color:red; font-weight:bold; padding:20px; background:white; border-radius:8px;">فشل تحميل ملفات الـ JSON. يرجى التأكد من مسارها (assets/data/)</div>';
    }
}

// ==========================================
// 3. نظام الفلترة الذكية (Smart Cascading Filters)
// ==========================================
function initSmartFilters() {
    // استخراج الأصناف والتخصصات ديناميكياً من البيانات (لا يوجد تكرار بفضل Set)
    const uniqueItems = [...new Set(rawSales.map(s => s.item))].filter(Boolean);
    const uniqueSpecialties = [...new Set(rawVisits.map(v => v.Specialty))].filter(Boolean);

    populateSelect('filter-item', uniqueItems.map(i => ({ value: i, label: i })), "جميع الأصناف (Items)");
    populateSelect('filter-specialty', uniqueSpecialties.map(s => ({ value: s, label: s })), "جميع التخصصات (Specialties)");

    // التحديث الأولي لقوائم الفريق، المنطقة، والمندوبين
    updateCascadingFilters();

    // ربط مستمعي الأحداث للفلاتر
    document.querySelectorAll('.filter-select, .filter-input').forEach(el => {
        el.addEventListener('change', (e) => {
            const filterId = e.target.id;
            const key = filterId.replace('filter-', '').replace('-start', 'Start').replace('-end', 'End');
            AppState.filters[key] = e.target.value;

            // الذكاء هنا: إذا تغير الفريق، نقوم بتصفير المنطقة والمندوب ونحدث القوائم
            if (filterId === 'filter-team') {
                AppState.filters.area = 'all';
                AppState.filters.rep = 'all';
                updateCascadingFilters();
            } 
            // إذا تغيرت المنطقة، نصفر المندوب ونحدث قائمته
            else if (filterId === 'filter-area') {
                AppState.filters.rep = 'all';
                updateCascadingFilters();
            }

            runAnalyticsEngine();
        });
    });
}

function updateCascadingFilters() {
    let validEmployees = rawEmployees;

    // فلترة المندوبين المتاحين حسب الفريق المختار
    if (AppState.filters.team !== 'all') {
        validEmployees = validEmployees.filter(e => e.team === AppState.filters.team);
    }
    // فلترة المندوبين المتاحين حسب المنطقة المختارة
    if (AppState.filters.area !== 'all') {
        validEmployees = validEmployees.filter(e => e.area === AppState.filters.area);
    }

    // بناء القوائم المنسدلة الذكية
    const uniqueTeams = [...new Set(rawEmployees.map(e => e.team))].filter(Boolean); // الفرق تبقى ثابتة
    const uniqueAreas = [...new Set(validEmployees.map(e => e.area))].filter(Boolean); // المناطق تتغير حسب الفريق
    const repOptions = validEmployees.map(e => ({ value: e.id, label: e.name })); // المندوبين حسب الفريق والمنطقة

    populateSelect('filter-team', uniqueTeams.map(t => ({ value: t, label: t })), "جميع الفرق (Teams)", AppState.filters.team);
    populateSelect('filter-area', uniqueAreas.map(a => ({ value: a, label: a })), "جميع المناطق (Areas)", AppState.filters.area);
    populateSelect('filter-rep', repOptions, "جميع المندوبين (Medical Reps)", AppState.filters.rep);
}

function populateSelect(elementId, dataArray, defaultLabel, selectedValue = 'all') {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = `<option value="all">${defaultLabel}</option>`;
    dataArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        if (item.value == selectedValue) option.selected = true;
        select.appendChild(option);
    });
}

// ==========================================
// 4. محرك تحليل ومعالجة البيانات (Data Logic Engine)
// ==========================================
function applyDataFilters() {
    const { team, area, rep, item, specialty, startDate, endDate } = AppState.filters;
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    endObj.setMonth(endObj.getMonth() + 1); 

    // 1. فلترة المبيعات
    AppState.filteredSales = rawSales.filter(record => {
        const emp = rawEmployees.find(e => e.id == record.repId);
        if(!emp) return false;
        const recordDate = new Date(record.date);
        
        const matchTeam = team === 'all' || emp.team === team;
        const matchArea = area === 'all' || record.salesArea === area; 
        const matchRep = rep === 'all' || record.repId.toString() === rep;
        const matchItem = item === 'all' || record.item === item; 
        const matchDate = recordDate >= startObj && recordDate < endObj;

        return matchTeam && matchArea && matchRep && matchItem && matchDate;
    });

    // 2. فلترة الزيارات
    AppState.filteredVisits = rawVisits.filter(record => {
        const emp = rawEmployees.find(e => e.id == record.repId);
        if(!emp) return false;
        const recordDate = new Date(record.date);
        
        const matchTeam = team === 'all' || emp.team === team;
        const matchRep = rep === 'all' || record.repId.toString() === rep;
        const matchSpecialty = specialty === 'all' || record.Specialty === specialty;
        const matchDate = recordDate >= startObj && recordDate < endObj;

        return matchTeam && matchRep && matchSpecialty && matchDate;
    });
}

// ==========================================
// 5. تحديث واجهة المستخدم (UI Engine)
// ==========================================

// أزرار التبديل
document.getElementById('btn-val').addEventListener('click', (e) => { AppState.mode = 'value'; toggleButtons(e.target); runAnalyticsEngine(); });
document.getElementById('btn-qty').addEventListener('click', (e) => { AppState.mode = 'qty'; toggleButtons(e.target); runAnalyticsEngine(); });
function toggleButtons(activeBtn) { document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active')); activeBtn.classList.add('active'); }

function updateKPIs() {
    const container = document.getElementById('kpi-container');
    container.innerHTML = ''; 

    if(AppState.filteredSales.length === 0) return;

    let total = 0; let targetTotal = 0;
    const isValue = AppState.mode === 'value';

    AppState.filteredSales.forEach(record => { total += isValue ? record.soldValue : record.soldQty; });

    if (AppState.filters.team !== 'all' && monthlyTargets[AppState.filters.team]) {
        targetTotal = monthlyTargets[AppState.filters.team][isValue ? 'value' : 'qty'];
    } else {
        Object.values(monthlyTargets).forEach(t => targetTotal += t[isValue ? 'value' : 'qty']);
    }

    const achievementRate = targetTotal > 0 ? ((total / targetTotal) * 100).toFixed(1) : 0;
    const prefix = isValue ? 'JOD ' : '';

    container.innerHTML = `
        <div class="kpi-card">
            <h3>إجمالي المبيعات (${isValue ? 'قيمة' : 'كمية'})</h3>
            <div class="kpi-value">${prefix}${total.toLocaleString()}</div>
            <div class="kpi-target">الهدف: ${prefix}${targetTotal.toLocaleString()}</div>
        </div>
        <div class="kpi-card">
            <h3>نسبة التحقيق</h3>
            <div class="kpi-value ${achievementRate >= 100 ? 'text-success' : 'text-danger'}">
                ${achievementRate}%
            </div>
            <div class="kpi-target">تحديث مباشر</div>
        </div>
    `;
}

let chartsInstance = {};
function updateCharts() {
    const ctxSales = document.getElementById('salesChart').getContext('2d');
    if (chartsInstance.sales) chartsInstance.sales.destroy();

    const monthlyData = {};
    AppState.filteredSales.forEach(record => {
        const month = record.date.slice(0, 7); 
        monthlyData[month] = (monthlyData[month] || 0) + (AppState.mode === 'value' ? record.soldValue : record.soldQty);
    });

    chartsInstance.sales = new Chart(ctxSales, {
        type: 'line',
        data: {
            labels: Object.keys(monthlyData).sort(),
            datasets: [{
                label: `المبيعات (${AppState.mode})`, data: Object.values(monthlyData),
                borderColor: '#0056b3', backgroundColor: 'rgba(0, 86, 179, 0.1)', fill: true, tension: 0.4
            }]
        }, options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxTeams = document.getElementById('teamsChart').getContext('2d');
    if (chartsInstance.teams) chartsInstance.teams.destroy();

    const teamDataAgg = {};
    AppState.filteredSales.forEach(record => {
        const emp = rawEmployees.find(e => e.id == record.repId);
        if(emp) {
            teamDataAgg[emp.team] = (teamDataAgg[emp.team] || 0) + (AppState.mode === 'value' ? record.soldValue : record.soldQty);
        }
    });

    chartsInstance.teams = new Chart(ctxTeams, {
        type: 'doughnut',
        data: {
            labels: Object.keys(teamDataAgg),
            datasets: [{
                data: Object.values(teamDataAgg),
                backgroundColor: ['#0056b3', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6']
            }]
        }, options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateVisitsTable() {
    const tbody = document.getElementById('visits-body');
    tbody.innerHTML = '';

    if (AppState.filteredVisits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">لا توجد بيانات مطابقة لفلاتر البحث الحالية.</td></tr>`;
        return;
    }

    const repVisits = {};
    AppState.filteredVisits.forEach(record => {
        const key = `${record.repId}_${record.Specialty}`; 
        if (!repVisits[key]) repVisits[key] = { repId: record.repId, specialty: record.Specialty, actual: 0 };
        repVisits[key].actual += record.actualVisits;
    });

    const fragment = document.createDocumentFragment();
    Object.values(repVisits).forEach(data => {
        const emp = rawEmployees.find(e => e.id == data.repId);
        if(!emp) return;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td><span style="background:var(--bg-main); padding: 4px 8px; border-radius: 4px;">${emp.team}</span></td>
            <td>${emp.area}</td>
            <td style="color: var(--text-muted);">${data.specialty}</td>
            <td style="font-weight: bold; color: var(--primary);">${data.actual}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

function generateSWOT() {
    const swotList = document.getElementById('swot-list');
    swotList.innerHTML = '';
    
    if (AppState.filteredSales.length === 0 && AppState.filteredVisits.length === 0) {
        swotList.innerHTML = `<li class="empty-state">غير متوفر</li>`; return;
    }

    const insights = [];
    let totalSales = 0; let targetTotal = 0;
    const isValue = AppState.mode === 'value';

    AppState.filteredSales.forEach(r => totalSales += isValue ? r.soldValue : r.soldQty);

    if (AppState.filters.team !== 'all' && monthlyTargets[AppState.filters.team]) {
        targetTotal = monthlyTargets[AppState.filters.team][isValue ? 'value' : 'qty'];
    } else {
        Object.values(monthlyTargets).forEach(t => targetTotal += t[isValue ? 'value' : 'qty']);
    }

    if (targetTotal > 0) {
        const achievementRate = (totalSales / targetTotal) * 100;
        if (achievementRate >= 100) insights.push(`🟢 <strong>نقطة قوة:</strong> تحقيق الأهداف يسير بشكل ممتاز بنسبة تتجاوز 100%.`);
        else if (achievementRate >= 75) insights.push(`🔵 <strong>فرصة:</strong> الأداء جيد جداً (${achievementRate.toFixed(1)}%). يمكن توجيه جهود تسويقية إضافية للوصول للهدف.`);
        else insights.push(`🔴 <strong>تنبيه:</strong> نسبة التحقيق الحالية (${achievementRate.toFixed(1)}%) تتطلب مراجعة الأداء في المناطق الضعيفة.`);
    }

    const totalVisits = AppState.filteredVisits.reduce((sum, r) => sum + r.actualVisits, 0);
    if (totalVisits > 0) insights.push(`📋 <strong>النشاط الميداني:</strong> إجمالي الزيارات الفعلية المنجزة <strong>${totalVisits}</strong> زيارة.`);

    swotList.innerHTML = insights.map(i => `<li style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">${i}</li>`).join('');
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

// ==========================================
// 6. نقطة الانطلاق (App Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // البدء بجلب الملفات الحقيقية
    initEnterpriseSystem();
});
