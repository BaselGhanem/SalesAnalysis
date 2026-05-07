const getEmployees = () => {
  const employees = [
    { id: 1, name: "Ahmad", team: "Azord", area: "Amman" },
    { id: 2, name: "Sami", team: "URO", area: "Irbid" },
    { id: 3, name: "Rami", team: "Matador", area: "Zarqa" },
    { id: 4, name: "Sara", team: "Mixif", area: "Amman" },
    { id: 5, name: "Khaled", team: "Clavodar", area: "Aqaba" }
  ];

  return employees; 
};

// لاستدعاء البيانات
const data = getEmployees();
console.log(data);
