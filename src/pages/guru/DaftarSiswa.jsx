import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, auth } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function DaftarSiswa() {
  const { currentUser } = useAuth();
  const [siswaList, setSiswaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [detailSiswa, setDetailSiswa] = useState(null);

  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "123456",
    halaqah: "",
  });

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

  useEffect(() => {
    loadSiswa();
  }, [currentUser, successMsg]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleTambahSiswa(e) {
    e.preventDefault();
    if (!form.nama || !form.email || !form.password) {
      return alert("Nama, email, dan password wajib diisi");
    }
    if (form.password.length < 6) {
      return alert("Password minimal 6 karakter");
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        nama: form.nama,
        email: form.email,
        role: "siswa",
        halaqah: form.halaqah,
        guruId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "siswa_guru"), {
        siswaId: cred.user.uid,
        guruId: currentUser.uid,
        nama: form.nama,
        email: form.email,
        halaqah: form.halaqah,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(`Siswa ${form.nama} berhasil ditambahkan! 🎉`);
      setForm({ nama: "", email: "", password: "123456", halaqah: "" });
      setShowForm(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Email sudah terdaftar. Pakai email lain.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password minimal 6 karakter.");
      } else if (err.code === "auth/invalid-email") {
        setErrorMsg("Format email tidak valid.");
      } else {
        setErrorMsg("Gagal tambah siswa: " + err.message);
      }
    }
    setLoading(false);
  }

  async function handleHapus(siswa) {
    if (
      !confirm(
        `Yakin hapus siswa "${siswa.nama}"? Data hafalan & mengaji tetap tersimpan.`
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "users", siswa.id));
      setSuccessMsg(`Siswa ${siswa.nama} berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Gagal hapus: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-emerald-700">
              👥 Daftar Siswa
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Total: {siswaList.length} siswa
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showForm ? "✖ Tutup" : "➕ Tambah Siswa"}
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleTambahSiswa}
            className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-2">
                💡 Siswa akan otomatis dapat akun. Password default:{" "}
                <strong>123456</strong> (bisa diubah).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Siswa
              </label>
              <input
                type="text"
                name="nama"
                value={form.nama}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ahmad Fauzan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Halaqah / Kelas
              </label>
              <input
                type="text"
                name="halaqah"
                value={form.halaqah}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Halaqah A / Kelas 3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="fauzan@test.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="text"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="123456"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Menambahkan..." : "💾 Simpan Siswa Baru"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {siswaList.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow p-8 text-center">
            <p className="text-4xl mb-2">👥</p>
            <p className="text-gray-500">
              Belum ada siswa. Klik "Tambah Siswa" untuk memulai.
            </p>
          </div>
        ) : (
          siswaList.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                  {s.nama?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">
                    {s.nama}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  {s.halaqah && (
                    <p className="text-xs text-emerald-600 mt-1">
                      🏫 {s.halaqah}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => setDetailSiswa(s)}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium py-2 rounded-lg"
                >
                  📊 Detail
                </button>
                <button
                  onClick={() => handleHapus(s)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-2 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {detailSiswa && (
        <DetailSiswaModal
          siswa={detailSiswa}
          onClose={() => setDetailSiswa(null)}
        />
      )}
    </div>
  );
}

// ====================================================
// KOMPONEN MODAL DETAIL SISWA — DENGAN 2 TAB
// ====================================================
function DetailSiswaModal({ siswa, onClose }) {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("progres");
  const [hafalanList, setHafalanList] = useState([]);
  const [mengajiList, setMengajiList] = useState([]);
  const [ibadahList, setIbadahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIbadah, setSelectedIbadah] = useState(null);
  const [komentar, setKomentar] = useState("");
  const [savingKomentar, setSavingKomentar] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const qH = query(
          collection(db, "hafalan"),
          where("siswaId", "==", siswa.id)
        );
        const snapH = await getDocs(qH);
        const listH = snapH.docs.map((d) => ({ id: d.id, ...d.data() }));
        listH.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setHafalanList(listH);

        const qM = query(
          collection(db, "mengaji"),
          where("siswaId", "==", siswa.id)
        );
        const snapM = await getDocs(qM);
        const listM = snapM.docs.map((d) => ({ id: d.id, ...d.data() }));
        listM.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setMengajiList(listM);

        const qI = query(
          collection(db, "ibadah_harian"),
          where("siswaId", "==", siswa.id)
        );
        const snapI = await getDocs(qI);
        const listI = snapI.docs.map((d) => ({ id: d.id, ...d.data() }));
        listI.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
        setIbadahList(listI);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadData();
  }, [siswa.id]);

  function hitungCentang(checklist) {
    if (!checklist) return 0;
    return Object.values(checklist).filter(Boolean).length;
  }

  async function handleSimpanKomentar() {
    if (!komentar.trim() || !selectedIbadah) return;
    setSavingKomentar(true);
    try {
      await updateDoc(doc(db, "ibadah_harian", selectedIbadah.id), {
        komentarGuru: komentar,
        komentarGuruAt: serverTimestamp(),
        komentarGuruOleh: currentUser.email,
      });

      setIbadahList((prev) =>
        prev.map((i) =>
          i.id === selectedIbadah.id
            ? {
                ...i,
                komentarGuru: komentar,
                komentarGuruOleh: currentUser.email,
              }
            : i
        )
      );
      setSelectedIbadah({
        ...selectedIbadah,
        komentarGuru: komentar,
        komentarGuruOleh: currentUser.email,
      });
      setKomentar("");
      alert("Komentar berhasil disimpan! ✅");
    } catch (err) {
      alert("Gagal simpan komentar: " + err.message);
    }
    setSavingKomentar(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{siswa.nama}</h3>
            <p className="text-xs text-gray-500">{siswa.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✖
          </button>
        </div>

        <div className="border-b bg-gray-50 flex">
          <button
            onClick={() => setTab("progres")}
            className={`flex-1 py-3 text-sm font-medium transition ${
              tab === "progres"
                ? "bg-white text-emerald-700 border-b-2 border-emerald-600"
                : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            📊 Progres
          </button>
          <button
            onClick={() => setTab("ibadah")}
            className={`flex-1 py-3 text-sm font-medium transition ${
              tab === "ibadah"
                ? "bg-white text-emerald-700 border-b-2 border-emerald-600"
                : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            ✅ Laporan Ortu ({ibadahList.length})
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-center text-gray-500">Memuat data...</p>
          ) : (
            <>
              {tab === "progres" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-emerald-700">
                        {hafalanList.length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        📖 Total Hafalan
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-700">
                        {mengajiList.length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        📚 Total Mengaji
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      📖 Hafalan Terakhir
                    </h4>
                    {hafalanList.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Belum ada hafalan.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {hafalanList.slice(0, 5).map((h) => (
                          <div
                            key={h.id}
                            className="text-sm bg-gray-50 rounded p-2 border-l-2 border-emerald-500"
                          >
                            <p className="font-medium">
                              {h.suratNama} ayat {h.ayatDari}–{h.ayatSampai}
                            </p>
                            <p className="text-xs text-gray-500">
                              {h.tanggal} | {h.status} | {h.nilai}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      📚 Mengaji Terakhir
                    </h4>
                    {mengajiList.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Belum ada mengaji.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {mengajiList.slice(0, 5).map((m) => (
                          <div
                            key={m.id}
                            className="text-sm bg-gray-50 rounded p-2 border-l-2 border-blue-500"
                          >
                            <p className="font-medium">
                              {m.jenisLabel} hal. {m.halaman}
                            </p>
                            <p className="text-xs text-gray-500">
                              {m.tanggal} | {m.status} | {m.nilai}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {tab === "ibadah" && (
                <>
                  {ibadahList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-gray-500 text-sm">
                        Orang tua belum mengisi laporan ibadah harian.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ibadahList.map((ibadah) => {
                        const jumlah = hitungCentang(ibadah.checklist);
                        const persen = Math.round((jumlah / 12) * 100);
                        const warna =
                          persen >= 75
                            ? "border-emerald-500 bg-emerald-50"
                            : persen >= 40
                            ? "border-amber-500 bg-amber-50"
                            : "border-red-500 bg-red-50";

                        return (
                          <div
                            key={ibadah.id}
                            className={`border-l-4 rounded p-4 ${warna}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  📅{" "}
                                  {new Date(ibadah.tanggal).toLocaleDateString(
                                    "id-ID",
                                    {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Progres:{" "}
                                  <strong>
                                    {jumlah}/12 ({persen}%)
                                  </strong>
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedIbadah(
                                    selectedIbadah?.id === ibadah.id
                                      ? null
                                      : ibadah
                                  )
                                }
                                className="text-xs bg-white text-emerald-700 px-3 py-1 rounded border border-emerald-300 hover:bg-emerald-50"
                              >
                                {selectedIbadah?.id === ibadah.id
                                  ? "Tutup"
                                  : "Lihat Detail"}
                              </button>
                            </div>

                            {selectedIbadah?.id === ibadah.id && (
                              <div className="mt-3 pt-3 border-t border-gray-300 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(ibadah.checklist || {}).map(
                                    ([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <span
                                          className={
                                            value
                                              ? "text-emerald-600"
                                              : "text-gray-400"
                                          }
                                        >
                                          {value ? "✅" : "⬜"}
                                        </span>
                                        <span className="text-gray-700 capitalize">
                                          {key}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>

                                {ibadah.catatan && (
                                  <div className="bg-white/70 rounded p-2">
                                    <p className="text-xs font-medium text-gray-600 mb-1">
                                      💬 Catatan Orang Tua:
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      {ibadah.catatan}
                                    </p>
                                  </div>
                                )}

                                {ibadah.komentarGuru && (
                                  <div className="bg-emerald-100 rounded p-2 border border-emerald-200">
                                    <p className="text-xs font-medium text-emerald-700 mb-1">
                                      👨‍🏫 Komentar Ustadz (
                                      {ibadah.komentarGuruOleh}):
                                    </p>
                                    <p className="text-sm text-emerald-900">
                                      {ibadah.komentarGuru}
                                    </p>
                                  </div>
                                )}

                                <div className="bg-white rounded p-2 border">
                                  <label className="text-xs font-medium text-gray-600 block mb-1">
                                    Beri Komentar / Apresiasi:
                                  </label>
                                  <textarea
                                    value={komentar}
                                    onChange={(e) =>
                                      setKomentar(e.target.value)
                                    }
                                    rows="2"
                                    className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Alhamdulillah, pertahankan ya..."
                                  />
                                  <button
                                    onClick={handleSimpanKomentar}
                                    disabled={
                                      savingKomentar || !komentar.trim()
                                    }
                                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-50"
                                  >
                                    {savingKomentar
                                      ? "Menyimpan..."
                                      : "💬 Kirim Komentar"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}