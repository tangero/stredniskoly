import { NextRequest, NextResponse } from 'next/server';
import {
  validatePortalPayload,
  getNazevSkoly,
  PORTAL_VERZE_PRJIMANI,
  PortalPayload,
} from '@/lib/portal-skol';
import { resolvePortalAuth, PortalKanal, PORTAL_PRODUKCNI_BASE_URL } from '@/lib/portal-magic';
import { posliPotvrzovaciEmail, posliUpozorneniSpravci } from '@/lib/portal-email';
import { createSlug } from '@/lib/utils';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { cteni, jeNasPuvod, prihlasenyZPozadavku } from '@/lib/portal-relace';
import { spravceSkoly, zapisUdalost, type PortalRole } from '@/lib/portal-ucty';
import { zapisUdaje } from '@/lib/portal-profil';
import { posliTelegram } from '@/lib/portal-oznameni';
import { ipZPozadavku, obnovProfily, odpovedNaChybu } from '@/lib/portal-api';

// In-memory rate limiting: 5 požadavků za 15 minut na IP (stejný vzor jako bug-report)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const GITHUB_REPO = 'tangero/stredniskoly';
const ISSUE_LABEL = 'portal-skoly';

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(identifier, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(identifier, recent);
  return false;
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Najde otevřené issue pro stejné REDIZO (aby nedocházelo k duplicitám)
async function findOpenIssueForRedizo(token: string, redizo: string): Promise<number | null> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues?labels=${ISSUE_LABEL}&state=open&per_page=100`,
    { headers: githubHeaders(token) },
  );
  if (!response.ok) return null;
  const issues = (await response.json()) as Array<{ number: number; body?: string | null }>;
  const marker = `REDIZO: ${redizo}`;
  const found = issues.find((i) => i.body?.includes(marker));
  return found ? found.number : null;
}

interface Autor {
  redizo: string;
  kanal: PortalKanal;
  /** Přihlášený editor (kanál účet). */
  role: PortalRole | null;
  /** Rejstříkový odkaz u školy, která už má správce (docs/ucty-portalu-skol-2027.md, 2.2). */
  spravceHosta: PortalRole | null;
}

/**
 * Kdo návrh posílá. S databází účtů platí: relace účtu, nebo rejstříkový odkaz.
 * Přihlašovací kód se nejdřív uplatní jako správce (/api/portal/uplatnit) a
 * formulář přímo neotevírá; jinak by ho mohl dál používat kdokoli, komu byl přeposlán.
 */
async function urciAutora(request: NextRequest, body: Record<string, unknown>): Promise<Autor | { chyba: string; status: number }> {
  if (!jeDbNastavena()) {
    const auth = await resolvePortalAuth(body);
    return auth ? { ...auth, role: null, spravceHosta: null } : { chyba: 'Neplatný nebo zrušený přístup (kód ani odkaz).', status: 403 };
  }
  if (typeof body.ucet === 'string') {
    if (!jeNasPuvod(request)) return { chyba: 'Požadavek nepřišel z našeho webu.', status: 403 };
    const prihlaseny = await prihlasenyZPozadavku(request);
    const role = prihlaseny?.role.find((r) => r.redizo === body.ucet) ?? null;
    if (!role) return { chyba: 'Přihlášení vypršelo. Přihlaste se prosím znovu.', status: 401 };
    return { redizo: role.redizo, kanal: 'ucet', role, spravceHosta: null };
  }
  if (typeof body.kod === 'string' && body.kod.trim()) {
    return { chyba: 'Kód nejdřív použijte na stránce Pro školy k založení účtu.', status: 403 };
  }
  const auth = await resolvePortalAuth(body);
  if (!auth) return { chyba: 'Odkaz vypršel. Požádejte si o nový na stránce Pro školy.', status: 403 };
  return { ...auth, role: null, spravceHosta: await spravceSkoly(cteni, auth.redizo) };
}

/** Kdo návrh poslal, s osobními údaji: jen do soukromého Telegramu. */
function popisAutora(autor: Autor, kontakt: string): string {
  if (autor.role) {
    const r = autor.role;
    return `${r.jmeno}${r.funkce ? `, ${r.funkce}` : ''} (${r.role === 'spravce' ? 'správce' : 'editor'} profilu)`;
  }
  return `${roleAutora(autor)}, kontakt ${kontakt}`;
}

/**
 * Kdo návrh poslal, bez osobních údajů. Repozitář je veřejný, takže do issue
 * nejde jméno, funkce ani e-mail; kontakt je v administraci portálu.
 */
function roleAutora(autor: Autor): string {
  if (autor.role) return `${autor.role.role === 'spravce' ? 'správce' : 'editor'} profilu`;
  if (autor.spravceHosta) return 'host z rejstříkové adresy školy, profil má správce';
  return autor.kanal === 'kod' ? 'přihlašovací kód' : 'rejstříková adresa školy';
}

/**
 * Tělo issue k nesrovnalosti v katalogu. Údaje profilu tudy od 19. 9. 2026
 * nechodí — ty jdou rovnou do portal_profil. Issue zbylo jen na to, co musí
 * vyřešit člověk v datech katalogu, a nese proto jen text školy a odkaz.
 * Repozitář je veřejný: žádné jméno, funkce ani e-mail (PR #111, nález 1).
 */
function buildNesrovnalostBody(payload: PortalPayload, autor: Autor, skolaUrl: string): string {
  return [
    `**Škola:** ${payload.nazev}`,
    `**REDIZO:** ${payload.redizo}`,
    `**Verze přijímání:** ${payload.verze_prijimani}`,
    `**Kanál:** ${autor.kanal}`,
    `**Zadal:** ${roleAutora(autor)} (jméno a kontakt v administraci portálu)`,
    `**Stránka školy:** ${skolaUrl}`,
    ``,
    `## Co škola hlásí`,
    ``,
    payload.nesrovnalost,
  ].join('\n');
}

