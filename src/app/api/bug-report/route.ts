import { NextRequest, NextResponse } from 'next/server';

interface BugReportBody {
  description: string;
  email?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  timestamp?: string;
}

// In-memory rate limiting: 3 requests per 15 minutes per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Bug reporting is not configured.' },
      { status: 503 }
    );
  }

  // Rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Příliš mnoho hlášení. Zkuste to prosím za chvíli.' },
      { status: 429 }
    );
  }

  let body: BugReportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  // Validate description
  const description = (body.description || '').trim();
  if (description.length < 10 || description.length > 2000) {
    return NextResponse.json(
      { error: 'Popis musí mít 10–2000 znaků.' },
      { status: 400 }
    );
  }

  // Validate optional email
  const email = (body.email || '').trim();
  if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json(
      { error: 'Neplatný e-mail.' },
      { status: 400 }
    );
  }

  // Sanitize metadata
  const url = (body.url || '').slice(0, 500);
  const userAgent = (body.userAgent || '').slice(0, 500);
  const viewport = (body.viewport || '').slice(0, 50);
  const timestamp = (body.timestamp || '').slice(0, 30);

  // Build issue title and body
  const titleText = description.length > 80 ? description.slice(0, 80) + '…' : description;
  const issueTitle = `[Bug Report] ${titleText}`;

  const issueBodyParts = [
    `## Popis`,
    ``,
    description,
    ``,
  ];

  if (email) {
    issueBodyParts.push(`**Kontakt:** ${email}`, ``);
  }

  issueBodyParts.push(
    `<details>`,
    `<summary>Technické informace</summary>`,
    ``,
    `- **URL:** ${url}`,
    `- **User Agent:** ${userAgent}`,
    `- **Viewport:** ${viewport}`,
    `- **Čas:** ${timestamp}`,
    ``,
    `</details>`
  );

  const issueBody = issueBodyParts.join('\n');

  try {
    const response = await fetch(
      'https://api.github.com/repos/tangero/stredniskoly/issues',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['bug-report'],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Nepodařilo se vytvořit hlášení.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit hlášení.' },
      { status: 500 }
    );
  }
}
