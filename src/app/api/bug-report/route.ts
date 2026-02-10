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
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.log(`📧 Would send email to ${email} about issue #${issueNumber} (RESEND_API_KEY not set)`);
    return;
  }

  if (!email) {
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Přijímačky na školu <noreply@prijimackynaskolu.cz>',
        to: email,
        subject: '✅ Vaše nahlášení chyby bylo přijato',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0074e4 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e6ed; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #0074e4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
              .info-box { background: #e7f3ff; border-left: 4px solid #0074e4; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; padding: 20px; color: #818c99; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🎉 Děkujeme za nahlášení!</h1>
              </div>

              <div class="content">
                <p>Dobrý den,</p>

                <p>Vaše hlášení chyby bylo úspěšně přijato a zaznamenáno jako <strong>issue #${issueNumber}</strong>.</p>

                <div class="info-box">
                  <strong>🤖 Automatická oprava</strong><br>
                  Pokud je problém jednoduchý, náš AI bot se pokusí o automatickou opravu během několika minut.
                  V opačném případě se na to podíváme ručně.
                </div>

                <p>Můžete sledovat průběh opravy na GitHubu:</p>

                <div style="text-align: center;">
                  <a href="${issueUrl}" class="button">Sledovat opravu</a>
                </div>

                <p>Jakmile bude chyba opravena a nasazena do produkce, budeme vás informovat dalším emailem.</p>

                <p style="margin-top: 30px;">
                  S pozdravem,<br>
                  <strong>Tým Přijímačky na školu</strong>
                </p>
              </div>

              <div class="footer">
                <p>Tento email byl odeslán automaticky. Prosím neodpovídejte na něj.</p>
                <p><a href="https://www.prijimackynaskolu.cz" style="color: #0074e4;">prijimackynaskolu.cz</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (response.ok) {
      console.log(`✅ Email sent to ${email} for issue #${issueNumber}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to send email: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Email notification error:', error);
  }
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