/**
 * Založí issue k nesrovnalosti, nebo ji přidá komentářem k té otevřené, aby
 * jedna škola neměla deset vláken o témže. Vrací číslo issue.
 */
async function zapisNesrovnalost(
  token: string,
  payload: PortalPayload,
  autor: Autor,
  skolaUrl: string,
): Promise<number | null> {
  const telo = buildNesrovnalostBody(payload, autor, skolaUrl);
  const otevrene = await findOpenIssueForRedizo(token, payload.redizo);

  if (otevrene !== null) {
    const odpoved = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${otevrene}/comments`, {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify({ body: `Další hlášení ze dne ${new Date().toISOString().slice(0, 10)}:\n\n${telo}` }),
    });
    if (!odpoved.ok) throw new Error(`GitHub ${odpoved.status}: ${await odpoved.text()}`);
    return otevrene;
  }

  const titulek = `[Nesrovnalost v datech] ${payload.nazev || payload.redizo} (${payload.redizo})`;
  let odpoved = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({ title: titulek, body: telo, labels: [ISSUE_LABEL] }),
  });
  // Label nemusí v repozitáři existovat (422) – zkusíme bez něj.
  if (odpoved.status === 422) {
    odpoved = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify({ title: titulek, body: telo }),
    });
  }
  if (!odpoved.ok) throw new Error(`GitHub ${odpoved.status}: ${await odpoved.text()}`);
  return (await odpoved.json()).number as number;
}

export async function POST(request: NextRequest) {
  const ip = ipZPozadavku(request.headers);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Příliš mnoho odeslání. Zkuste to prosím za chvíli.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Honeypot – vyplněné pole "website" znamená bot
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    console.log('🤖 Bot detected (honeypot field filled)');
    return NextResponse.json({ error: 'Spam detected.' }, { status: 400 });
  }

  // Profil se zapisuje do databáze; bez ní není kam, a formulář nesmí nic slibovat.
  if (!jeDbNastavena()) {
    return NextResponse.json({ error: 'Portál pro školy není nakonfigurován.' }, { status: 503 });
  }

  // Autorizace se rozresolvuje na REDIZO; kód ani token nepíšeme do issue ani do logů
  const autor = await urciAutora(request, body);
  if ('chyba' in autor) {
    return NextResponse.json({ error: autor.chyba }, { status: autor.status });
  }
  const redizo = autor.redizo;

  // Validace payloadu (povolená pole, délky, URL, souhlas, e-mail). Přihlášený
  // editor kontakt nezadává, bere se z jeho účtu.
  const vysledek = validatePortalPayload(body, { kontaktPovinny: !autor.role });
  if (!vysledek.ok) {
    return NextResponse.json({ error: vysledek.error }, { status: 400 });
  }

  const nazev = await getNazevSkoly(redizo);

  const payload: PortalPayload = {
    redizo,
    nazev,
    verze_prijimani: PORTAL_VERZE_PRJIMANI,
    udaje: vysledek.udaje,
    udaje_sedi: vysledek.udaje_sedi,
    nesrovnalost: vysledek.nesrovnalost,
    souhlas_cc_by: true,
    kontakt_email: vysledek.kontakt_email || autor.role?.email || '',
  };

  const base = (process.env.PORTAL_BASE_URL || PORTAL_PRODUKCNI_BASE_URL).replace(/\/$/, '');
  const skolaUrl = nazev ? `${base}/skola/${redizo}-${createSlug(nazev)}` : base;

  // 1. Zápis profilu. Údaje od školy jdou na web bez předchozí moderace: zadává
  // je ověřený editor školy. Pojistkou není fronta ke schválení, ale zpětná
  // oprava (portal_profil nic nepřepisuje) a oznámení do Telegramu.
  let zmenena: string[];
  try {
    zmenena = await vTransakci((s) =>
      zapisUdaje(s, {
        redizo,
        nazev,
        verze_prijimani: payload.verze_prijimani,
        udaje: payload.udaje,
        roleId: autor.role?.id ?? null,
        zmenuProvedl: autor.kanal,
      }),
    );
  } catch (e) {
    return odpovedNaChybu(e, 'zápis profilu');
  }
  obnovProfily();

  // 2. Nesrovnalost v datech katalogu je jediné, co dál míří do issue: opravit
  // ji musí člověk v datech, ne škola ve svém profilu. Selhání GitHubu už
  // zápis profilu neshodí – podnět zůstane v události a v Telegramu.
  let issueNumber: number | null = null;
  const token = process.env.GITHUB_TOKEN;
  if (payload.nesrovnalost && token) {
    try {
      issueNumber = await zapisNesrovnalost(token, payload, autor, skolaUrl);
    } catch (e) {
      console.error('❌ Portál: nesrovnalost se nepodařilo zapsat do issue', e);
    }
  }

  // 3. Stopa, oznámení a potvrzení. Best-effort: profil je zapsaný, selhání
  // tady nesmí vrátit chybu škole.
  try {
    await zapisUdalost(cteni, redizo, autor.role?.id ?? null, 'profil_zmenen', {
      pole: zmenena,
      kanal: autor.kanal,
      udaje_sedi: payload.udaje_sedi,
      issue: issueNumber ?? undefined,
      nesrovnalost: payload.nesrovnalost ? true : undefined,
      kontakt: autor.role ? undefined : payload.kontakt_email,
    });
    if (autor.spravceHosta) {
      await zapisUdalost(cteni, redizo, null, 'host_z_rejstriku', {
        issue: issueNumber ?? undefined,
        kontakt: payload.kontakt_email,
      });
      await posliUpozorneniSpravci({
        email: autor.spravceHosta.email,
        nazevSkoly: nazev || redizo,
        profilUrl: `${base}/pro-skoly/profil?skola=${redizo}`,
      });
    }
    await posliTelegram(
      [
        `📝 Profil upraven: ${nazev || redizo} (${redizo})`,
        popisAutora(autor, payload.kontakt_email),
        zmenena.length ? `Pole: ${zmenena.join(', ')}` : 'Beze změny v polích',
        skolaUrl,
        ...(issueNumber ? [`⚠️ Nesrovnalost: https://github.com/${GITHUB_REPO}/issues/${issueNumber}`] : []),
      ].join('\n'),
    );
  } catch (e) {
    console.error('❌ Portál: záznam po změně profilu selhal', e);
  }

  // Potvrzovací e-mail je best-effort: selhání nesmí shodit odeslání.
  const email_odeslan = await posliPotvrzovaciEmail({
    email: payload.kontakt_email,
    nazevSkoly: nazev || redizo,
    skolaUrl,
  });
  return NextResponse.json({ success: true, zmenena, issueNumber, email_odeslan });
}
