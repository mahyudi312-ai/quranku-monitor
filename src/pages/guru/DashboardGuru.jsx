import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import FormHafalan from "./FormHafalan";
import FormMengaji from "./FormMengaji";
import DaftarSiswa from "./DaftarSiswa";
import InboxSetoran from "./InboxSetoran";

export default function DashboardGuru() {
  const { currentUser, logout } = useAuth();
  const [tab, setTab] = useState("hafalan");

  const tabs = [
    { id: "hafalan", label: "📖 Hafalan", komponen: <FormHafalan /> },
    { id: "mengaji", label: "📚 Mengaji", komponen: <FormMengaji /> },
    { id: "siswa", label: "👥 Siswa", komponen: <DaftarSiswa /> },
    { id: "setoran", label: "🎙️ Setoran", komponen: <InboxSetoran /> },
  ];

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">🕌 QuranKu</h1>
            <p className="text-xs opacity-90">Dasbor Guru</p>
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
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
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

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Selamat datang, <strong>{currentUser?.email}</strong>
          </p>
        </div>
        {tabs.find((t) => t.id === tab)?.komponen}
      </main>
    </div>
  );
}