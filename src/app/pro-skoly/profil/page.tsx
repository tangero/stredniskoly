import { Metadata } from 'next';
import Link from 'next/link';
import { PortalObalka, PortalSkolaNenalezena } from '@/components/portal/PortalEditace';
import { PortalEditForm } from '@/components/portal/PortalEditForm';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';
import { PortalUcet } from '@/components/portal/PortalUcet';
import { getNazevSkoly, getPredvyplnenyProfil, PORTAL_POLE } from '@/lib/portal-skol';
import { potvrzenyProfil } from '@/lib/portal-profil-verejne';
import { cteni, prihlasenyZCookies } from '@/lib/portal-relace';
import { otevrenePozvanky, platneRoleSkoly } from '@/lib/portal-ucty';

export const metadata: Metadata = {
  title: 'Profil školy',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ skola?: string; zprava?: string }>;
}

const ZPRAVY: Record<string, string> = {
  email: 'Novou adresu jsme potvrdili. Odkazy pro přihlášení teď posíláme na ni.',
  'email-neplatny': 'Adresu se nepodařilo změnit. Zkuste to prosím znovu z nastavení účtu.',
};

/**
 * Poslední změna profilu. Nic už nečeká na schválení – údaje jsou na webu –,
 * takže se ukazuje, kdy a kdo je naposledy měnil, a jestli šlo o opravu redakcí.
 */
async function posledniZmena(
  redizo: string,
): Promise<{ kdy: string; kdo: string; redakce: boolean } | null> {
  const r = await cteni.dotaz<{ kdy: string; jmeno: string | null; zdroj: string }>(
    `select p.platne_od as kdy, r.jmeno, p.zdroj
       from portal_profil p left join portal_role r on r.id = p.role_id
      where p.redizo = $1 order by p.platne_od desc limit 1`,
    [redizo],
  );
  const posledni = r.rows[0];
  if (!posledni) return null;
  return {
    kdy: new Date(posledni.kdy).toISOString().slice(0, 10),
    kdo: posledni.jmeno ?? (posledni.zdroj === 'redakce' ? 'redakce' : 'z e-mailu školy z rejstříku'),
    redakce: posledni.zdroj === 'redakce',
  };
}

export default async function PortalProfilPage({ searchParams }: Props) {
  const { skola, zprava } = await searchParams;
  const prihlaseny = await prihlasenyZCookies();

  if (!prihlaseny) {
    return (
      <PortalHlaska nadpis="Přihlaste se">
        <p>Zadejte svůj e-mail, pošleme vám odkaz pro přihlášení. Heslo nepotřebujete.</p>
        <PortalMagicForm />
      </PortalHlaska>
    );
  }

  const ja = prihlaseny.role.find((r) => r.redizo === skola) ?? prihlaseny.role[0];
  const profil = await getPredvyplnenyProfil(ja.redizo, await potvrzenyProfil(ja.redizo));
  if (!profil) return <PortalSkolaNenalezena redizo={ja.redizo} />;

  const [tym, pozvanky, zmena, nazvySkol] = await Promise.all([
    platneRoleSkoly(cteni, ja.redizo),
    ja.role === 'spravce' ? otevrenePozvanky(cteni, ja.redizo) : Promise.resolve([]),
    posledniZmena(ja.redizo),
    Promise.all(prihlaseny.role.map(async (r) => ({ redizo: r.redizo, nazev: (await getNazevSkoly(r.redizo)) || r.redizo }))),
  ]);
  const clen = (r: (typeof tym)[number]) => ({
    id: r.id,
    jmeno: r.jmeno,
    funkce: r.funkce,
    email: r.email,
    role: r.role,
    od: r.platne_od,
  });

  return (
    <PortalObalka>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <nav>
          <Link href="/pro-skoly" className="hover:text-blue-600">
            Portál pro školy
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">Profil školy</span>
        </nav>
        <form method="post" action="/api/portal/odhlasit">
          <button type="submit" className="text-blue-700 hover:underline">
            Odhlásit se
          </button>
        </form>
      </div>

      {zprava && ZPRAVY[zprava] && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{ZPRAVY[zprava]}</div>
      )}

      {nazvySkol.length > 1 && (
        <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Vaše školy">
          {nazvySkol.map((s) => (
            <Link
              key={s.redizo}
              href={`/pro-skoly/profil?skola=${s.redizo}`}
              className={`rounded-full border px-3 py-1 ${s.redizo === ja.redizo ? 'border-[#0074e4] bg-blue-50 text-[#0074e4]' : 'border-[#c9d4e1] text-slate-700 hover:border-[#0074e4]'}`}
            >
              {s.nazev}
            </Link>
          ))}
        </nav>
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{profil.nazev}</h1>
      <p className="text-slate-500 mb-8">
        REDIZO {profil.redizo}
        {profil.obec && <> · {profil.obec}</>} · jste {ja.role === 'spravce' ? 'správce' : 'editor'} profilu
      </p>

      <h2 className="text-lg font-semibold text-slate-900 mb-2">Údaje o škole</h2>
      {zmena && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${zmena.redakce ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-[#c9d4e1] bg-slate-50 text-slate-700'}`}
        >
          {zmena.redakce ? 'Naposledy opravila redakce' : 'Naposledy upraveno'}{' '}
          {new Date(zmena.kdy).toLocaleDateString('cs-CZ')} ({zmena.kdo}).
        </div>
      )}
      <p className="text-sm text-slate-500 mb-4">
        Odeslané údaje se objeví na stránce školy se značkou „potvrdila škola“, obvykle do hodiny.
        Nečekají na schválení. Když v nich najdeme chybu, opravíme ji a dáme vám vědět.
      </p>
      <PortalEditForm auth={{ ucet: ja.redizo }} profil={profil} pole={PORTAL_POLE} vychoziEmail={ja.email} />

      <div className="mt-12 border-t border-[#e3e9f1] pt-8">
        <PortalUcet
          redizo={ja.redizo}
          ja={{ ...clen(ja), zverejnit_jmeno: ja.zverejnit_jmeno }}
          tym={tym.filter((r) => r.id !== ja.id).map(clen)}
          pozvanky={pozvanky.map((p) => ({ id: p.id, email: p.email, plati_do: p.plati_do }))}
        />
      </div>
    </PortalObalka>
  );
}
