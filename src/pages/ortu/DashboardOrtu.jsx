import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// ====================================================
// KOMPONEN UTAMA
// ====================================================
export default function DashboardOrtu() {
  const { currentUser, logout } = useAuth();
  const [tab, setTab] = useState("progres");
  const [anakList, setAnakList] = useState([]);

  async function loadAnak() {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "ortu_anak"),
        where("ortuId", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      setAnakList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Gagal load anak:", err);
    }
  }

  useEffect(() => {
    loadAnak();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">🕌 QuranKu</h1>
            <p className="text-xs opacity-90">Dasbor Orang Tua</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-sm"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {[
            { id: "progres", label: "📊 Progres Anak" },
            { id: "ibadah", label: "✅ Ibadah Harian" },
            { id: "taut", label: "🔗 Tautkan Anak" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                tab === t.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-emerald-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        <p className="text-sm text-gray-600 mb-4">
          Assalamualaikum, <strong>{currentUser?.email}</strong> 👋
        </p>

        {tab === "progres" && <ProgresAnak anakList={anakList} />}
        {tab === "ibadah" && <IbadahHarian anakList={anakList} />}
        {tab === "taut" && (
          <TautkanAnak anakList={anakList} onRefresh={loadAnak} />
        )}
      </main>
    </div>
  );
}

// ====================================================
// TAB 1: PROGRES ANAK
// ====================================================
function ProgresAnak({ anakList }) {
  const [selectedAnak, setSelectedAnak] = useState(null);
  const [hafalanList, setHafalanList] = useState([]);
  const [mengajiList, setMengajiList] = useState([]);
  const [setoranList, setSetoranList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (anakList.length > 0 && !selectedAnak) {
      setSelectedAnak(anakList[0]);
    }
  }, [anakList]);

  useEffect(() => {
    async function loadProgres() {
      if (!selectedAnak) return;
      setLoading(true);
      try {
        const siswaId = selectedAnak.siswaId;

        const qH = query(
          collection(db, "hafalan"),
          where("siswaId", "==", siswaId)
        );
        const snapH = await getDocs(qH);
        const listH = snapH.docs.map((d) => ({ id: d.id, ...d.data() }));
        listH.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setHafalanList(listH);

        const qM = query(
          collection(db, "mengaji"),
          where("siswaId", "==", siswaId)
        );
        const snapM = await getDocs(qM);
        const listM = snapM.docs.map((d) => ({ id: d.id, ...d.data() }));
        listM.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setMengajiList(listM);

        const qS = query(
          collection(db, "setoran"),
          where("siswaId", "==", siswaId)
        );
        const snapS = await getDocs(qS);
        const listS = snapS.docs.map((d) => ({ id: d.id, ...d.data() }));
        listS.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setSetoranList(listS);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadProgres();
  }, [selectedAnak]);

  if (anakList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <p className="text-4xl mb-2">🔗</p>
        <p className="text-gray-500">
          Belum ada anak yang ditautkan. Buka tab <strong>Tautkan Anak</strong>{" "}
          untuk memulai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {anakList.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Anak
          </label>
          <select
            value={selectedAnak?.id || ""}
            onChange={(e) =>
              setSelectedAnak(anakList.find((a) => a.id === e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            {anakList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.siswaNama}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedAnak && (
        <>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {selectedAnak.siswaNama?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold">{selectedAnak.siswaNama}</p>
                <p className="text-sm opacity-90">{selectedAnak.siswaEmail}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">
                {hafalanList.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">📖 Hafalan</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {mengajiList.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">📚 Mengaji</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">
                {setoranList.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">🎙️ Setoran</p>
            </div>
          </div>

          {loading && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Memuat data...
            </div>
          )}

          {!loading && (
            <>
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-800 mb-3">
                  📖 Hafalan Terakhir
                </h3>
                {hafalanList.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada hafalan.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {hafalanList.slice(0, 10).map((h) => (
                      <div
                        key={h.id}
                        className="text-sm bg-gray-50 rounded p-3 border-l-4 border-emerald-500"
                      >
                        <p className="font-medium text-gray-800">
                          {h.suratNama} ayat {h.ayatDari}–{h.ayatSampai}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {h.tanggal} | {h.status} | {h.nilai}
                        </p>
                        {h.catatan && (
                          <p className="text-xs text-gray-600 mt-1">
                            💬 {h.catatan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-800 mb-3">
                  📚 Mengaji Terakhir
                </h3>
                {mengajiList.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada mengaji.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {mengajiList.slice(0, 10).map((m) => (
                      <div
                        key={m.id}
                        className="text-sm bg-gray-50 rounded p-3 border-l-4 border-blue-500"
                      >
                        <p className="font-medium text-gray-800">
                          {m.jenisLabel} — hal. {m.halaman}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {m.tanggal} | {m.status} | {m.nilai}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-800 mb-3">
                  🎙️ Setoran Online
                </h3>
                {setoranList.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada setoran.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {setoranList.slice(0, 10).map((s) => (
                      <div
                        key={s.id}
                        className="text-sm bg-gray-50 rounded p-3 border-l-4 border-amber-500"
                      >
                        <p className="font-medium text-gray-800">
                          {s.jenis === "hafalan"
                            ? `📖 ${s.suratNama} ayat ${s.ayatDari}–${s.ayatSampai}`
                            : `📚 ${s.jenisBuku} hal. ${s.halaman}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {s.statusSetoran === "dinilai"
                            ? `✅ Dinilai: ${s.nilaiGuru}`
                            : "⏳ Menunggu dikoreksi guru"}
                        </p>
                        {s.catatanGuru && (
                          <p className="text-xs text-emerald-700 mt-1">
                            💬 {s.catatanGuru}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ====================================================
// TAB 2: IBADAH HARIAN
// ====================================================
const kegiatanList = [
  { id: "subuh", label: "🕌 Sholat Subuh", kategori: "sholat" },
  { id: "dzuhur", label: "🕌 Sholat Dzuhur", kategori: "sholat" },
  { id: "ashar", label: "🕌 Sholat Ashar", kategori: "sholat" },
  { id: "maghrib", label: "🕌 Sholat Maghrib", kategori: "sholat" },
  { id: "isya", label: "🕌 Sholat Isya", kategori: "sholat" },
  { id: "mengaji", label: "📖 Mengaji di Rumah", kategori: "kegiatan" },
  { id: "murojaah", label: "🔁 Murojaah Hafalan", kategori: "kegiatan" },
  { id: "dzikir", label: "📿 Dzikir Pagi/Petang", kategori: "kegiatan" },
  { id: "bantu", label: "🤝 Membantu Orang Tua", kategori: "kegiatan" },
  { id: "belajar", label: "📚 Belajar / PR", kategori: "kegiatan" },
  { id: "kamar", label: "🧹 Merapikan Kamar", kategori: "kegiatan" },
  { id: "sedekah", label: "🎁 Sedekah Hari Ini", kategori: "kegiatan" },
];

function IbadahHarian({ anakList }) {
  const { currentUser } = useAuth();
  const [selectedAnak, setSelectedAnak] = useState(null);
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [checklist, setChecklist] = useState({});
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [existingId, setExistingId] = useState(null);
  const [komentarGuru, setKomentarGuru] = useState(null);

  useEffect(() => {
    if (anakList.length > 0 && !selectedAnak) {
      setSelectedAnak(anakList[0]);
    }
  }, [anakList]);

  useEffect(() => {
    async function loadIbadah() {
      if (!selectedAnak || !tanggal) return;
      setLoading(true);
      setSuccessMsg("");
      setErrorMsg("");
      try {
        const q = query(
          collection(db, "ibadah_harian"),
          where("siswaId", "==", selectedAnak.siswaId),
          where("tanggal", "==", tanggal)
        );
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          const data = snap.docs[0].data();
          setChecklist(data.checklist || {});
          setCatatan(data.catatan || "");
          setExistingId(snap.docs[0].id);
          setKomentarGuru(
            data.komentarGuru
              ? {
                  teks: data.komentarGuru,
                  oleh: data.komentarGuruOleh,
                }
              : null
          );
        } else {
          setChecklist({});
          setCatatan("");
          setExistingId(null);
          setKomentarGuru(null);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadIbadah();
  }, [selectedAnak, tanggal]);

  function toggleItem(id) {
    setChecklist({ ...checklist, [id]: !checklist[id] });
  }

  async function handleSimpan() {
    console.log("🔵 handleSimpan dipanggil");
    console.log("selectedAnak:", selectedAnak);
    console.log("existingId:", existingId);

    if (!selectedAnak) {
      setErrorMsg("Pilih anak dulu");
      return;
    }
    if (!currentUser) {
      setErrorMsg("Sesi login hilang. Silakan login ulang.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (existingId) {
        // Update
        console.log("🔵 Mode UPDATE");
        await updateDoc(doc(db, "ibadah_harian", existingId), {
          checklist,
          catatan,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create baru
        console.log("🔵 Mode CREATE");
        const ref = await addDoc(collection(db, "ibadah_harian"), {
          siswaId: selectedAnak.siswaId,
          siswaNama: selectedAnak.siswaNama,
          ortuId: currentUser.uid,
          ortuEmail: currentUser.email,
          tanggal,
          checklist,
          catatan,
          createdAt: serverTimestamp(),
        });
        setExistingId(ref.id);
      }

      console.log("✅ Simpan berhasil!");
      setSuccessMsg("✅ Ibadah harian berhasil disimpan! 🎉");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("❌ Gagal simpan:", err);
      setErrorMsg("❌ Gagal simpan: " + (err.message || err.code || "Unknown"));
    }
    setLoading(false);
  }

  const totalCentang = Object.values(checklist).filter(Boolean).length;
  const totalItem = kegiatanList.length;

  if (anakList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <p className="text-4xl mb-2">🔗</p>
        <p className="text-gray-500">
          Tautkan anak dulu di tab <strong>Tautkan Anak</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Anak
          </label>
          <select
            value={selectedAnak?.id || ""}
            onChange={(e) =>
              setSelectedAnak(anakList.find((a) => a.id === e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            {anakList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.siswaNama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-100 border-2 border-emerald-500 text-emerald-800 font-semibold p-4 rounded-lg text-center">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-100 border-2 border-red-500 text-red-800 font-semibold p-4 rounded-lg text-center">
          {errorMsg}
        </div>
      )}

      {komentarGuru && (
        <div className="bg-blue-50 rounded-xl shadow p-5 border-l-4 border-blue-500">
          <h3 className="font-bold text-blue-800 mb-2">
            👨‍🏫 Komentar dari Ustadz
          </h3>
          <p className="text-sm text-blue-900 mb-1 italic">
            "{komentarGuru.teks}"
          </p>
          <p className="text-xs text-blue-700">— {komentarGuru.oleh}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-700">Progres hari ini</p>
          <p className="text-sm font-bold text-emerald-700">
            {totalCentang}/{totalItem}
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-emerald-500 h-3 rounded-full transition-all"
            style={{ width: `${(totalCentang / totalItem) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-gray-800 mb-3">🕌 Sholat Wajib 5 Waktu</h3>
        <div className="space-y-2">
          {kegiatanList
            .filter((k) => k.kategori === "sholat")
            .map((k) => (
              <label
                key={k.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checklist[k.id] || false}
                  onChange={() => toggleItem(k.id)}
                  className="w-5 h-5 accent-emerald-600"
                />
                <span className="text-sm text-gray-700">{k.label}</span>
              </label>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-gray-800 mb-3">🏠 Kegiatan di Rumah</h3>
        <div className="space-y-2">
          {kegiatanList
            .filter((k) => k.kategori === "kegiatan")
            .map((k) => (
              <label
                key={k.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checklist[k.id] || false}
                  onChange={() => toggleItem(k.id)}
                  className="w-5 h-5 accent-emerald-600"
                />
                <span className="text-sm text-gray-700">{k.label}</span>
              </label>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catatan Orang Tua
        </label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows="3"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Alhamdulillah hari ini rajin..."
        />
      </div>

      <button
        type="button"
        onClick={handleSimpan}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 text-lg shadow-lg"
      >
        {loading ? "⏳ Menyimpan..." : "💾 Simpan Ibadah Hari Ini"}
      </button>
    </div>
  );
}

// ====================================================
// TAB 3: TAUTKAN ANAK
// ====================================================
function TautkanAnak({ anakList, onRefresh }) {
  const { currentUser } = useAuth();
  const [emailAnak, setEmailAnak] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleTautkan(e) {
    e.preventDefault();
    if (!emailAnak) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", emailAnak.trim().toLowerCase()),
        where("role", "==", "siswa")
      );
      const snap = await getDocs(q);

      if (snap.docs.length === 0) {
        setErrorMsg(
          "Siswa dengan email tersebut tidak ditemukan. Pastikan email benar."
        );
        setLoading(false);
        return;
      }

      const siswa = snap.docs[0].data();
      const siswaId = snap.docs[0].id;

      const qCek = query(
        collection(db, "ortu_anak"),
        where("ortuId", "==", currentUser.uid),
        where("siswaId", "==", siswaId)
      );
      const snapCek = await getDocs(qCek);
      if (snapCek.docs.length > 0) {
        setErrorMsg("Anak ini sudah ditautkan sebelumnya.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "ortu_anak"), {
        ortuId: currentUser.uid,
        ortuEmail: currentUser.email,
        siswaId,
        siswaNama: siswa.nama,
        siswaEmail: siswa.email,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(`Berhasil menautkan ${siswa.nama}! 🎉`);
      setEmailAnak("");
      onRefresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal: " + err.message);
    }
    setLoading(false);
  }

  async function handleHapus(id, nama) {
    if (!confirm(`Hapus tautan dengan ${nama}?`)) return;
    try {
      await deleteDoc(doc(db, "ortu_anak", id));
      onRefresh();
    } catch (err) {
      alert("Gagal hapus: " + err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-800 mb-4">🔗 Tautkan Anak</h3>
        <p className="text-sm text-gray-600 mb-4">
          Masukkan email anak yang terdaftar sebagai siswa di aplikasi.
        </p>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-3">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleTautkan} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Anak
            </label>
            <input
              type="email"
              value={emailAnak}
              onChange={(e) => setEmailAnak(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="fauzan@test.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Menautkan..." : "🔗 Tautkan"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-800 mb-3">
          Daftar Anak Tertaut ({anakList.length})
        </h3>

        {anakList.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada anak yang ditautkan.
          </p>
        ) : (
          <div className="space-y-2">
            {anakList.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-gray-800">{a.siswaNama}</p>
                  <p className="text-xs text-gray-500">{a.siswaEmail}</p>
                </div>
                <button
                  onClick={() => handleHapus(a.id, a.siswaNama)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  🗑️ Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}