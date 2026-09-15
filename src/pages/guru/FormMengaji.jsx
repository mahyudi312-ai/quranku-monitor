import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const jenisMengaji = [
  { value: "iqra1", label: "Iqra 1" },
  { value: "iqra2", label: "Iqra 2" },
  { value: "iqra3", label: "Iqra 3" },
  { value: "iqra4", label: "Iqra 4" },
  { value: "iqra5", label: "Iqra 5" },
  { value: "iqra6", label: "Iqra 6" },
  { value: "tilawati", label: "Tilawati" },
  { value: "ummi", label: "Ummi" },
  { value: "qiroati", label: "Qiroati" },
  { value: "alquran", label: "Al-Qur'an" },
];

const statusOptions = [
  { value: "lanjut", label: "✅ Lanjut" },
  { value: "ulang", label: "🔁 Mengulang" },
  { value: "tunda", label: "⏸️ Tunda" },
];

const nilaiOptions = [
  { value: "mumtaz", label: "Mumtaz (Istimewa)" },
  { value: "jayyid_jiddan", label: "Jayyid Jiddan (Baik Sekali)" },
  { value: "jayyid", label: "Jayyid (Baik)" },
  { value: "maqbul", label: "Maqbul (Cukup)" },
  { value: "ulang", label: "Ulang" },
];

export default function FormMengaji() {
  const { currentUser } = useAuth();
  const [siswaList, setSiswaList] = useState([]);
  const [mengajiHariIni, setMengajiHariIni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    siswaId: "",
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: "iqra1",
    halaman: "",
    ayatInfo: "",
    status: "lanjut",
    nilai: "jayyid_jiddan",
    catatan: "",
    lanjutan: "",
  });

  // Load daftar siswa
  useEffect(() => {
    async function loadSiswa() {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "siswa")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSiswaList(list);
      } catch (err) {
        console.error("Gagal load siswa:", err);
      }
    }
    loadSiswa();
  }, [currentUser]);

  // Load mengaji hari ini
  useEffect(() => {
    async function loadMengajiHariIni() {
      if (!currentUser) return;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const q = query(
          collection(db, "mengaji"),
          where("guruId", "==", currentUser.uid),
          where("tanggal", "==", today)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMengajiHariIni(list);
      } catch (err) {
        console.error("Gagal load mengaji:", err);
      }
    }
    loadMengajiHariIni();
  }, [currentUser, successMsg]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.siswaId) return alert("Pilih siswa dulu");
    if (!form.halaman) return alert("Isi halaman dulu");

    setLoading(true);
    try {
      const siswaData = siswaList.find((s) => s.id === form.siswaId);
      await addDoc(collection(db, "mengaji"), {
        ...form,
        halaman: Number(form.halaman),
        jenisLabel:
          jenisMengaji.find((j) => j.value === form.jenis)?.label || "",
        siswaNama: siswaData?.nama || "",
        guruId: currentUser.uid,
        guruEmail: currentUser.email,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Mengaji berhasil disimpan! 🎉");
      setForm({
        ...form,
        halaman: "",
        ayatInfo: "",
        catatan: "",
        lanjutan: "",
      });
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Gagal simpan: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* FORM */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-emerald-700 mb-4">
          📚 Input Mengaji / Iqra
        </h2>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4">
            {successMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Siswa */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Siswa
            </label>
            <select
              name="siswaId"
              value={form.siswaId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- Pilih Siswa --</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              name="tanggal"
              value={form.tanggal}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Jenis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Buku
            </label>
            <select
              name="jenis"
              value={form.jenis}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {jenisMengaji.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>

          {/* Halaman */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Halaman
            </label>
            <input
              type="number"
              name="halaman"
              value={form.halaman}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="12"
            />
          </div>

          {/* Ayat Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ayat / Info Tambahan
            </label>
            <input
              type="text"
              name="ayatInfo"
              value={form.ayatInfo}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Al-Baqarah 25, atau kosongkan"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nilai */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai
            </label>
            <select
              name="nilai"
              value={form.nilai}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {nilaiOptions.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Koreksi
            </label>
            <textarea
              name="catatan"
              value={form.catatan}
              onChange={handleChange}
              rows="2"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Perbaiki panjang pendek, makhraj huruf..."
            />
          </div>

          {/* Lanjutan */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lanjutan Berikutnya
            </label>
            <input
              type="text"
              name="lanjutan"
              value={form.lanjutan}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Iqra 3 halaman 13"
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "💾 Simpan Mengaji"}
            </button>
          </div>
        </form>
      </div>

      {/* DAFTAR MENGAJI HARI INI */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-emerald-700 mb-4">
          📋 Mengaji Hari Ini ({mengajiHariIni.length})
        </h2>

        {mengajiHariIni.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada mengaji hari ini.</p>
        ) : (
          <div className="space-y-3">
            {mengajiHariIni.map((m) => (
              <div
                key={m.id}
                className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded"
              >
                <p className="font-semibold text-gray-800">{m.siswaNama}</p>
                <p className="text-sm text-gray-700">
                  📚 {m.jenisLabel} — Halaman {m.halaman}
                  {m.ayatInfo && ` (${m.ayatInfo})`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {m.status} | Nilai: {m.nilai}
                </p>
                {m.catatan && (
                  <p className="text-xs text-gray-600 mt-1">💬 {m.catatan}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}