# GitHub Email Notifikace - Kompletní průvodce

## 🎯 Cíl
Dostávat emailové notifikace o každém novém issue (zejména bug reportech) v repozitáři.

---

## ✅ Možnost 1: GitHub Watch (NEJJEDNODUŠŠÍ)

### Krok 1: Zapnout Watch
1. Jdi na: https://github.com/tangero/stredniskoly
2. Klikni na **"Watch"** tlačítko (vpravo nahoře, vedle Star)
3. Vyber možnost podle preferencí:

#### Doporučené možnosti:

**🔔 All Activity**
- ✅ Email o každém issue, PR, komentáři
- ⚠️ Může být hodně emailů

**👁️ Custom → Issues + Pull Requests**
- ✅ Email o issues a PR
- ❌ Žádné commit notifikace
- 📧 Vyvážené množství emailů

**⚡ Jen Issues (není v UI, musíš použít CLI):**
```bash
gh api repos/tangero/stredniskoly/subscription -X PUT \
  -f subscribed=true \
  -f ignored=false
```

### Krok 2: Zkontroluj Email nastavení
1. Jdi na: https://github.com/settings/notifications
2. Sekce **"Email notification preferences"**
3. Ujisti se, že je zaškrtnuto:
   - ✅ "Email" v "Watching"
   - ✅ "Issues, pull requests, and discussions"

### Jak to funguje:
- 📧 Dostaneš email ihned po vytvoření issue
- 📧 Dostaneš email při každém komentáři
- 🔕 Můžeš jednotlivé notifikace vypnout tlačítkem "Unsubscribe" v emailu

---

## ⚡ Možnost 2: GitHub Actions (POKROČILÉ)

**Výhody:**
- ✅ Vlastní formát emailu
- ✅ Filtrování podle labelů (jen `bug-report`)
- ✅ Posílat na jiný email než GitHub email
- ✅ HTML formátování

**Nevýhody:**
- ⚠️ Vyžaduje nastavení SMTP
- ⚠️ Potřeba GitHub Secrets

### Krok 1: Vytvoř GitHub Secrets

1. Jdi na: https://github.com/tangero/stredniskoly/settings/secrets/actions
2. Klikni **"New repository secret"**
3. Vytvoř tyto 3 secrety:

#### Secret 1: `MAIL_USERNAME`
```
Název: MAIL_USERNAME
Hodnota: tvuj.email@example.cz
```

#### Secret 2: `MAIL_PASSWORD`
- Pro **Gmail**: Použij "App Password" (ne normální heslo!)
  1. Jdi na: https://myaccount.google.com/apppasswords
  2. Vytvoř nový App Password pro "GitHub Actions"
  3. Zkopíruj vygenerované heslo (např. `abcd efgh ijkl mnop`)

```
Název: MAIL_PASSWORD
Hodnota: abcd efgh ijkl mnop
```

#### Secret 3: `NOTIFICATION_EMAIL`
```
Název: NOTIFICATION_EMAIL
Hodnota: notifikace@example.cz
```

### Krok 2: Workflow soubor je už vytvořen
- Soubor: `.github/workflows/notify-new-issue.yml`
- Automaticky se spustí při každém novém issue s labelem `bug-report`

### Krok 3: Testování
```bash
# Commitni workflow soubor
git add .github/workflows/notify-new-issue.yml
git commit -m "GitHub Actions: Email notifikace pro nové issues"
git push

# Otestuj vytvořením testovacího issue (s labelem bug-report)
gh issue create --title "Test notifikace" --label bug-report --body "Test email"

# Zkontroluj, zda dorazil email
```

### Krok 4: Monitoring
- Jdi na: https://github.com/tangero/stredniskoly/actions
- Zkontroluj, zda workflow běží úspěšně
- V případě chyby se podívej na logy

---

## 📧 Možnost 3: SMTP Nastavení pro různé providery

