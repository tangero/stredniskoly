# 🤖 Autonomní Auto-Fix Systém

Tento systém automaticky opravuje bug reporty nahlášené uživateli pomocí AI (Claude přes OpenRouter).

## 🔐 Bezpečnostní vrstva

### 1. **Rate Limiting**
- Max 3 reporty za 15 minut z jedné IP adresy
- Max 3 reporty za 15 minut z jednoho emailu
- In-memory implementace (pro produkci zvážit Redis)

### 2. **Spam Protection**
- **Honeypot field** - skryté pole "website", které normální uživatel nevyplní
- **Spam keywords** - detekce běžných spam slov (viagra, casino, atd.)
- **URL limit** - max 3 odkazy v popisu
- **CAPS detekce** - příliš mnoho velkých písmen = spam

### 3. **AI Validace**
- Před vytvořením issue AI zkontroluje, jestli je report validní
- Kontrola proti nesmyslům, feature requestům, spamu
- Model: Claude 3.5 Haiku (rychlý a levný)

### 4. **Kontrola duplicit**
- TODO: Implementovat kontrolu proti nedávným podobným issues

## 🔧 Nastavení

### 1. GitHub Secrets

V GitHub repository → Settings → Secrets → Actions přidat:

```
OPENROUTER_API_KEY
└─ Získat na https://openrouter.ai/keys
└─ Přidat kredit (doporučeno $5-10 na start)

GITHUB_TOKEN
└─ Automaticky poskytován GitHub Actions
└─ Nic není třeba konfigurovat
```

### 2. OpenRouter nastavení

1. Registrovat na https://openrouter.ai
2. Přidat kredit: Settings → Credits → Add Credit
3. Vytvořit API klíč: Keys → Create Key
4. Přidat do GitHub Secrets jako `OPENROUTER_API_KEY`

### 3. Email notifikace (volitelné)

