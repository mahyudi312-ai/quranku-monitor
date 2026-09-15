import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import { uploadAudio } from "../../services/cloudinary";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { suratList } from "../../utils/suratList";

const jenisMengajiList = [
  "Iqra 1", "Iqra 2", "Iqra 3", "Iqra 4", "Iqra 5", "Iqra 6",
  "Tilawati Jilid 1", "Tilawati Jilid 2", "Tilawati Jilid 3",
  "Tilawati Jilid 4", "Tilawati Jilid 5", "Tilawati Jilid 6",
  "Ummi Jilid 1", "Ummi Jilid 2", "Ummi Jilid 3",
  "Ummi Jilid 4", "Ummi Jilid 5", "Ummi Jilid 6",
  "Qiroati Jilid 1", "Qiroati Jilid 2", "Qiroati Jilid 3",
  "Qiroati Jilid 4", "Qiroati Jilid 5", "Qiroati Jilid 6",
  "Al-Qur'an",
];

export default function DashboardSiswa() {
  const { currentUser, logout } = useAuth();
  const [tab, setTab] = useState("rekam");

  return (
    <div className="min-h-screen bg-emerald-50">
      {/* HEADER */}
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">🕌 QuranKu</h1>
            <p className="text-xs opacity-90">Dasbor Siswa</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-sm"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* TAB */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setTab("rekam")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "rekam"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-emerald-600"
            }`}
          >
            🎙️ Rekam Setoran
          </button>
          <button
            onClick={() => setTab("riwayat")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "riwayat"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-emerald-600"
            }`}
          >
            📋 Riwayat Saya
          </button>
        </div>
      </div>

      {/* KONTEN */}
      <main className="max-w-4xl mx-auto p-4">
        <p className="text-sm text-gray-600 mb-4">
          Assalamualaikum, <strong>{currentUser?.email}</strong> 👋
        </p>
        {tab === "rekam" ? <RekamSetoran /> : <RiwayatSetoran />}
      </main>
    </div>
  );
}

