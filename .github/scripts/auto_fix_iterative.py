#!/usr/bin/env python3
"""
Iterativní auto-fix s testováním a feedback loop
"""
import os
import sys
import subprocess
from auto_fix_issue import AutoFixer

class IterativeAutoFixer(AutoFixer):
    """Rozšíření základního auto-fixeru o iterativní přístup"""

    def __init__(self, issue_number, max_attempts=3):
        super().__init__(issue_number)
        self.max_attempts = max_attempts

    def run_tests(self):
        """Spustit testy projektu"""
        print("🧪 Running tests...")

        try:
            # TypeScript check
            result = subprocess.run(
                ['npm', 'run', 'lint'],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                return False, f"Linting failed:\n{result.stderr}"

            # Můžete přidat další testy
            # result = subprocess.run(['npm', 'test'], ...)

            print("✅ Tests passed!")
            return True, "All tests passed"

        except subprocess.TimeoutExpired:
            return False, "Tests timed out"
        except Exception as e:
            return False, f"Error running tests: {e}"

    def fix_with_feedback(self, issue, files_content, previous_attempt, error_message):
        """Opravit s feedback z předchozího pokusu"""
        files_text = "\n\n".join([
            f"### {path}\n```tsx\n{content}\n```"
            for path, content in files_content.items()
        ])

        prompt = f"""Předchozí pokus o opravu selhal. Oprav to znovu s touto zpětnou vazbou.

**Původní issue #{self.issue_number}: {issue['title']}**
{issue['body']}

**Předchozí pokus:**
{previous_attempt[:1000]}...

**Chyba, která se objevila:**
```
{error_message}
```

**Aktuální kód:**
{files_text}

**Úkol:**
Analyzuj chybu a vytvoř NOVOU opravu, která ji vyřeší.

**Formát odpovědi:**
FILE: path/to/file.tsx
CHANGES: Popis změn
```tsx
// Opravený kód
```

EXPLANATION:
Vysvětli co bylo špatně v předchozím pokusu a jak jsi to opravil.
"""

        return self.call_claude(issue, files_content, custom_prompt=prompt)

    def run_iterative(self):
        """Hlavní iterativní workflow"""
        try:
            print(f"🔧 Starting iterative auto-fix for issue #{self.issue_number}")

            # 1. Načíst issue
            issue = self.get_issue_details()
            print(f"📋 Issue: {issue['title']}")

            # 2. Najít relevantní soubory
            files = self.get_relevant_files(issue)
            print(f"📂 Found {len(files)} relevant files")

            previous_attempt = None
            previous_response = None

            # 3. Iterativní pokusy
            for attempt in range(1, self.max_attempts + 1):
                print(f"\n🔄 Attempt {attempt}/{self.max_attempts}")

                # Zavolat Claude (s nebo bez feedbacku)
                if attempt == 1:
                    print("🤖 Initial fix attempt...")
                    claude_response = self.call_claude(issue, files)
                else:
                    print(f"🤖 Retry with feedback (attempt {attempt})...")
                    claude_response = self.fix_with_feedback(
                        issue, files, previous_response, error_message
                    )

                previous_response = claude_response

                # Aplikovat změny
                print("✏️  Applying changes...")
                changed_files, explanation = self.apply_changes(claude_response)

                # Spustit testy
                tests_passed, test_output = self.run_tests()

                if tests_passed:
                    print(f"✅ Fix successful on attempt {attempt}!")

                    # Vytvořit PR
                    branch_name = self.create_branch_and_commit(issue, changed_files, explanation)
                    pr_url = self.create_pull_request(issue, branch_name, explanation)
                    self.comment_on_issue(pr_url)

                    print(f"✅ Auto-fix completed! PR: {pr_url}")
                    return 0

                else:
                    print(f"❌ Tests failed on attempt {attempt}")
                    print(f"Error: {test_output}")

                    # Rollback změny
                    print("↩️  Rolling back changes...")
                    subprocess.run(['git', 'checkout', '.'], check=True)

                    # Uložit chybu pro další pokus
                    error_message = test_output

                    if attempt < self.max_attempts:
                        print(f"🔄 Retrying with feedback...")
                    else:
                        print(f"❌ Max attempts ({self.max_attempts}) reached")

            # Všechny pokusy selhaly
            print("❌ Auto-fix failed after all attempts")
            self.comment_on_issue_failure(
                f"Automatická oprava selhala po {self.max_attempts} pokusech. "
                f"Maintainer bude muset opravu provést ručně."
            )
            return 1

        except Exception as e:
            print(f"❌ Auto-fix error: {e}", file=sys.stderr)
            return 1

    def comment_on_issue_failure(self, message):
        """Přidat komentář při selhání"""
        url = f"https://api.github.com/repos/{self.repo}/issues/{self.issue_number}/comments"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        comment = f"""⚠️ **Automatická oprava selhala**

{message}

Prosím zkontrolujte issue a opravte ručně.

<details>
<summary>Proč to selhalo?</summary>

Možné důvody:
- Problém je příliš složitý pro automatickou opravu
- Chyba vyžaduje změny v logice, ne jen UI
- Testy nejsou správně nakonfigurovány
- AI nepochopila problém správně

</details>"""

        data = {"body": comment}
        requests.post(url, headers=headers, json=data)

def main():
    if len(sys.argv) < 2:
        print("Usage: auto_fix_iterative.py <issue_number> [max_attempts]")
        sys.exit(1)

    issue_number = int(sys.argv[1])
    max_attempts = int(sys.argv[2]) if len(sys.argv) > 2 else 3

    fixer = IterativeAutoFixer(issue_number, max_attempts)
    sys.exit(fixer.run_iterative())

if __name__ == '__main__':
    main()
