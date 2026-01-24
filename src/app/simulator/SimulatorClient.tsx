'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  obec: string;
  kraj: string;
  kraj_kod: string;
  typ: string;
  min_body_2025: number;
  index_poptavky_2025: number;
}

interface SchoolsData {
  [key: string]: School;
}

function createSlug(name: string, obor?: string): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (obor) {
    const oborSlug = obor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${oborSlug}`;
  }

  return slug;
}

export function SimulatorClient() {
  const [scoreCj, setScoreCj] = useState(35);
  const [scoreMa, setScoreMa] = useState(35);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [krajFilter, setKrajFilter] = useState('');

  const totalScore = (scoreCj + scoreMa) * 2; // Přepočet na % skór

  useEffect(() => {
    fetch('/schools_data.json')
      .then(res => res.json())
      .then((data: SchoolsData) => {
        const schoolList = Object.values(data);
        setSchools(schoolList);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading schools:', err);
        setLoading(false);
      });
  }, []);

  const kraje = useMemo(() => {
    const krajSet = new Set<string>();
    schools.forEach(s => krajSet.add(s.kraj_kod));
    return Array.from(krajSet).sort();
  }, [schools]);

  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      if (krajFilter && school.kraj_kod !== krajFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          school.nazev.toLowerCase().includes(term) ||
          school.obor.toLowerCase().includes(term) ||
          school.obec.toLowerCase().includes(term)
        );
      }
      return true;
    }).slice(0, 100); // Limit pro výkon
  }, [schools, krajFilter, searchTerm]);

  const selectedSchoolsList = useMemo(() => {
    return schools.filter(s => selectedSchools.has(s.id));
  }, [schools, selectedSchools]);

  const getStatus = (minBody: number) => {
    const diff = totalScore - minBody;
    if (diff >= 10) return { status: 'accepted', label: 'Přijat', color: 'bg-green-100 text-green-800' };
    if (diff >= -10) return { status: 'borderline', label: 'Na hraně', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'rejected', label: 'Nepřijat', color: 'bg-red-100 text-red-800' };
  };

  const stats = useMemo(() => {
    let accepted = 0, borderline = 0, rejected = 0;
    selectedSchoolsList.forEach(school => {
      const status = getStatus(school.min_body_2025);
      if (status.status === 'accepted') accepted++;
      else if (status.status === 'borderline') borderline++;
      else rejected++;
    });
    return { accepted, borderline, rejected };
  }, [selectedSchoolsList, totalScore]);

  const toggleSchool = (id: string) => {
    const newSelected = new Set(selectedSchools);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSchools(newSelected);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-slate-600">Načítám data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Info box o algoritmu */}
      <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-r-xl mb-6">
        <p className="text-sm text-sky-800">
          <strong>Jak funguje přijímání:</strong> Vaše šance závisí pouze na bodech, ne na pořadí priorit.
          Priorita určuje jen to, na kterou školu budete přiřazeni, pokud se dostanete nad čáru u více škol.
          {' '}<Link href="/jak-funguje-prijimani" className="underline font-medium">Zjistit více &rarr;</Link>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Levý panel - vstup */}
        <div className="space-y-6">
          {/* Zadání bodů */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4">Zadej své body</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Český jazyk (0-50)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={scoreCj}
                  onChange={(e) => setScoreCj(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full p-3 border rounded-lg text-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Matematika (0-50)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={scoreMa}
                  onChange={(e) => setScoreMa(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full p-3 border rounded-lg text-lg"
                />
              </div>
            </div>
            <div className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl text-center">
              <div className="text-sm opacity-80">Celkové skóre</div>
              <div className="text-3xl font-bold">{totalScore}</div>
              <div className="text-sm opacity-80">z 200 možných</div>
            </div>
          </div>

          {/* Statistiky výběru */}
          {selectedSchools.size > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Tvůj výběr ({selectedSchools.size})</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
                  <div className="text-xs text-green-600">Přijat</div>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{stats.borderline}</div>
                  <div className="text-xs text-yellow-600">Na hraně</div>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                  <div className="text-xs text-red-600">Nepřijat</div>
                </div>
              </div>
            </div>
          )}

          {/* Filtry */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4">Filtrovat školy</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Kraj</label>
                <select
                  value={krajFilter}
                  onChange={(e) => setKrajFilter(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Všechny kraje</option>
                  {kraje.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Hledat</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Název školy, obor, město..."
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pravý panel - seznam škol */}
        <div className="lg:col-span-2">
          {/* Vybrané školy */}
          {selectedSchools.size > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-semibold mb-4">Vybrané školy</h2>
              <div className="space-y-3">
                {selectedSchoolsList.map(school => {
                  const status = getStatus(school.min_body_2025);
                  const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
                  return (
                    <div key={school.id} className={`p-4 rounded-lg border-l-4 ${status.status === 'accepted' ? 'border-green-500 bg-green-50' : status.status === 'borderline' ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <Link href={`/skola/${slug}`} className="font-medium hover:text-indigo-600">
                            {school.nazev}
                          </Link>
                          <div className="text-sm text-slate-600">{school.obor}</div>
                          <div className="text-xs text-slate-500">{school.obec}</div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <div className="text-sm text-slate-600 mt-1">Min: {school.min_body_2025} bodů</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSchool(school.id)}
                        className="mt-2 text-sm text-red-600 hover:underline"
                      >
                        Odebrat
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seznam škol k výběru */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold mb-4">
              Dostupné školy ({filteredSchools.length}{filteredSchools.length === 100 ? '+' : ''})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSchools.map(school => {
                const isSelected = selectedSchools.has(school.id);
                const status = getStatus(school.min_body_2025);
                return (
                  <div
                    key={school.id}
                    onClick={() => toggleSchool(school.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{school.nazev}</div>
                        <div className="text-xs text-slate-600">{school.obor} • {school.obec}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                          {school.min_body_2025}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
