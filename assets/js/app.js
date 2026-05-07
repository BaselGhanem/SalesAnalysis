// إدارة حالة التطبيق
const AppState = {
    mode: 'value', // 'value' or 'qty'
    filters: {
        team: 'all',
        area: 'all', // منطقة البيع
        rep: 'all',
        item: 'all', // فلتر الصنف
        startDate: '2026-01',
        endDate: '2026-12'
    },
    filteredSales: [], // مصفوفة المبيعات المفلترة
    filteredVisits: [] // مصفوفة الزيارات المفلترة
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

// تهيئة الفلاتر والقوائم المنسدلة
function initFilters() {
    populateSelect('filter-team', teamsData);
    populateSelect('filter-area', areasData);
    populateSelect('filter-item', itemsData); // إضافة الصنف
    populateSelect('filter-rep', employees.map(e => ({ value: e.id, label: e.name })));

    document.querySelectorAll('.filter-select, .filter-input').forEach(el => {
        el.addEventListener('change', (e) => {
            const key = e.target.id.replace('filter-', '').replace('-start', 'Start').replace('-end', 'End');
            AppState.filters[key] = e.target.value;
            runAnalyticsEngine();
        });
    });
}

function populateSelect(elementId, dataArray) {
    const select = document.getElementById(elementId);
    if(!select) return; // حماية من الأخطاء إذا لم يكن العنصر موجوداً
    dataArray.forEach(item => {
        const isObj = typeof item === 'object';
        const option = document.createElement('option');
        option.value = isObj ? item.value : item;
        option.textContent = isObj ? item.label : item;
        select.appendChild(option);
    });
}

// محرك فلترة البيانات المزدوج (للمبيعات والزيارات)
function applyDataFilters() {
    const { team, area, rep, item, startDate, endDate } = AppState.filters;
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    
    // تصحيح نهاية الشهر لتشمل آخر يوم فيه
    endObj.setMonth(endObj.getMonth() + 1); 

    // 1. فلترة بيانات المبيعات
    AppState.filteredSales = salesData.filter(record => {
        const emp = employees.find(e => e.id === record.repId);
        const recordDate = new Date(record.date);
        
        const matchTeam = team === 'all' || emp.team === team;
        const matchArea = area === 'all' || record.salesArea === area; // منطقة البيع
        const matchRep = rep === 'all' || record.repId.toString() === rep;
        const matchItem = item === 'all' || record.item === item; // الصنف
        const matchDate = recordDate >= startObj && recordDate < endObj;

        return matchTeam && matchArea && matchRep && matchItem && matchDate;
    });

    // 2. فلترة بيانات الزيارات
    AppState.filteredVisits = visitsData.filter(record => {
        const emp = employees.find(e => e.id === record.repId);
        const recordDate = new Date(record.date);
        
        // الزيارات ليس لها صنف أو منطقة بيع، لذلك نفلتر حسب المندوب والفريق والتاريخ فقط
        const matchTeam = team === 'all' || emp.team === team;
        const matchRep = rep === 'all' || record.repId.toString() === rep;
        const matchDate = recordDate >= startObj && recordDate < endObj;

        return matchTeam && matchRep && matchDate;
    });
}

// تحديث المؤشرات التنفيذية بناءً على المبيعات فقط
function updateKPIs() {
    const container = document.getElementById('kpi-container');
    container.innerHTML = ''; 

    if(AppState.filteredSales.length === 0) return;

    let total = 0;
    let targetTotal = 0;
    const isValue = AppState.mode === 'value';

    AppState.filteredSales.forEach(record => {
        total += isValue ? record.soldValue : record.soldQty;
    });

    // حساب الهدف من كائن monthlyTargets الموجود في data.js
    if (AppState.filters.team !== 'all') {
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
    renderBarChart();
    renderPieChart();
}

function renderBarChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (chartsInstance.sales) chartsInstance.sales.destroy();

    const monthlyData = {};
    AppState.filteredSales.forEach(record => {
        const month = record.date.slice(0, 7); 
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
    AppState.filteredSales.forEach(record => {
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

// تحديث جدول الزيارات بناءً على بيانات الزيارات فقط (بدون تارجت وبـ 4 أعمدة فقط)
function updateVisitsTable() {
    const tbody = document.getElementById('visits-body');
    tbody.innerHTML = '';

    if (AppState.filteredVisits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">لا توجد بيانات مطابقة لفلاتر البحث الحالية.</td></tr>`;
        return;
    }

    const repVisits = {};
    AppState.filteredVisits.forEach(record => {
        if (!repVisits[record.repId]) {
            repVisits[record.repId] = 0;
        }
        repVisits[record.repId] += record.actualVisits;
    });

    const fragment = document.createDocumentFragment();

    Object.keys(repVisits).forEach(repId => {
        const emp = employees.find(e => e.id == repId);
        const actual = repVisits[repId];
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td><span style="background:var(--bg-main); padding: 4px 8px; border-radius: 4px;">${emp.team}</span></td>
            <td>${emp.area}</td>
            <td style="font-weight: bold; color: var(--primary);">${actual}</td>
        `;
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
}

// تحليل ذكي جديد متوافق مع إلغاء تارجت الزيارات
function generateSWOT() {
    const swotList = document.getElementById('swot-list');
    swotList.innerHTML = '';
    
    if (AppState.filteredSales.length === 0 && AppState.filteredVisits.length === 0) {
        swotList.innerHTML = `<li class="empty-state">غير متوفر</li>`;
        return;
    }

    const insights = [];

    // رؤى المبيعات والنسبة
    let totalSales = 0;
    let targetTotal = 0;
    const isValue = AppState.mode === 'value';

    AppState.filteredSales.forEach(r => totalSales += isValue ? r.soldValue : r.soldQty);

    if (AppState.filters.team !== 'all') {
        targetTotal = monthlyTargets[AppState.filters.team][isValue ? 'value' : 'qty'];
    } else {
        Object.values(monthlyTargets).forEach(t => targetTotal += t[isValue ? 'value' : 'qty']);
    }

    if (targetTotal > 0) {
        const achievementRate = (totalSales / targetTotal) * 100;
        if (achievementRate >= 100) {
            insights.push(`🟢 <strong>نقطة قوة (Strength):</strong> تحقيق الأهداف يسير بشكل ممتاز وبنسبة تتجاوز 100%.`);
        } else if (achievementRate >= 75) {
            insights.push(`🔵 <strong>فرصة (Opportunity):</strong> الأداء جيد جداً (${achievementRate.toFixed(1)}%)، مع إمكانية الوصول للهدف بتوجيه جهود تسويقية إضافية.`);
        } else {
            insights.push(`🔴 <strong>تنبيه (Warning):</strong> نسبة التحقيق الحالية (${achievementRate.toFixed(1)}%) تتطلب مراجعة الأداء في المناطق الضعيفة.`);
        }
    }

    // رؤى الزيارات الميدانية
    const totalVisits = AppState.filteredVisits.reduce((sum, r) => sum + r.actualVisits, 0);
    if (totalVisits > 0) {
        insights.push(`📋 <strong>النشاط الميداني:</strong> إجمالي الزيارات الفعلية المنجزة للفترة المحددة هو <strong>${totalVisits}</strong> زيارة.`);
    }

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

// نقطة الانطلاق
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    runAnalyticsEngine();
});
