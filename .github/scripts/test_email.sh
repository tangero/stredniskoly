#!/bin/bash
# Testovací script pro email notifikace

set -e

echo "🧪 Testování email notifikací"
echo "================================"
echo ""

# Kontrola environment variables
if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ RESEND_API_KEY není nastavený"
    echo "Export: export RESEND_API_KEY='re_...'"
    exit 1
fi

# Zadání emailu
read -p "📧 Zadejte váš testovací email: " TEST_EMAIL

if [ -z "$TEST_EMAIL" ]; then
    echo "❌ Email je povinný"
    exit 1
fi

echo ""
echo "✅ Odesílám testovací email na: $TEST_EMAIL"
echo ""

# Vytvoření dočasného Python scriptu
cat > /tmp/test_resend.py <<EOF
import os
import requests

RESEND_API_KEY = os.getenv('RESEND_API_KEY')
email = '$TEST_EMAIL'

response = requests.post(
    'https://api.resend.com/emails',
    headers={
        'Authorization': f'Bearer {RESEND_API_KEY}',
        'Content-Type': 'application/json',
    },
    json={
        'from': 'Přijímačky na školu <noreply@prijimackynaskolu.cz>',
        'to': email,
        'subject': '🧪 Test email notifikace',
        'html': '''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; line-height: 1.6; color: #28313b; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #0074e4; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e6ed; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧪 Test Email</h1>
                    </div>
                    <div class="content">
                        <p>Tento email je testovací zpráva z <strong>Přijímačky na školu</strong>.</p>
                        <p>Pokud vidíte tento email, email notifikace fungují správně! ✅</p>
                        <p>Tým Přijímačky na školu</p>
                    </div>
                </div>
            </body>
            </html>
        ''',
    }
)

if response.status_code == 200:
    print('✅ Email byl úspěšně odeslán!')
    print(f'📧 Zkontrolujte inbox: {email}')
else:
    print(f'❌ Chyba: {response.status_code}')
    print(response.text)
EOF

# Spustit Python script
python3 /tmp/test_resend.py

# Smazat dočasný soubor
rm /tmp/test_resend.py

echo ""
echo "================================"
echo "✅ Test dokončen!"
echo ""
echo "Zkontrolujte svůj email inbox (včetně spam složky)."
