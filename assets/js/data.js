// 1. جدول المندوبين (Employee Dimension)
const employees = [
    { id: 1, name: "Ahmad", team: "Azord", area: "Amman" },
    { id: 2, name: "Sami", team: "URO", area: "Irbid" },
    { id: 3, name: "Rami", team: "Matador", area: "Zarqa" },
    { id: 4, name: "Sara", team: "Mixif", area: "Amman" },
    { id: 5, name: "Khaled", team: "Clavodar", area: "Aqaba" }
];

// قوائم مساعدة للفلترة
const teamsData = ["Azord", "URO", "Matador", "Mixif", "Clavodar"];
const areasData = ["Amman", "Irbid", "Zarqa", "Aqaba", "Karak"];
const itemsData = ["Azord Plus", "Uro-Care", "Matador Extra", "Mixif 500", "Clavodar 1g"]; // ضع أصنافك هنا

// أهداف المبيعات الشهرية (Monthly Targets) للفرق
const monthlyTargets = {
    "Azord": { qty: 5000, value: 50000 },
    "URO": { qty: 3000, value: 45000 },
    "Matador": { qty: 4000, value: 30000 },
    "Mixif": { qty: 2500, value: 20000 },
    "Clavodar": { qty: 6000, value: 65000 }
};

// 2. جدول المبيعات المفصول (Sales Fact Table)
// الحقول: repId, date, salesArea (منطقة البيع), item (الصنف), soldQty, soldValue
const salesData = [
    { repId: 1, date: "2026-01-05", salesArea: "Amman", item: "Azord Plus", soldQty: 100, soldValue: 1500 },
    { repId: 1, date: "2026-01-12", salesArea: "Zarqa", item: "Azord Plus", soldQty: 50, soldValue: 750 },
    { repId: 2, date: "2026-01-10", salesArea: "Irbid", item: "Uro-Care", soldQty: 200, soldValue: 3000 }
    // الصق بيانات المبيعات الحقيقية هنا
];

// 3. جدول الزيارات المفصول (Visits Fact Table)
// الحقول: repId, date, actualVisits
const specialtiesData = ["Center", "Chest", "Pediatric", "Internal", "GP"]; // ضع تخصصاتك الحقيقية هنا

// تحديث جدول الزيارات (الصق بيانات الـ JSON التي حولتها هنا)
const visitsData = [
    { repId: 1, date: "2026-03-01", Specialty: "Center", actualVisits: 60 },
    { repId: 7, date: "2026-04-01", Specialty: "Center", actualVisits: 92 },
    { repId: 30, date: "2026-05-01", Specialty: "Center", actualVisits: 9 },
    { repId: 1, date: "2026-03-01", Specialty: "Chest", actualVisits: 14 }
];
