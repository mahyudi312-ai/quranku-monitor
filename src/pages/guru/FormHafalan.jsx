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
import { suratList } from "../../utils/suratList";

// ============ OPSI STATUS ============
const statusOptions = [
  { value: "lanjut", label: "✅ Lanjut" },
  { value: "ulangi", label: "🔁 Ulangi" },
];

// ============ OPSI NILAI ============
const nilaiOptions = [
  { value: "mumtaz", label: "Mumtaz (Istimewa)" },
  { value: "jayyid_jiddan", label: "Jayyid Jiddan (Baik Sekali)" },
  { value: "jayyid", label: "Jayyid (Baik)" },
  { value: "maqbul", label: "Maqbul (Cukup)" },
  { value: "ulang", label: "Ulang" },
];

export default function FormHafalan() {
  const { currentUser } = useAuth();
  const [siswaList, setSiswaList] = useState([]);
  const [hafalanHariIni, setHafalanHariIni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    siswaId: "",
    tanggal: new Date().toISOString().slice(0, 10),
    suratNo: "",
    ayatDari: "",
    ayatSampai: "",
    status: "lanjut",
    nilai: "jayyid_jiddan",
    catatan: "",
    // Hafalan selanjutnya
    suratNoNext: "",
    ayatNext: "",
  });

  // ============ LOAD DAFTAR SISWA ============
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
        // Urutkan berdasarkan nama
        list.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
        setSiswaList(list);
      } catch (err) {
        console.error("Gagal load siswa:", err);
        setErrorMsg("Gagal memuat daftar siswa: " + err.message);
      }
    }
    loadSiswa();
  }, [currentUser]);

  // ============ LOAD HAFALAN HARI INI ============
  useEffect(() => {
    async function loadHafalanHariIni() {
      if (!currentUser) return;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const q = query(
          collection(db, "hafalan"),
          where("guruId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((h) => h.tanggal === today);
        // Urutkan dari yang terbaru
        list.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setHafalanHariIni(list);
      } catch (err) {
        console.error("Gagal load hafalan:", err);
      }
    }
    loadHafalanHariIni();
  }, [currentUser, successMsg]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validasi
    if (!form.siswaId) return setErrorMsg("Pilih santri dulu");
    if (!form.suratNo) return setErrorMsg("Pilih surat dulu");
    if (!form.ayatDari || !form.ayatSampai)
      return setErrorMsg("Isi ayat dari & sampai");

    setLoading(true);
    try {
      const siswaData = siswaList.find((s) => s.id === form.siswaId);
      const suratData = suratList.find((s) => s.no === Number(form.suratNo));
      const suratNextData = form.suratNoNext
        ? suratList.find((s) => s.no === Number(form.suratNoNext))
        : null;

      // Teks hafalan selanjutnya
      let hafalanSelanjutnyaText = "";
      if (suratNextData) {
        hafalanSelanjutnyaText = `${suratNextData.nama}`;
        if (form.ayatNext) {
          hafalanSelanjutnyaText += ` ayat ${form.ayatNext}`;
        }
      }

      await addDoc(collection(db, "hafalan"), {
        siswaId: form.siswaId,
        siswaNama: siswaData?.nama || "",
        siswaEmail: siswaData?.email || "",
        guruId: currentUser.uid,
        guruEmail: currentUser.email,
        tanggal: form.tanggal,
        suratNo: Number(form.suratNo),
        suratNama: suratData?.nama || "",
        ayatDari: Number(form.ayatDari),
        ayatSampai: Number(form.ayatSampai),
        status: form.status,
        nilai: form.nilai,
        catatan: form.catatan.trim(),
        hafalanSelanjutnya: hafalanSelanjutnyaText,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(
        `✅ Hafalan ${siswaData?.nama} - ${suratData?.nama} ayat ${form.ayatDari}-${form.ayatSampai} berhasil disimpan!`
      );

      // Reset form (kecuali siswa & tanggal — biar lanjut ke surat berikutnya)
      setForm({
        siswaId: form.siswaId,
        tanggal: form.tanggal,
        suratNo: "",
        ayatDari: "",
        ayatSampai: "",
        status: "lanjut",
        nilai: "jayyid_jiddan",
        catatan: "",
        suratNoNext: "",
        ayatNext: "",
      });

      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Gagal simpan: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* ============ FORM INPUT ============ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-emerald-700 mb-1">
          📖 Hafalan Santri
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Catat hafalan santri hari ini
        </p>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4 font-medium">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Pilih Santri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1. Pilih Nama Santri <span className="text-red-500">*</span>
            </label>
            <select
              name="siswaId"
              value={form.siswaId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- Pilih Santri --</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} {s.halaqah ? `(${s.halaqah})` : ""}
                </option>
              ))}
            </select>
            {siswaList.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Belum ada santri terdaftar. Tambah di tab 👥 Siswa dulu.
              </p>
            )}
          </div>

          {/* 2. Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2. Tanggal
            </label>
            <input
              type="date"
              name="tanggal"
              value={form.tanggal}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* 3. Surat & Ayat */}
          <div className="bg-emerald-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800">
              3. Surat & Ayat
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nama Surat <span className="text-red-500">*</span>
              </label>
              <select
                name="suratNo"
                value={form.suratNo}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">-- Pilih Surat --</option>
                {suratList.map((s) => (
                  <option key={s.no} value={s.no}>
                    {s.no}. {s.nama} ({s.ayat} ayat)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ayat Dari <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="ayatDari"
                  value={form.ayatDari}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ayat Sampai <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="ayatSampai"
                  value={form.ayatSampai}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              4. Status
            </label>
            <div className="flex gap-3">
              {statusOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 cursor-pointer transition ${
                    form.status === opt.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium"
                      : "border-gray-300 hover:border-gray-400 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={form.status === opt.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Nilai */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              5. Nilai
            </label>
            <select
              name="nilai"
              value={form.nilai}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {nilaiOptions.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Catatan / Koreksi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              6. Catatan / Koreksi
            </label>
            <textarea
              name="catatan"
              value={form.catatan}
              onChange={handleChange}
              rows="3"
              placeholder="Contoh: Perbaiki mad thabi'i, ghunnah kurang jelas, makhraj huruf 'ain perlu dilatih"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* 7. Hafalan Selanjutnya */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">
              7. Hafalan Selanjutnya
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Surat Berikutnya
                </label>
                <select
                  name="suratNoNext"
                  value={form.suratNoNext}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">-- Pilih Surat --</option>
                  {suratList.map((s) => (
                    <option key={s.no} value={s.no}>
                      {s.no}. {s.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ayat
                </label>
                <input
                  type="text"
                  name="ayatNext"
                  value={form.ayatNext}
                  onChange={handleChange}
                  placeholder="11-20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 text-lg shadow-lg"
            >
              {loading ? "⏳ Menyimpan..." : "💾 Simpan Hafalan"}
            </button>
          </div>
        </form>
      </div>

      {/* ============ DAFTAR HAFALAN HARI INI ============ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-emerald-700 mb-4">
          📋 Hafalan Hari Ini ({hafalanHariIni.length})
        </h2>

        {hafalanHariIni.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            Belum ada hafalan hari ini.
          </p>
        ) : (
          <div className="space-y-3">
            {hafalanHariIni.map((h) => {
              const statusLabel =
                statusOptions.find((s) => s.value === h.status)?.label ||
                h.status;
              const nilaiLabel =
                nilaiOptions.find((n) => n.value === h.nilai)?.label ||
                h.nilai;
              const warna =
                h.nilai === "mumtaz"
                  ? "border-emerald-600 bg-emerald-50"
                  : h.nilai === "jayyid_jiddan"
                  ? "border-blue-600 bg-blue-50"
                  : h.nilai === "jayyid"
                  ? "border-amber-600 bg-amber-50"
                  : "border-red-500 bg-red-50";

              return (
                <div
                  key={h.id}
                  className={`border-l-4 rounded-lg p-4 ${warna}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-800">
                        {h.siswaNama}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        📖 {h.suratNama} ayat {h.ayatDari}–{h.ayatSampai}
                      </p>
                    </div>
                    <span className="text-xs bg-white px-2 py-1 rounded border text-gray-600">
                      {new Date(h.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs mt-2">
                    <span className="bg-white px-2 py-1 rounded border">
                      {statusLabel}
                    </span>
                    <span className="bg-white px-2 py-1 rounded border">
                      🎯 {nilaiLabel}
                    </span>
                  </div>

                  {h.catatan && (
                    <div className="mt-2 bg-white/70 rounded p-2 border-l-2 border-gray-300">
                      <p className="text-xs text-gray-600">
                        💬 <strong>Koreksi:</strong> {h.catatan}
                      </p>
                    </div>
                  )}

                  {h.hafalanSelanjutnya && (
                    <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded p-2 border border-blue-200">
                      ➡️ <strong>Selanjutnya:</strong> {h.hafalanSelanjutnya}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}