import { useState, useRef } from "react";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  readExcelFile,
  downloadTemplateOrtu,
  validateOrtu,
} from "../../utils/excelImport";

export default function ModalImportOrtu({ onClose, onSuccess, currentUser }) {
  const [file, setFile] = useState(null);
  const [ortuList, setOrtuList] = useState([]);
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [cacheSiswa, setCacheSiswa] = useState({});
  const [cacheOrtu, setCacheOrtu] = useState({});
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setHasil(null);

    try {
      const data = await readExcelFile(f);
      setOrtuList(data);
    } catch (err) {
      alert("Gagal baca file: " + err.message);
    }
  }

  // ============ CACHE SISWA ============
  async function cariSiswa(namaAnak) {
    const key = namaAnak.toLowerCase().trim();

    if (cacheSiswa[key] !== undefined) return cacheSiswa[key];

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "siswa"),
        where("nama", "==", namaAnak.trim())
      );
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        const siswa = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setCacheSiswa((prev) => ({ ...prev, [key]: siswa }));
        return siswa;
      }
      setCacheSiswa((prev) => ({ ...prev, [key]: null }));
      return null;
    } catch (err) {
      console.error("Gagal cari siswa:", err);
      return null;
    }
  }

  // ============ CACHE ORTU ============
  async function cariOrtu(emailOrtu) {
    const key = emailOrtu.toLowerCase().trim();

    if (cacheOrtu[key] !== undefined) return cacheOrtu[key];

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "ortu"),
        where("email", "==", key)
      );
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        const ortuData = snap.docs[0].data();
        const result = { uid: ortuData.uid, data: ortuData };
        setCacheOrtu((prev) => ({ ...prev, [key]: result }));
        return result;
      }
      setCacheOrtu((prev) => ({ ...prev, [key]: null }));
      return null;
    } catch (err) {
      console.error("Gagal cari ortu:", err);
      return null;
    }
  }

  // ============ CEK SUDAH TERTAUT ============
  async function cekTautan(ortuUid, siswaId) {
    const q = query(
      collection(db, "ortu_anak"),
      where("ortuId", "==", ortuUid),
      where("siswaId", "==", siswaId)
    );
    const snap = await getDocs(q);
    return snap.docs.length > 0;
  }

  // ============ PROSES IMPORT ============
  async function handleImport() {
    if (ortuList.length === 0) return;
    setLoading(true);
    setCurrentProgress(0);

    const hasilImport = {
      berhasil: [],
      gagal: [],
      total: ortuList.length,
      akunBaru: 0,
      tautanBaru: 0,
    };

    for (let i = 0; i < ortuList.length; i++) {
      const ortu = ortuList[i];
      setCurrentProgress(i + 1);

      // Validasi
      const validation = validateOrtu(ortu);
      if (!validation.valid) {
        hasilImport.gagal.push({
          nama: ortu.nama_ortu || "(kosong)",
          anak: ortu.nama_anak || "(kosong)",
          alasan: validation.error,
        });
        continue;
      }

      // Cari siswa
      const siswa = await cariSiswa(ortu.nama_anak);
      if (!siswa) {
        hasilImport.gagal.push({
          nama: ortu.nama_ortu,
          anak: ortu.nama_anak,
          alasan: `Santri "${ortu.nama_anak}" tidak ditemukan`,
        });
        continue;
      }

      const emailLower = ortu.email_ortu.toLowerCase().trim();

      try {
        // ========== CEK / BUAT AKUN ORTU ==========
        let ortuUid = null;
        let isAkunBaru = false;

        const existingOrtu = await cariOrtu(emailLower);

        if (existingOrtu) {
          // Ortu sudah ada → pakai UID-nya
          ortuUid = existingOrtu.uid;
        } else {
          // Ortu belum ada → buat akun baru
          const cred = await createUserWithEmailAndPassword(
            auth,
            emailLower,
            ortu.password
          );
          ortuUid = cred.user.uid;
          isAkunBaru = true;

          // Simpan user ortu baru
          await addDoc(collection(db, "users"), {
            uid: ortuUid,
            nama: ortu.nama_ortu,
            email: emailLower,
            role: "ortu",
            hubungan: ortu.hubungan,
            createdAt: serverTimestamp(),
          });

          // Update cache
          setCacheOrtu((prev) => ({
            ...prev,
            [emailLower]: {
              uid: ortuUid,
              data: {
                uid: ortuUid,
                nama: ortu.nama_ortu,
                email: emailLower,
                role: "ortu",
              },
            },
          }));

          hasilImport.akunBaru++;
        }

        // ========== CEK APAKAH SUDAH TERTAUT ==========
        const sudahTertaut = await cekTautan(ortuUid, siswa.id);

        if (sudahTertaut) {
          hasilImport.gagal.push({
            nama: ortu.nama_ortu,
            anak: ortu.nama_anak,
            alasan: "Sudah tertaut sebelumnya (duplikat)",
          });
        } else {
          // ========== BUAT TAUTAN ==========
          await addDoc(collection(db, "ortu_anak"), {
            ortuId: ortuUid,
            ortuEmail: emailLower,
            ortuNama: ortu.nama_ortu,
            hubungan: ortu.hubungan,
            siswaId: siswa.id,
            siswaNama: siswa.nama,
            siswaEmail: siswa.email,
            guruId: currentUser.uid,
            createdAt: serverTimestamp(),
          });

          hasilImport.berhasil.push({
            nama: ortu.nama_ortu,
            anak: siswa.nama,
            email: emailLower,
            akunBaru: isAkunBaru,
          });
          hasilImport.tautanBaru++;
        }
      } catch (err) {
        let alasan = err.message;
        if (err.code === "auth/email-already-in-use") {
          alasan = "Email sudah terdaftar sebagai akun non-ortu";
        } else if (err.code === "auth/weak-password") {
          alasan = "Password minimal 6 karakter";
        } else if (err.code === "auth/invalid-email") {
          alasan = "Format email tidak valid";
        } else if (err.code === "auth/network-request-failed") {
          alasan = "Koneksi bermasalah, coba lagi";
        }

        hasilImport.gagal.push({
          nama: ortu.nama_ortu,
          anak: ortu.nama_anak,
          alasan,
        });
      }

      // Delay untuk hindari rate limit
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setHasil(hasilImport);
    setLoading(false);
  }

  function handleSelesai() {
    onSuccess(
      `Import selesai! ${hasil.akunBaru} akun baru dibuat, ${hasil.tautanBaru} tautan berhasil, ${hasil.gagal.length} gagal.`
    );
    onClose();
  }

  const progressPercent = ortuList.length
    ? Math.round((currentProgress / ortuList.length) * 100)
    : 0;

  // Hitung unique ortu di preview
  const uniqueOrtu = new Set(ortuList.map((o) => (o.email_ortu || "").toLowerCase()))
    .size;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">
            👨‍👩‍👧 Import Akun Ortu dari Excel
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ✖
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Download Template */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              Langkah 1: Download Template
            </p>
            <p className="text-xs text-blue-700 mb-3">
              Isi kolom: <strong>nama_ortu, hubungan, nama_anak, email_ortu, password</strong>
            </p>
            <button
              onClick={downloadTemplateOrtu}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              📄 Download Template Excel
            </button>
          </div>

          {/* Info: 1 Ortu Multi Anak */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>Info:</strong> Kalau 1 ortu punya beberapa anak, tulis
              beberapa baris dengan <strong>email_ortu yang sama</strong>. Sistem
              otomatis pakai akun yang sama & tautkan ke semua anak.
            </p>
          </div>

          {/* Step 2: Upload */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-2">
              Langkah 2: Upload File yang Sudah Diisi
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
            />
            {file && (
              <div className="text-xs text-emerald-700 mt-2">
                ✅ File: <strong>{file.name}</strong> — {ortuList.length} baris
                {uniqueOrtu < ortuList.length && (
                  <span className="text-amber-700">
                    {" "}
                    ({uniqueOrtu} ortu unik, {ortuList.length - uniqueOrtu} multi-anak)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {ortuList.length > 0 && !hasil && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Preview ({ortuList.length} baris):
              </p>
              <div className="space-y-1">
                {ortuList.slice(0, 8).map((o, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex gap-2">
                    <span className="font-mono text-gray-400">
                      {String(idx + 1).padStart(2, "0")}.
                    </span>
                    <span className="font-medium">{o.nama_ortu || "-"}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-blue-600">{o.hubungan}</span>
                    <span className="text-gray-400">→</span>
                    <span>{o.nama_anak}</span>
                  </div>
                ))}
                {ortuList.length > 8 && (
                  <p className="text-xs text-gray-400 italic mt-2">
                    ... dan {ortuList.length - 8} lainnya
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">
                  Mengimport... {currentProgress}/{ortuList.length}
                </span>
                <span className="text-emerald-700 font-bold">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Hasil */}
          {hasil && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {hasil.akunBaru}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">🆕 Akun Baru</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {hasil.tautanBaru}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">🔗 Tautan</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {hasil.gagal.length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">❌ Gagal</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-800">
                  ✅ <strong>{hasil.berhasil.length}</strong> ortu berhasil
                  ditautkan ke anak.
                  {hasil.akunBaru > 0 && (
                    <>
                      {" "}
                      Dari jumlah itu, <strong>{hasil.akunBaru}</strong> akun ortu
                      baru dibuat.
                    </>
                  )}
                </p>
              </div>

              {hasil.gagal.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Detail gagal:
                  </p>
                  {hasil.gagal.map((g, idx) => (
                    <div key={idx} className="text-xs text-red-700 mb-1">
                      ❌ <strong>{g.nama}</strong> → {g.anak}: {g.alasan}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex gap-2 pt-2">
            {!hasil ? (
              <>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || ortuList.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? `⏳ Mengimport (${currentProgress}/${ortuList.length})...`
                    : `📥 Import ${ortuList.length} Baris`}
                </button>
              </>
            ) : (
              <button
                onClick={handleSelesai}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg"
              >
                ✅ Selesai
              </button>
            )}
          </div>

          {!loading && ortuList.length > 0 && !hasil && (
            <p className="text-xs text-amber-600 text-center">
              ⚠️ Estimasi waktu: ~{Math.ceil(ortuList.length * 0.5)} detik
              (delay 250ms per baris untuk hindari rate limit Firebase)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}