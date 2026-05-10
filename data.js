// ملف data.js

// دالة لجلب ملف الإكسل من رابط وتحويله إلى JSON
async function fetchExcelData(url) {
    try {
        // جلب الملف كبيانات ثنائية
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل في جلب الملف');
        
        const arrayBuffer = await response.arrayBuffer();
        
        // قراءة الملف باستخدام مكتبة SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // استخراج اسم الورقة الأولى في ملف الإكسل
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // تحويل محتوى الورقة إلى مصفوفة JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        return jsonData;
    } catch (error) {
        console.error("حدث خطأ أثناء قراءة ملف الإكسل:", error);
        return [];
    }
}
