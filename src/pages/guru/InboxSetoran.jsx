import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const nilaiOptions = [
  { value: "mumtaz", label: "Mumtaz (Istimewa)" },
  { value: "jayyid_jiddan", label: "Jayyid Jiddan (Baik Sekali)" },
  { value: "jayyid", label: "Jayyid (Baik)" },
  { value: "maqbul", label: "Maqbul (Cukup)" },
  { value: "ulang", label: "Ulang" },
];

const statusOptions = [
  { value: "lanjut", label: "✅ Lanjut" },
  { value: "ulang", label: "🔁 Mengulang" },
  { value: "tunda", label: "⏸️ Tunda" },
];

export default function InboxSetoran() {
  const { currentUser } = useAuth();
  const [setoranList, setSetoranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("menunggu"); // menunggu | dinilai | semua
  const [selected, setSelected] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadSetoran() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "setoran"),
        where("guruId", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Urutkan berdasarkan waktu terbaru
      list.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setSetoranList(list);
    } catch (err) {
      console.error("Gagal load setoran:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSetoran();
  }, [currentUser, successMsg]);

  const filtered = setoranList.filter((s) => {
    if (filter === "semua") return true;
    return (s.statusSetoran || "menunggu") === filter;
  });

  const jumlahMenunggu = setoranList.filter(
    (s) => (s.statusSetoran || "menunggu") === "menunggu"
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER + FILTER */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-emerald-700">
              🎙️ Inbox Setoran
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {jumlahMenunggu > 0 ? (
                <span className="text-amber-600 font-medium">
                  🔔 {jumlahMenunggu} setoran menunggu koreksi
                </span>
              ) : (
                "Semua setoran sudah dikoreksi ✅"
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter("menunggu")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === "menunggu"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ⏳ Menunggu ({jumlahMenunggu})
            </button>
            <button
              onClick={() => setFilter("dinilai")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === "dinilai"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ✅ Dinilai
            </button>
            <button
              onClick={() => setFilter("semua")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === "semua"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 Semua ({setoranList.length})
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg">
            {successMsg}
          </div>
        )}
      </div>

      {/* LIST SETORAN */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Memuat setoran...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-gray-500">
            {filter === "menunggu"
              ? "Tidak ada setoran yang menunggu koreksi."
              : "Belum ada setoran."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SetoranCard
              key={s.id}
              setoran={s}
              onNilai={() => setSelected(s)}
            />
          ))}
        </div>
      )}

      {/* MODAL NILAI */}
      {selected && (
        <ModalNilaiSetoran
          setoran={selected}
          onClose={() => setSelected(null)}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            setSelected(null);
            setTimeout(() => setSuccessMsg(""), 4000);
          }}
        />
      )}
    </div>
  );
}

// ============ KOMPONEN KARTU SETORAN ============
function SetoranCard({ setoran, onNilai }) {
  const status = setoran.statusSetoran || "menunggu";
  const waktu = setoran.createdAt?.seconds
    ? new Date(setoran.createdAt.seconds * 1000).toLocaleString("id-ID")
    : "Baru saja";

  return (
    <div
      className={`bg-white rounded-xl shadow p-5 border-l-4 ${
        status === "menunggu" ? "border-amber-500" : "border-emerald-500"
      }`}
    >
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-800">
              {setoran.siswaNama || "Siswa"}
            </p>
            {status === "menunggu" ? (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                ⏳ Menunggu
              </span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                ✅ Dinilai
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700">
            📖 {setoran.jenis === "iqra" ? "Mengaji" : "Hafalan"}
            {setoran.suratNama && ` — ${setoran.suratNama}`}
            {setoran.ayatDari &&
              ` ayat ${setoran.ayatDari}–${setoran.ayatSampai}`}
            {setoran.jenisBuku && ` — ${setoran.jenisBuku}`}
            {setoran.halaman && ` hal. ${setoran.halaman}`}
          </p>

          {setoran.catatanSiswa && (
            <p className="text-xs text-gray-500 mt-1">
              💬 "{setoran.catatanSiswa}"
            </p>
          )}

          <p className="text-xs text-gray-400 mt-1">🕐 {waktu}</p>

          {/* Player Audio */}
          {setoran.audioUrl && (
            <audio
              controls
              src={setoran.audioUrl}
              className="mt-3 w-full max-w-md"
            />
          )}

          {status === "dinilai" && (
            <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
              <p>
                🎯 Nilai: <strong>{setoran.nilaiGuru}</strong> | Status:{" "}
                <strong>{setoran.statusHafalan}</strong>
              </p>
              {setoran.catatanGuru && (
                <p>💬 Koreksi: {setoran.catatanGuru}</p>
              )}
            </div>
          )}
        </div>

        {status === "menunggu" && (
          <button
            onClick={onNilai}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            ✏️ Nilai
          </button>
        )}
      </div>
    </div>
  );
}

// ============ MODAL NILAI ============
function ModalNilaiSetoran({ setoran, onClose, onSuccess }) {
  const [nilai, setNilai] = useState("jayyid_jiddan");
  const [statusHafalan, setStatusHafalan] = useState("lanjut");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "setoran", setoran.id), {
        nilaiGuru: nilai,
        statusHafalan: statusHafalan,
        catatanGuru: catatan,
        statusSetoran: "dinilai",
        dinilaiAt: serverTimestamp(),
      });
      onSuccess(`Setoran ${setoran.siswaNama} berhasil dinilai! 🎉`);
    } catch (err) {
      alert("Gagal simpan: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">✏️ Nilai Setoran</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-800">
              {setoran.siswaNama}
            </p>
            <p className="text-xs text-gray-600">
              📖 {setoran.suratNama} ayat {setoran.ayatDari}–
              {setoran.ayatSampai}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai
            </label>
            <select
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {nilaiOptions.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusHafalan}
              onChange={(e) => setStatusHafalan(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Koreksi
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Alhamdulillah bagus, hanya perlu perhatikan mad thabi'i..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "💾 Simpan Penilaian"}
          </button>
        </form>
      </div>
    </div>
  );
}