import { NextRequest, NextResponse } from 'next/server';

interface BugReportBody {
  description: string;
  email?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  timestamp?: string;
  // Honeypot field - pokud je vyplněný, je to bot
  website?: string;
}

// In-memory rate limiting: 3 requests per 15 minutes per IP nebo email
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Spam keywords detekce
const SPAM_KEYWORDS = [
  'viagra', 'casino', 'bitcoin', 'crypto', 'loan', 'weight loss',
  'click here', 'buy now', 'limited offer', 'congratulations',
  'winner', 'prize', 'cash', 'make money', 'work from home'
];

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

function detectSpam(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Kontrola spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }

  // Příliš mnoho odkazů
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) {
    return true;
  }

  // Příliš mnoho velkých písmen (KŘIČENÍ)
  const capsCount = (text.match(/[A-ZČĎĚŇŘŠŤŽÁ]/g) || []).length;
  const totalLetters = (text.match(/[a-zA-ZčďěňřšťžáéíóúůýČĎĚŇŘŠŤŽÁÉÍÓÚŮÝ]/g) || []).length;
  if (totalLetters > 20 && capsCount / totalLetters > 0.5) {
    return true;
  }

  return false;
}

async function sendEmailNotification(email: string, issueUrl: string, issueNumber: number) {
  // TODO: Implementovat email notifikaci
  // Možnosti: SendGrid, Resend, Mailgun, nebo vlastní SMTP
  // Pro produkci doporučuji Resend (https://resend.com)

  console.log(`📧 Would send email to ${email} about issue #${issueNumber}: ${issueUrl}`);

  // Příklad s Resend API:
  /*
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY && email) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prijimackynaskolu.cz',
          to: email,
          subject: 'Vaše nahlášení chyby bylo přijato',
          html: `
            <h2>Děkujeme za nahlášení chyby!</h2>
            <p>Vaše hlášení bylo zaznamenáno jako issue #${issueNumber}.</p>
            <p>Můžete sledovat průběh opravy zde: <a href="${issueUrl}">${issueUrl}</a></p>
            <p>Jakmile bude chyba opravena, budeme vás informovat.</p>
            <p>Tým Přijímačky na školu</p>
          `,
        }),
      });
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }
  */
}

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Bug reporting is not configured.' },
      { status: 503 }
    );
  }

  // Rate limiting - zkontrolovat IP
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

  // Honeypot check - pokud je vyplněné pole "website", je to bot
  if (body.website && body.website.trim().length > 0) {
    console.log('🤖 Bot detected (honeypot field filled)');
    return NextResponse.json(
      { error: 'Spam detected.' },
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

  // Spam detection
  if (detectSpam(description)) {
    console.log('🚫 Spam detected in description');
    return NextResponse.json(
      { error: 'Váš příspěvek byl označen jako spam.' },
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

  // Rate limiting - zkontrolovat také email pokud je zadaný
  if (email && isRateLimited(`email:${email}`)) {
    return NextResponse.json(
      { error: 'Příliš mnoho hlášení z tohoto e-mailu. Zkuste to prosím později.' },
      { status: 429 }
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

    const issueData = await response.json();
    const issueNumber = issueData.number;
    const issueUrl = issueData.html_url;

    // Odeslat email notifikaci pokud je email zadaný
    if (email) {
      await sendEmailNotification(email, issueUrl, issueNumber);
    }

    console.log(`✅ Bug report #${issueNumber} created successfully`);

    return NextResponse.json({
      success: true,
      issueNumber: issueNumber,
      issueUrl: issueUrl,
    });
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit hlášení.' },
      { status: 500 }
    );
  }
}