### Gmail
```yaml
server_address: smtp.gmail.com
server_port: 587
# Poznámka: Musíš zapnout "App Passwords" v Google účtu
```

### Outlook / Hotmail
```yaml
server_address: smtp-mail.outlook.com
server_port: 587
```

### Seznam.cz
```yaml
server_address: smtp.seznam.cz
server_port: 465
secure: true
```

### Vlastní SMTP server
```yaml
server_address: mail.vase-domena.cz
server_port: 587
username: ${{ secrets.MAIL_USERNAME }}
password: ${{ secrets.MAIL_PASSWORD }}
```

---

## 🔔 Možnost 4: Slack / Discord Notifikace (bonus)

### Pro Slack:
```yaml
- name: Poslat do Slacku
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🐛 Nový bug report #${{ github.event.issue.number }}: ${{ github.event.issue.title }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Nový bug report*\n<${{ github.event.issue.html_url }}|#${{ github.event.issue.number }}>: ${{ github.event.issue.title }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Pro Discord:
```yaml
- name: Poslat do Discordu
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    title: "🐛 Nový bug report"
    description: "#${{ github.event.issue.number }}: ${{ github.event.issue.title }}"
    url: ${{ github.event.issue.html_url }}
```

---

## 🎯 Doporučené nastavení

### Pro malý projekt (1-5 issues týdně):
✅ **GitHub Watch → "All Activity"**
- Nejjednodušší
- Žádné extra nastavení
- Funguje okamžitě

### Pro střední projekt (5-20 issues týdně):
✅ **GitHub Watch → "Custom" (Issues only)**
- Méně spamu
- Stále jednoduché

### Pro velký projekt (20+ issues týdně):
✅ **GitHub Actions + Email filter**
- Custom notifikace jen pro `bug-report` label
- Vlastní formát emailu
- Můžeš filtrovat v emailovém klientovi

---

## 🛠️ Troubleshooting

### Email nedorazil (GitHub Watch)
1. Zkontroluj spam složku
2. Ověř nastavení na: https://github.com/settings/notifications
3. Ujisti se, že máš potvrzený email na GitHubu

### Email nedorazil (GitHub Actions)
1. Zkontroluj workflow logs: https://github.com/tangero/stredniskoly/actions
2. Ověř GitHub Secrets (správné heslo?)
3. Zkus jiný SMTP port (587 vs 465)
4. Pro Gmail: ověř, že používáš App Password, ne běžné heslo

### Příliš mnoho emailů
1. GitHub Watch → změň na "Custom"
2. Nebo: Vytvoř Gmail filter pro automatické třídění
3. Nebo: Vypni notifikace pro komentáře (jen nové issues)

---

## 📊 Srovnání možností

| Metoda | Složitost | Rychlost | Customizace | Filtrování |
|--------|-----------|----------|-------------|------------|
| **GitHub Watch** | ⭐ Snadné | ⚡ Okamžité | ❌ Žádná | ⚠️ Omezené |
| **GitHub Actions** | ⭐⭐⭐ Střední | ⚡ 1-2 min | ✅ Plná | ✅ Podle labelů |
| **Slack/Discord** | ⭐⭐ Snadné | ⚡ Okamžité | ✅ Dobrá | ✅ Podle labelů |

---

## ✅ Kontrolní seznam

- [ ] Zapnuto GitHub Watch
- [ ] Zkontrolováno nastavení notifikací
- [ ] (Volitelně) Vytvořen GitHub Actions workflow
- [ ] (Volitelně) Nastaveny GitHub Secrets
- [ ] Otestováno vytvořením testovacího issue
- [ ] Email dorazil správně

---

## 🔗 Odkazy

- [GitHub Notifications Docs](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github)
- [GitHub Actions Send Mail](https://github.com/dawidd6/action-send-mail)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)

---

**Vytvořeno:** 8. 2. 2026
**Pro repozitář:** https://github.com/tangero/stredniskoly
