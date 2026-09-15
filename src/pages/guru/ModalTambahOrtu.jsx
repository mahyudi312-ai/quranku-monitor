import { useState, useEffect } from "react";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function ModalTambahOrtu({ siswa, currentUser, onClose, onSuccess }) {
  const [ortuList, setOrtuList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    nama: "",
    hubungan: "Ayah",
    email: "",
    password: "123456",
  });

  // Generate email otomatis dari nama anak + hubungan
  useEffect(() => {
    const namaAnak = siswa.nama.toLowerCase().replace(/\s+/g, "");
    const hubunganLower = form.hubungan.toLowerCase();
    // Cek ada email dengan format yang sama
    const existingCount = ortuList.filter((o) =>
      o.ortuEmail?.startsWith(hubunganLower)
    ).length;
    const suffix = existingCount > 0 ? existingCount + 1 : "";
    setForm((f) => ({
      ...f,
      email: `${hubunganLower}.${namaAnak}${suffix}@quranku.com`,
    }));
  }, [form.hubungan, siswa.nama, ortuList]);

  // Load daftar ortu yang sudah tertaut ke siswa ini
  async function loadOrtu() {
    setLoadingList(true);
    try {
      const q = query(
        collection(db, "ortu_anak"),
        where("siswaId", "==", siswa.id)
      );
      const snap = await getDocs(q);
      setOrtuList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoadingList(false);
  }

  useEffect(() => {
    loadOrtu();
  }, [siswa.id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.nama || !form.email || !form.password) {
      setErrorMsg("Nama, email, dan password wajib diisi");
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      // 1. Buat akun Firebase Auth untuk ortu
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password
      );

      // 2. Simpan ke collection users (role: ortu)
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        nama: form.nama.trim(),
        email: form.email.trim().toLowerCase(),
        role: "ortu",
        hubungan: form.hubungan,
        createdAt: serverTimestamp(),
      });

      // 3. Tautkan ortu ke siswa
      await addDoc(collection(db, "ortu_anak"), {
        ortuId: cred.user.uid,
        ortuEmail: form.email.trim().toLowerCase(),
        ortuNama: form.nama.trim(),
        hubungan: form.hubungan,
        siswaId: siswa.id,
        siswaNama: siswa.nama,
        siswaEmail: siswa.email,
        guruId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(
        `✅ Akun ${form.hubungan} ${form.nama} berhasil dibuat & tertaut ke ${siswa.nama}!`
      );

      // Reset form (kecuali email — biar ke-generate ulang)
      setForm({
        nama: "",
        hubungan: form.hubungan,
        email: "",
        password: "123456",
      });

      // Reload daftar ortu
      await loadOrtu();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("❌ Email sudah terdaftar. Pakai email lain.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("❌ Password minimal 6 karakter.");
      } else if (err.code === "auth/invalid-email") {
        setErrorMsg("❌ Format email tidak valid.");
      } else {
        setErrorMsg("❌ Gagal tambah ortu: " + err.message);
      }
    }
    setLoading(false);
  }

  async function handleHapusTautan(ortu) {
    if (
      !confirm(
        `Putuskan tautan dengan ${ortu.ortuNama}? Akun ortu tetap ada, tapi tidak bisa lihat ${siswa.nama}.`
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "ortu_anak", ortu.id));
      setSuccessMsg(`Tautan dengan ${ortu.ortuNama} diputuskan.`);
      await loadOrtu();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Gagal hapus: " + err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              👨‍👩‍👧 Akun Orang Tua
            </h3>
            <p className="text-xs text-gray-500">
              Untuk siswa: <strong>{siswa.nama}</strong> ({siswa.email})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ✖
          </button>
        </div>

        <div className="p-6 space-y-5">
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg font-medium">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* FORM TAMBAH ORTU */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-800 mb-3">
              ➕ Tambah Akun Ortu Baru
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nama Ortu *
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={form.nama}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Bpk. Hasan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hubungan *
                  </label>
                  <select
                    name="hubungan"
                    value={form.hubungan}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="Ayah">Ayah</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Wali">Wali</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email (otomatis)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Email ini untuk login ortu. Bisa diedit manual jika perlu.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="123456"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Password default: <strong>123456</strong>. Bisa diganti manual.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 text-sm"
              >
                {loading ? "⏳ Membuat akun..." : "💾 Buat Akun Ortu & Tautkan"}
              </button>
            </form>
          </div>

          {/* DAFTAR ORTU YANG SUDAH TERTAUT */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-gray-800 mb-3">
              📋 Ortu yang Sudah Tertaut ({ortuList.length})
            </h4>

            {loadingList ? (
              <p className="text-sm text-gray-500">Memuat...</p>
            ) : ortuList.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada ortu yang tertaut ke {siswa.nama}.
              </p>
            ) : (
              <div className="space-y-2">
                {ortuList.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {o.hubungan} • {o.ortuNama}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {o.ortuEmail}
                      </p>
                    </div>
                    <button
                      onClick={() => handleHapusTautan(o)}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                      title="Putuskan tautan"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INFO CARA LOGIN ORTU */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>Cara login ortu:</strong> Buka aplikasi → masukkan email
              & password di atas → pilih role <strong>Orang Tua</strong> → ortu
              bisa langsung lihat progres {siswa.nama} tanpa perlu tautkan manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}