// ====================================================
// KOMPONEN 1: REKAM SETORAN
// ====================================================
function RekamSetoran() {
  const { currentUser } = useAuth();
  const [guruList, setGuruList] = useState([]);
  const [guruId, setGuruId] = useState("");

  const [jenis, setJenis] = useState("hafalan"); // hafalan | mengaji
  const [surat, setSurat] = useState("");
  const [ayatDari, setAyatDari] = useState("");
  const [ayatSampai, setAyatSampai] = useState("");
  const [jenisBuku, setJenisBuku] = useState("");
  const [halaman, setHalaman] = useState("");
  const [catatanSiswa, setCatatanSiswa] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [durasi, setDurasi] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Load guru
  useEffect(() => {
    async function loadGuru() {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "guru")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGuruList(list);
        if (list.length > 0) setGuruId(list[0].id);
      } catch (err) {
        console.error("Gagal load guru:", err);
      }
    }
    loadGuru();
  }, []);

  // ====== MULAI REKAM ======
  async function mulaiRekam() {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mr = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setDurasi(0);

      timerRef.current = setInterval(() => {
        setDurasi((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Tidak bisa akses mikrofon. Izinkan akses mikrofon di browser."
      );
    }
  }

  // ====== STOP REKAM ======
  function stopRekam() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // ====== RESET ======
  function resetRekaman() {
    setAudioBlob(null);
    setAudioUrl("");
    setDurasi(0);
  }

  // ====== FORMAT DURASI ======
  function formatDurasi(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ====== KIRIM SETORAN ======
  async function handleKirim() {
    if (!audioBlob) return setErrorMsg("Rekam dulu suaranya!");
    if (!guruId) return setErrorMsg("Pilih guru dulu!");
    if (jenis === "hafalan" && (!surat || !ayatDari || !ayatSampai)) {
      return setErrorMsg("Isi surat & ayat dulu!");
    }
    if (jenis === "mengaji" && (!jenisBuku || !halaman)) {
      return setErrorMsg("Isi jenis buku & halaman dulu!");
    }
    if (durasi < 3) return setErrorMsg("Rekaman minimal 3 detik.");

    setUploading(true);
    setErrorMsg("");
    try {
      // 1. Upload ke Cloudinary
      const file = new File([audioBlob], `setoran-${Date.now()}.webm`, {
        type: "audio/webm",
      });
      const cloudUrl = await uploadAudio(file);

      // 2. Simpan ke Firestore
      const guruData = guruList.find((g) => g.id === guruId);
      await addDoc(collection(db, "setoran"), {
        siswaId: currentUser.uid,
        siswaNama: currentUser.displayName || currentUser.email,
        siswaEmail: currentUser.email,
        guruId: guruId,
        guruEmail: guruData?.email || "",
        jenis,
        suratNo: surat ? Number(surat) : null,
        suratNama: surat
          ? suratList.find((s) => s.no === Number(surat))?.nama
          : "",
        ayatDari: ayatDari ? Number(ayatDari) : null,
        ayatSampai: ayatSampai ? Number(ayatSampai) : null,
        jenisBuku,
        halaman: halaman ? Number(halaman) : null,
        catatanSiswa,
        audioUrl: cloudUrl,
        durasiDetik: durasi,
        statusSetoran: "menunggu",
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Setoran berhasil dikirim ke guru! 🎉");
      // Reset form
      resetRekaman();
      setSurat("");
      setAyatDari("");
      setAyatSampai("");
      setJenisBuku("");
      setHalaman("");
      setCatatanSiswa("");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal kirim: " + err.message);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-4">
      {/* TOMBOL REKAM BESAR */}
      <div className="bg-white rounded-xl shadow p-6 text-center">
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

        {!audioUrl ? (
          <>
            <button
              onClick={isRecording ? stopRekam : mulaiRekam}
              className={`w-32 h-32 rounded-full text-white text-5xl font-bold shadow-lg transition transform active:scale-95 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isRecording ? "⏹️" : "🎙️"}
            </button>
            <p className="mt-4 text-lg font-semibold text-gray-700">
              {isRecording ? "Sedang merekam..." : "Tekan untuk merekam"}
            </p>
            {isRecording && (
              <p className="text-3xl font-bold text-red-600 mt-2">
                {formatDurasi(durasi)}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Maksimal 5 menit. Tekan lagi untuk berhenti.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-emerald-700 mb-3">
              ✅ Rekaman selesai ({formatDurasi(durasi)})
            </p>
            <audio controls src={audioUrl} className="w-full mb-3" />
            <button
              onClick={resetRekaman}
              className="text-red-500 hover:text-red-700 text-sm underline"
            >
              🔄 Rekam ulang
            </button>
          </>
        )}
      </div>

      {/* FORM KETERANGAN */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="font-bold text-gray-800">📝 Keterangan Setoran</h3>

        {/* Pilih Guru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kirim ke Guru
          </label>
          <select
            value={guruId}
            onChange={(e) => setGuruId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {guruList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama} ({g.email})
              </option>
            ))}
          </select>
        </div>

        {/* Jenis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jenis Setoran
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setJenis("hafalan")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                jenis === "hafalan"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              📖 Hafalan
            </button>
            <button
              type="button"
              onClick={() => setJenis("mengaji")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                jenis === "mengaji"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              📚 Mengaji
            </button>
          </div>
        </div>

        {/* Form Hafalan */}
        {jenis === "hafalan" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surat
              </label>
              <select
                value={surat}
                onChange={(e) => setSurat(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Pilih Surat --</option>
                {suratList.map((s) => (
                  <option key={s.no} value={s.no}>
                    {s.no}. {s.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ayat Dari
                </label>
                <input
                  type="number"
                  value={ayatDari}
                  onChange={(e) => setAyatDari(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ayat Sampai
                </label>
                <input
                  type="number"
                  value={ayatSampai}
                  onChange={(e) => setAyatSampai(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="10"
                />
              </div>
            </div>
          </>
        )}

        {/* Form Mengaji */}
        {jenis === "mengaji" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Buku / Jilid
              </label>
              <select
                value={jenisBuku}
                onChange={(e) => setJenisBuku(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Pilih --</option>
                {jenisMengajiList.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Halaman
              </label>
              <input
                type="number"
                value={halaman}
                onChange={(e) => setHalaman(e.target.value)}
                min="1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="12"
              />
            </div>
          </>
        )}

        {/* Catatan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan (opsional)
          </label>
          <textarea
            value={catatanSiswa}
            onChange={(e) => setCatatanSiswa(e.target.value)}
            rows="2"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Mohon dikoreksi tajwidnya ust..."
          />
        </div>

        {/* Tombol Kirim */}
        <button
          onClick={handleKirim}
          disabled={uploading || !audioBlob}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "📤 Mengirim..." : "📤 Kirim ke Guru"}
        </button>
      </div>
    </div>
  );
}

// ====================================================
// KOMPONEN 2: RIWAYAT SETORAN
// ====================================================
function RiwayatSetoran() {
  const { currentUser } = useAuth();
  const [setoranList, setSetoranList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRiwayat() {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, "setoran"),
          where("siswaId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setSetoranList(list);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadRiwayat();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        Memuat riwayat...
      </div>
    );
  }

  if (setoranList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <p className="text-4xl mb-2">📭</p>
        <p className="text-gray-500">Belum ada setoran. Mulai rekam sekarang!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {setoranList.map((s) => {
        const waktu = s.createdAt?.seconds
          ? new Date(s.createdAt.seconds * 1000).toLocaleString("id-ID")
          : "Baru saja";
        const status = s.statusSetoran || "menunggu";

        return (
          <div
            key={s.id}
            className={`bg-white rounded-xl shadow p-5 border-l-4 ${
              status === "menunggu" ? "border-amber-500" : "border-emerald-500"
            }`}
          >
            <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-800">
                  {s.jenis === "hafalan"
                    ? `📖 ${s.suratNama} ayat ${s.ayatDari}–${s.ayatSampai}`
                    : `📚 ${s.jenisBuku} hal. ${s.halaman}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">🕐 {waktu}</p>
              </div>
              {status === "menunggu" ? (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  ⏳ Menunggu
                </span>
              ) : (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  ✅ Dinilai
                </span>
              )}
            </div>

            {s.audioUrl && (
              <audio controls src={s.audioUrl} className="w-full my-2" />
            )}

            {status === "dinilai" && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <p className="text-sm text-gray-700">
                  🎯 Nilai:{" "}
                  <strong className="text-emerald-700">{s.nilaiGuru}</strong>{" "}
                  | Status:{" "}
                  <strong className="text-emerald-700">{s.statusHafalan}</strong>
                </p>
                {s.catatanGuru && (
                  <p className="text-sm text-gray-600 bg-emerald-50 p-2 rounded">
                    💬 <strong>Ustadz:</strong> {s.catatanGuru}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}