export function kompresDanProsesFile(file: File): Promise<{ data: string; name: string } | null> {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ data: e.target?.result as string, name: file.name });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      resolve(null);
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        console.warn("Image load failed, using raw base64 data URL.");
        resolve({ data: e.target?.result as string, name: file.name });
      };
      img.onload = () => {
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataURL = canvas.toDataURL('image/jpeg', 0.7);
          resolve({ data: dataURL, name: file.name });
        } else {
          resolve({ data: e.target?.result as string, name: file.name });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function formatTanggalIndonesia(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  try {
    let dateObj: Date | null = null;
    const str = String(dateStr).trim();

    // Check if numeric Excel serial date (e.g. 45000 to 55000)
    if (!isNaN(Number(str)) && Number(str) > 30000 && Number(str) < 60000) {
      dateObj = new Date((Number(str) - 25569) * 86400 * 1000);
    }

    if (!dateObj) {
      const dateOnly = str.split(/[ T]/)[0];

      if (dateOnly.includes("/") || dateOnly.includes("-")) {
        const separator = dateOnly.includes("/") ? "/" : "-";
        const parts = dateOnly.split(separator);

        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);

          if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
            let year = p2;
            let month = p1 - 1;
            let day = p0;

            if (parts[0].length === 4 || p0 > 1000) {
              // Format YYYY-MM-DD or YYYY/MM/DD
              year = p0;
              month = p1 - 1;
              day = p2;
            } else {
              // Format where Year is in parts[2]
              if (year < 100) {
                year += 2000;
              }

              // Handle MM/DD/YYYY vs DD/MM/YYYY
              if (p1 > 12) {
                // p1 is definitely DAY (e.g. 28 in 02/28/2026)
                day = p1;
                month = p0 - 1;
              } else if (p0 > 12) {
                // p0 is definitely DAY (e.g. 28 in 28/02/2026)
                day = p0;
                month = p1 - 1;
              } else {
                // Both <= 12 -> Default to DD/MM/YYYY for Indonesian standard
                day = p0;
                month = p1 - 1;
              }
            }

            dateObj = new Date(year, month, day);
          }
        }
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      dateObj = new Date(str);
    }

    if (isNaN(dateObj.getTime())) return str;

    const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const namaBulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const namaHari = daftarHari[dateObj.getDay()];
    const tanggal = dateObj.getDate();
    const bulan = namaBulan[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();

    return `${namaHari}, ${tanggal} ${bulan} ${tahun}`;
  } catch (e) {
    return dateStr;
  }
}
