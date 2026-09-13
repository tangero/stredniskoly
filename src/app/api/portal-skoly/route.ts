import { NextRequest, NextResponse } from 'next/server';
import {
  validatePortalPayload,
  getNazevSkoly,
  PORTAL_POLE,
  PORTAL_VERZE_PRJIMANI,
  PortalPayload,
} from '@/lib/portal-skol';
import { resolvePortalAuth, PortalKanal, PORTAL_PRODUKCNI_BASE_URL } from '@/lib/portal-magic';
import { posliPotvrzovaciEmail } from '@/lib/portal-email';
import { createSlug } from '@/lib/utils';

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

function buildIssueBody(payload: PortalPayload, kanal: PortalKanal): string {
  const parts = [
    `**Škola:** ${payload.nazev}`,
    `**REDIZO:** ${payload.redizo}`,
    `**Verze přijímání:** ${payload.verze_prijimani}`,
    `**Kanál:** ${kanal}`,
    `**Kontakt editora (interní, nepublikovat):** ${payload.kontakt_email}`,
    ``,
    `## Shrnutí změn`,
    ``,
  ];

  const labels = new Map(PORTAL_POLE.map((p) => [p.key, p.label]));
  labels.set('ubytovani', 'Ubytování');

  let nejakaZmena = false;
  for (const [key, hodnota] of Object.entries(payload.udaje)) {
    if (!hodnota) continue;
    nejakaZmena = true;
    const label = labels.get(key) || key;
    const zobrazena = key === 'ubytovani' ? (hodnota === 'ano' ? 'Ano' : 'Ne') : hodnota;
    parts.push(`- **${label}:** ${zobrazena}`);
  }
  if (payload.udaje_sedi) {
    parts.push(`- **Údaje z datových zdrojů (obory/kapacity 2026):** škola potvrdila, že sedí`);
  }
  if (!nejakaZmena && !payload.udaje_sedi) {
    parts.push(`- (beze změn v polích)`);
  }

  if (payload.nesrovnalost) {
    parts.push(``, `## Nesrovnalost v datech katalogu`, ``, payload.nesrovnalost);
  }

  parts.push(
    ``,
    `## Kompletní payload (pro scripts/portal-moderace.js)`,
    ``,
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  );

  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Portál pro školy není nakonfigurován.' },
      { status: 503 },
    );
  }

  // Rate limiting – IP z x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

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

  // Autorizace: přihlašovací kód NEBO magic token (§2.2) – obojí se rozresolvuje
  // na REDIZO; kód/token nikdy nepíšeme do issue ani do logů
  const auth = await resolvePortalAuth(body);
  if (!auth) {
    return NextResponse.json(
      { error: 'Neplatný nebo zrušený přístup (kód ani odkaz).' },
      { status: 403 },
    );
  }
  const redizo = auth.redizo;

  // Validace payloadu (povolená pole, délky, URL, souhlas, e-mail)
  const vysledek = validatePortalPayload(body);
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
    kontakt_email: vysledek.kontakt_email,
  };

  const issueTitle = `[Portál škol] ${nazev || redizo} (${redizo})`;
  const issueBody = buildIssueBody(payload, auth.kanal);

  // Potvrzovací e-mail editorovi je best-effort: selhání nesmí shodit odeslání
  const base = (process.env.PORTAL_BASE_URL || PORTAL_PRODUKCNI_BASE_URL).replace(/\/$/, '');
  const skolaUrl = nazev ? `${base}/skola/${redizo}-${createSlug(nazev)}` : base;
  const potvrdEmail = () =>
    posliPotvrzovaciEmail({ email: payload.kontakt_email, nazevSkoly: nazev || redizo, skolaUrl });

  try {
    // Pokud už pro REDIZO existuje otevřené issue, přidáme komentář místo duplicity
    const existingIssue = await findOpenIssueForRedizo(token, redizo);

    if (existingIssue !== null) {
      const commentResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/issues/${existingIssue}/comments`,
        {
          method: 'POST',
          headers: githubHeaders(token),
          body: JSON.stringify({ body: `Nová verze návrhu ze dne ${new Date().toISOString().slice(0, 10)}:\n\n${issueBody}` }),
        },
      );
      if (!commentResponse.ok) {
        const errorText = await commentResponse.text();
        console.error('GitHub API error (comment):', commentResponse.status, errorText);
        return NextResponse.json({ error: 'Nepodařilo se odeslat změny.' }, { status: 502 });
      }
      console.log(`✅ Portal submission added as comment to issue #${existingIssue}`);
      const email_odeslan = await potvrdEmail();
      return NextResponse.json({ success: true, issueNumber: existingIssue, email_odeslan });
    }

    let response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify({ title: issueTitle, body: issueBody, labels: [ISSUE_LABEL] }),
    });

    // Label nemusí v repozitáři existovat (422) – zkusíme bez něj
    if (response.status === 422) {
      response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: githubHeaders(token),
        body: JSON.stringify({ title: issueTitle, body: issueBody }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return NextResponse.json({ error: 'Nepodařilo se odeslat změny.' }, { status: 502 });
    }

    const issueData = await response.json();
    console.log(`✅ Portal submission issue #${issueData.number} created`);

    const email_odeslan = await potvrdEmail();
    return NextResponse.json({ success: true, issueNumber: issueData.number, email_odeslan });
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json({ error: 'Nepodařilo se odeslat změny.' }, { status: 500 });
  }
}
