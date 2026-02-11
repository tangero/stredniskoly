export interface SchoolInspisData {
  redizo: string;

  rocni_skolne: number | null;
  zamereni: string[] | null;
  aktualni_pocet_zaku: number | null;
  nejvyssi_povoleny_pocet_zaku: number | null;

  prijimaci_zkousky: string | null;
  zkousky_z_predmetu: string[] | null;
  pripravne_kurzy: boolean | null;
  dny_otevrenych_dveri: string | null;
  termin_prijimacich_zkousek: string | null;

  vyuka_jazyku: string[] | null;
  clil_metoda: boolean | null;
  clil_jazyky: string[] | null;
  vyuziti_internetu_ve_vyuce: boolean | null;

  odborne_ucebny: string[] | null;
  prostory_telocvik: string[] | null;
  pristup_k_pc: boolean | null;

  bezbariery_pristup: string | null;
  dopravni_dostupnost: string[] | null;
  linka_mhd: string | null;
  nejblizsi_zastavka_m: number | null;
  umisteni_v_obci: string | null;

  // VLNA 2
  specificke_akce: string[] | null;
  zajmove_cinnosti: string[] | null;
  sportovni_kurzy: string[] | null;
  mezinarodni_spoluprace: string[] | null;
  evropske_projekty: boolean | null;
  podpory_zaku: string[] | null;
  pritomnost_specialistu: string[] | null;
  skolni_parlament: boolean | null;
  stipendium: boolean | null;
  spoluprace_s_firmami: string[] | null;
  certifikaty: string[] | null;
  nabidka_dalsiho_vzdelavani: string[] | null;

  completeness_pct: number;
}

export interface InspisDataset {
  generated_at: string;
  source_csv_path: string;
  stats: {
    rows_total: number;
    rows_ss: number;
    schools_total: number;
    schools_with_inspis: number;
    coverage_percentage: number;
    unmapped_questions_top: Array<{ question: string; count: number }>;
  };
  schools: Record<string, SchoolInspisData>;
}
