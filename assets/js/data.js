// بيانات الموارد البشرية والفرق لشركة الأدوية
const teamsData = ["Azord", "URO", "Matador", "Mixif", "Clavodar"];
const areasData = ["Amman", "Irbid", "Zarqa", "Aqaba", "Karak"];

const employees = [
    { id: 1, name: "Ahmad", team: "Azord", area: "Amman" },
    { id: 2, name: "Sami", team: "URO", area: "Irbid" },
    { id: 3, name: "Rami", team: "Matador", area: "Zarqa" },
    { id: 4, name: "Sara", team: "Mixif", area: "Amman" },
    { id: 5, name: "Khaled", team: "Clavodar", area: "Aqaba" }
];

// أهداف المبيعات لعام 2026 (Targets)
const targets2026 = {
    "Azord": { qty: 50000, value: 500000 },
    "URO": { qty: 30000, value: 450000 },
    "Matador": { qty: 40000, value: 300000 },
    "Mixif": { qty: 25000, value: 200000 },
    "Clavodar": { qty: 60000, value: 650000 }
};

// محاكاة بيانات المبيعات والزيارات اليومية لعام 2026
const generateSalesData = () => {
    const data = [];
    employees.forEach(emp => {
        // توليد بيانات لكل شهر في 2026
        for(let month = 1; month <= 12; month++) {
            const dateStr = `2026-${month.toString().padStart(2, '0')}-01`;
            data.push({
                repId: emp.id,
                date: dateStr,
                soldQty: Math.floor(Math.random() * 1000) + 500,
                soldValue: Math.floor(Math.random() * 10000) + 5000,
                targetVisits: 120,
                actualVisits: Math.floor(Math.random() * 40) + 80
            });
        }
    });
    return data;
};

const salesData = generateSalesData();
