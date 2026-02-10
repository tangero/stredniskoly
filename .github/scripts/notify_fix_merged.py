#!/usr/bin/env python3
"""
Poslat email notifikaci když je oprava mergnuta
"""
import os
import sys
import requests
import re

def extract_email_from_issue(issue_body):
    """Extrahovat email z issue body"""
    # Hledat email v kontakt sekci
    match = re.search(r'\*\*Kontakt:\*\*\s*([^\s<>"]+@[^\s<>"]+)', issue_body)
    if match:
        return match.group(1).strip()

    # Obecné hledání emailu
    match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', issue_body)
    if match:
        return match.group(1).strip()

    return None

def send_fix_notification(email, issue_number, issue_title, pr_url):
    """Poslat email o opravě"""
    RESEND_API_KEY = os.getenv('RESEND_API_KEY')

    if not RESEND_API_KEY:
        print(f"⚠️ RESEND_API_KEY not set, skipping email")
        return

    if not email:
        print(f"⚠️ No email found in issue #{issue_number}")
        return

    try:
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'from': 'Přijímačky na školu <noreply@prijimackynaskolu.cz>',
                'to': email,
                'subject': f'✅ Vaše nahlášená chyba byla opravena!',
                'html': f'''
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #28313b; }}
                            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                            .header {{ background: linear-gradient(135deg, #38caaa 0%, #2ea88a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e6ed; border-top: none; border-radius: 0 0 8px 8px; }}
                            .button {{ display: inline-block; background: #0074e4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }}
                            .success-box {{ background: #e8f8f5; border-left: 4px solid #38caaa; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                            .footer {{ text-align: center; padding: 20px; color: #818c99; font-size: 14px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 24px;">✅ Chyba opravena!</h1>
                            </div>

                            <div class="content">
                                <p>Dobrý den,</p>

                                <p>Máme dobrou zprávu! Chyba, kterou jste nahlásili, byla úspěšně opravena a nasazena do produkce.</p>

                                <div class="success-box">
                                    <strong>Issue #{issue_number}:</strong> {issue_title}
                                </div>

                                <p>Oprava je nyní živá na <a href="https://www.prijimackynaskolu.cz">prijimackynaskolu.cz</a>.</p>

                                <p>Můžete se podívat na detaily opravy:</p>

                                <div style="text-align: center;">
                                    <a href="{pr_url}" class="button">Zobrazit opravu</a>
                                </div>

                                <p style="margin-top: 30px;">
                                    Děkujeme za vaši pomoc při vylepšování našeho webu! 🙏
                                </p>

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
                ''',
            }
        )

        if response.status_code == 200:
            print(f'✅ Fix notification sent to {email}')
        else:
            print(f'❌ Failed to send email: {response.status_code} - {response.text}')

    except Exception as e:
        print(f'❌ Error sending notification: {e}')

def main():
    issue_number = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.getenv('ISSUE_NUMBER', '0'))
    pr_url = sys.argv[2] if len(sys.argv) > 2 else os.getenv('PR_URL', '')

    if not issue_number:
        print("Error: Issue number required")
        sys.exit(1)

    # Načíst issue z GitHub API
    github_token = os.getenv('GITHUB_TOKEN')
    repo = os.getenv('GITHUB_REPOSITORY', 'tangero/stredniskoly')

    response = requests.get(
        f'https://api.github.com/repos/{repo}/issues/{issue_number}',
        headers={
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json',
        }
    )

    if response.status_code != 200:
        print(f"Failed to fetch issue: {response.status_code}")
        sys.exit(1)

    issue = response.json()
    email = extract_email_from_issue(issue['body'])

    if email:
        send_fix_notification(email, issue_number, issue['title'], pr_url)
    else:
        print(f"No email found in issue #{issue_number}")

if __name__ == '__main__':
    main()