Pro email notifikace doporučuji **Resend** (https://resend.com):

1. Registrovat na Resend
2. Vytvořit API klíč
3. Přidat jako `RESEND_API_KEY` do environment variables
4. Odkomentovat kód v `src/app/api/bug-report/route.ts`

Alternativy: SendGrid, Mailgun, Postmark

## 🚀 Jak to funguje

### Workflow

```
1. Uživatel nahlásí chybu přes formulář
   ↓
2. Backend validace (rate limit, spam check, délka)
   ↓
3. Vytvoření GitHub issue s labelem "bug-report"
   ↓
4. GitHub Action se spustí automaticky
   ↓
5. Python validátor zkontroluje issue (AI validace)
   ↓
6. Pokud validní: přidá label "auto-fix"
   ↓
7. Auto-fix script:
   - Načte issue a relevantní soubory
   - Zavolá Claude přes OpenRouter
   - Aplikuje změny do kódu
   - Vytvoří branch, commit, push
   - Vytvoří draft Pull Request
   ↓
8. Maintainer zkontroluje PR a případně mergne
   ↓
9. Email notifikace uživateli (pokud zadal email)
```

### Příklad Issue → PR workflow

```bash
# 1. Issue vytvořen
Issue #15: "Nefunguje vyhledávání na mobilu"

# 2. Automatická validace
✅ Validní: true
✅ Auto-fix eligible: true
→ Přidán label "auto-fix"

# 3. Auto-fix běží
🤖 Načítám issue #15
📂 Nalezeno 3 relevantních souborů
🤖 Volám Claude API...
✏️  Aplikuji změny...
📤 Vytvářím branch: auto-fix/issue-15
🔀 Vytvářím Pull Request...

# 4. PR vytvořen
PR #16: "🤖 Auto-fix: Nefunguje vyhledávání na mobilu"
Status: Draft (vyžaduje review)

# 5. Maintainer review
✅ Změny vypadají dobře
✅ Testy prošly
→ Merge to main

# 6. Email notifikace
📧 "Vaše chyba byla opravena!"
```

## 📊 Ceny (leden 2025)

### OpenRouter - Claude Sonnet 4.5
- **Input**: $3 / 1M tokenů
- **Output**: $15 / 1M tokenů

### Typická oprava (~5000 tokenů)
- Input: 4000 tokenů ≈ $0.012
- Output: 1000 tokenů ≈ $0.015
- **Celkem: ~$0.03 per fix**

### Claude 3.5 Haiku (validace) - levnější
- **Validace**: ~200 tokenů ≈ $0.0001

### Estimate pro 100 reportů/měsíc
- 90 spam/invalid (AI validace): $0.01
- 10 validních (auto-fix): $0.30
- **Celkem: ~$0.31/měsíc**

💡 **Velmi levné!** Většinu nákladů tvoří skutečné opravy, ne validace.

## 🎛️ Konfigurace

### Rate Limiting

Upravit v `src/app/api/bug-report/route.ts`:

```typescript
const RATE_LIMIT_MAX = 3;           // Max počet reportů
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;  // Časové okno
```

### Auto-fix kritéria

Upravit v `.github/scripts/validate_issue.py`:

```python
def is_auto_fixable(self, issue_data):
    # Přidat/odebrat keywords pro auto-fix
    fixable_keywords = [
        'nefunguje', 'chyba', 'bug', ...
    ]
```

### OpenRouter modely

Upravit v `.github/scripts/auto_fix_issue.py`:

```python
"models": [
    "anthropic/claude-sonnet-4.5",  # Primární
    "anthropic/claude-3.5-sonnet",  # Fallback 1
    "openai/gpt-4-turbo"            # Fallback 2
]
```

## 🔍 Monitoring & Debugging

### Zobrazit logy GitHub Action

```bash
gh run list --workflow=auto-fix-issues.yml
gh run view <run-id> --log
```

### Testovat validátor lokálně

```bash
python .github/scripts/validate_issue.py <<EOF
{
  "title": "Test issue",
  "body": "Nefunguje vyhledávání",
  "url": "https://www.prijimackynaskolu.cz/"
}
EOF
```

### Testovat auto-fix lokálně

```bash
export OPENROUTER_API_KEY="sk-or-..."
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPOSITORY="tangero/stredniskoly"

python .github/scripts/auto_fix_issue.py 15
```

## 🛡️ Ochrana proti zneužití

### Implementované:
✅ Rate limiting (IP + email)
✅ Honeypot field
✅ Spam keywords detekce
✅ AI validace před issue
✅ Draft PR (vyžaduje manuální schválení)
✅ Max délka textu (2000 znaků)
✅ Email validace

### Další možnosti:
- 🔲 CAPTCHA (např. Cloudflare Turnstile)
- 🔲 Redis pro perzistentní rate limiting
- 🔲 Similarity check proti nedávným issues
- 🔲 User reputation system
- 🔲 Webhook signature verification

## 📈 Metrika úspěšnosti

Sledovat v GitHub Actions:

- **Validace rate**: Kolik % issues je validních?
- **Auto-fix rate**: Kolik % validních issues je auto-fixable?
- **Success rate**: Kolik % auto-fixů je mergnuto?
- **Time to fix**: Jak dlouho trvá oprava?

## 🚨 Troubleshooting

### Issue validace selže
- Zkontrolovat `OPENROUTER_API_KEY`
- Zkontrolovat kredit na OpenRouter
- Podívat se na GitHub Action logs

### Auto-fix vytvoří špatnou opravu
- Claude může udělat chybu
- Proto vždy vytváříme **draft PR**
- Maintainer musí zkontrolovat a schválit

### Rate limit dosažen
- Zvýšit `RATE_LIMIT_MAX` nebo `RATE_LIMIT_WINDOW_MS`
- Implementovat whitelist pro známé uživatele

## 📝 Best Practices

1. **Vždy reviewovat Draft PR** - AI není dokonalá
2. **Sledovat metriky** - kolik oprav je úspěšných?
3. **Upravovat prompt** - pokud Claude dělá časté chyby
4. **Testovat lokálně** - před pushnutím změn
5. **Monitorovat náklady** - sledovat OpenRouter usage

## 🎯 Roadmap

- [ ] Email notifikace (Resend integrace)
- [ ] Duplicates detection
- [ ] Redis rate limiting
- [ ] CAPTCHA protection
- [ ] Success metrics dashboard
- [ ] Auto-merge for trivial fixes
- [ ] Webhook pro real-time updates

## 🤝 Contribu