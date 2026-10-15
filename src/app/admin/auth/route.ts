import { NextResponse } from 'next/server';

// Starý vstup tokenem v adrese (?k=…) je zrušený (#479): token v URL končil
// v logu požadavků. Přihlášení je na /admin/prihlaseni (passkey nebo GitHub).
export async function GET() {
  return new NextResponse('Přihlášení tokenem v adrese je zrušené. Použij /admin/prihlaseni.', { status: 410 });
}
