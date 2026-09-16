import * as XLSX from "xlsx";

export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
        const normalized = jsonData.map((row) => {
          const obj = {};
          Object.keys(row).forEach((key) => {
            const k = key.toLowerCase().trim();
            obj[k] = String(row[key]).trim();
          });
          return obj;
        });
        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function downloadTemplateOrtu() {
  const template = [
    {
      nama_ortu: "Bpk. Hasan",
      hubungan: "Ayah",
      nama_anak: "Ahmad Fauzan",
      email_ortu: "ayah.ahmadfauzan@quranku.com",
      password: "123456",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ortu");
  ws["!cols"] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 25 },
    { wch: 35 },
    { wch: 12 },
  ];
  XLSX.writeFile(wb, "template-import-ortu.xlsx");
}

export function validateOrtu(ortu) {
  if (!ortu.nama_ortu || ortu.nama_ortu.length < 2) {
    return { valid: false, error: "Nama ortu tidak valid" };
  }
  if (!ortu.nama_anak || ortu.nama_anak.length < 2) {
    return { valid: false, error: "Nama anak kosong" };
  }
  if (!ortu.email_ortu || !ortu.email_ortu.includes("@")) {
    return { valid: false, error: "Email ortu tidak valid" };
  }
  if (!ortu.password || ortu.password.length < 6) {
    return { valid: false, error: "Password minimal 6 karakter" };
  }
  const hubunganValid = ["ayah", "ibu", "wali"];
  if (!hubunganValid.includes(ortu.hubungan.toLowerCase())) {
    return { valid: false, error: "Hubungan harus: Ayah / Ibu / Wali" };
  }
  return { valid: true, error: "" };
}