#!/usr/bin/env python3
"""
Automatická oprava issues pomocí OpenRouter (Claude API)
"""
import os
import sys
import json
import re
import requests
import subprocess
from pathlib import Path

class AutoFixer:
    def __init__(self, issue_number):
        self.issue_number = issue_number
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY')
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.repo = os.getenv('GITHUB_REPOSITORY', 'tangero/stredniskoly')

    def get_issue_details(self):
        """Načíst detaily issue z GitHub API"""
        url = f"https://api.github.com/repos/{self.repo}/issues/{self.issue_number}"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to fetch issue: {response.status_code}")

    def get_relevant_files(self, issue):
        """Inteligentně vybrat soubory relevantní k issue"""
        body = issue.get('body', '').lower()
        url_field = self.extract_url_from_issue(issue)

        # Mapování URL na soubory
        url_to_files = {
            '/': ['src/app/page.tsx', 'src/components/Header.tsx', 'src/components/Footer.tsx'],
            '/simulator': ['src/app/simulator/page.tsx', 'src/app/simulator/SimulatorClient.tsx'],
            '/skoly': ['src/app/skoly/page.tsx'],
            '/dostupnost': ['src/app/dostupnost/page.tsx', 'src/app/dostupnost/DostupnostClient.tsx'],
            '/regiony': ['src/app/regiony/page.tsx'],
        }

        # Detekce keywords pro specifické soubory
        keyword_to_files = {
            'vyhledávání': ['src/components/Header.tsx', 'src/components/SchoolSearch.tsx'],
            'search': ['src/components/Header.tsx', 'src/components/SchoolSearch.tsx'],
            'menu': ['src/components/Header.tsx'],
            'header': ['src/components/Header.tsx'],
            'footer': ['src/components/Footer.tsx'],
            'simulátor': ['src/app/simulator/SimulatorClient.tsx'],
        }

        relevant_files = set()

        # Přidat soubory podle URL
        for path, files in url_to_files.items():
            if path in url_field:
                relevant_files.update(files)

        # Přidat soubory podle keywords
        for keyword, files in keyword_to_files.items():
            if keyword in body:
                relevant_files.update(files)

        # Vždy přidat základní soubory
        relevant_files.add('src/components/Header.tsx')

        # Načíst obsah souborů
        files_content = {}
        for file_path in relevant_files:
            full_path = Path(file_path)
            if full_path.exists():
                with open(full_path, 'r', encoding='utf-8') as f:
                    files_content[file_path] = f.read()

        return files_content

    def extract_url_from_issue(self, issue):
        """Extrahovat URL z issue body"""
        body = issue.get('body', '')
        # Hledat URL pattern
        url_match = re.search(r'https://[^\s<>"]+', body)
        if url_match:
            return url_match.group()

        # Hledat v tech info sekci
        tech_info = re.search(r'URL:\*\*\s*([^\s<>"]+)', body)
        if tech_info:
            return tech_info.group(1)

        return 'https://www.prijimackynaskolu.cz/'

    def call_claude(self, issue, files_content, custom_prompt=None):
        """Zavolat Claude přes OpenRouter"""
        # Pokud je zadán custom prompt, použij ho
        if custom_prompt:
            prompt = custom_prompt
        else:
            # Sestavit kontext
            files_text = "\n\n".join([
                f"### {path}\n```tsx\n{content}\n```"
                for path, content in files_content.items()
            ])

            prompt = f"""Oprav tento bug na webu přijímačky na školu (Next.js + React + TypeScript).

**Issue #{self.issue_number}: {issue['title']}**

**Popis problému:**
{issue['body']}

**Aktuální kód relevantních souborů:**
{files_text}

**Tvoje úkol:**
1. Analyzuj problém
2. Najdi příčinu chyby
3. Navrhni a implementuj opravu

**Formát odpovědi:**
Pro každý soubor, který je třeba upravit:

FILE: cesta/k/souboru.tsx
CHANGES: Stručný popis změn
```tsx
// Kompletní opravený kód souboru
```

EXPLANATION:
Vysvětli co bylo opraveno a proč to funguje.

**Důležité:**
- Zachovej stávající styl kódu
- Neměň funkce, které nesouvisí s bugem
- Dodržuj TypeScript typy
- Používej existující komponenty a utility
"""

        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/tangero/stredniskoly",
                    "X-Title": "Stredniskoly Auto-Fixer"
                },
                json={
                    "model": "z-ai/glm-4.7",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 8000,
                    "temperature": 0.3,
                    # Fallback na jiné modely pokud GLM není dostupný
                    "route": "fallback",
                    "models": [
                        "z-ai/glm-4.7",
                        "anthropic/claude-sonnet-4.5",
                        "anthropic/claude-3.5-sonnet"
                    ]
                },
                timeout=120
            )

            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")

        except Exception as e:
            raise Exception(f"Failed to call Claude: {e}")

    def apply_changes(self, claude_response):
        """Parsovat odpověď Claude a aplikovat změny"""
        # Pattern pro FILE bloky
        pattern = r'FILE:\s*(.+?)\n(?:CHANGES:.*?\n)?```(?:\w+)?\n(.*?)```'
        matches = re.findall(pattern, claude_response, re.DOTALL)

        if not matches:
            raise Exception("Claude nevrátil žádné soubory k úpravě")

        changed_files = []

        for file_path, new_content in matches:
            file_path = file_path.strip()
            print(f"📝 Updating {file_path}")

            # Vytvořit adresáře pokud neexistují
            path = Path(file_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            # Zapsat nový obsah
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content.strip() + '\n')

            changed_files.append(file_path)

        return changed_files, claude_response

    def create_branch_and_commit(self, issue, changed_files, explanation):
        """Vytvořit branch, commit a push"""
        branch_name = f"auto-fix/issue-{self.issue_number}"

        # Git konfigurace
        subprocess.run(['git', 'config', 'user.name', 'Claude Bot'], check=True)
        subprocess.run(['git', 'config', 'user.email', 'claude-bot@prijimackynaskolu.cz'], check=True)

        # Vytvořit a přepnout na branch
        subprocess.run(['git', 'checkout', '-b', branch_name], check=True)

        # Přidat změněné soubory
        for file_path in changed_files:
            subprocess.run(['git', 'add', file_path], check=True)

        # Commit
        commit_message = f"""🤖 Auto-fix: {issue['title']}

Fixes #{self.issue_number}

{explanation[:500]}

Co-Authored-By: GLM-4.7 AI <noreply@prijimackynaskolu.cz>"""

        subprocess.run(['git', 'commit', '-m', commit_message], check=True)

        # Push
        subprocess.run(['git', 'push', 'origin', branch_name], check=True)

        return branch_name

    def create_pull_request(self, issue, branch_name, explanation):
        """Vytvořit Pull Request"""
        url = f"https://api.github.com/repos/{self.repo}/pulls"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        pr_body = f"""## 🤖 Automatická oprava

Fixes #{self.issue_number}

### Popis problému
{issue['body'][:500]}

### Provedené změny
{explanation}

### Testování
Prosím otestujte tuto opravu před mergnutím:
- [ ] Zkontrolovat změněné soubory
- [ ] Otestovat na lokálním prostředí
- [ ] Ověřit, že oprava řeší původní problém

---
🤖 Tuto opravu vytvořil AI agent pomocí GLM-4.7.
Pokud najdete problém, zavřete tento PR a opravte ručně.
"""

        data = {
            "title": f"🤖 Auto-fix: {issue['title']}",
            "body": pr_body,
            "head": branch_name,
            "base": "main",
            "draft": True  # Vytvořit jako draft
        }

        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 201:
            pr = response.json()
            return pr['html_url']
        else:
            raise Exception(f"Failed to create PR: {response.status_code} - {response.text}")

    def comment_on_issue(self, pr_url):
        """Přidat komentář na issue"""
        url = f"https://api.github.com/repos/{self.repo}/issues/{self.issue_number}/comments"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        comment = f"""🤖 **Automatická oprava byla vytvořena!**

Vytvořil jsem draft Pull Request s opravou: {pr_url}

Maintainer zkontroluje změny a případně je schválí. Pokud se oprava osvědčí, bude mergnuta a vaše chyba bude opravena.

Děkujeme za nahlášení!"""

        data = {"body": comment}
        response = requests.post(url, headers=headers, json=data)

        return response.status_code == 201

    def run(self):
        """Hlavní metoda - spustit auto-fix"""
        try:
            print(f"🔧 Starting auto-fix for issue #{self.issue_number}")

            # 1. Načíst issue
            issue = self.get_issue_details()
            print(f"📋 Issue: {issue['title']}")

            # 2. Najít relevantní soubory
            files = self.get_relevant_files(issue)
            print(f"📂 Found {len(files)} relevant files")

            # 3. Zavolat Claude
            print("🤖 Calling Claude via OpenRouter...")
            claude_response = self.call_claude(issue, files)

            # 4. Aplikovat změny
            print("✏️  Applying changes...")
            changed_files, explanation = self.apply_changes(claude_response)

            # 5. Git workflow
            print("📤 Creating branch and commit...")
            branch_name = self.create_branch_and_commit(issue, changed_files, explanation)

            # 6. Vytvořit PR
            print("🔀 Creating Pull Request...")
            pr_url = self.create_pull_request(issue, branch_name, explanation)

            # 7. Komentovat na issue
            print("💬 Commenting on issue...")
            self.comment_on_issue(pr_url)

            print(f"✅ Auto-fix completed! PR: {pr_url}")
            return 0

        except Exception as e:
            print(f"❌ Auto-fix failed: {e}", file=sys.stderr)
            return 1

def main():
    if len(sys.argv) < 2:
        print("Usage: auto_fix_issue.py <issue_number>")
        sys.exit(1)

    issue_number = int(sys.argv[1])
    fixer = AutoFixer(issue_number)
    sys.exit(fixer.run())

if __name__ == '__main__':
    main()
