#!/usr/bin/env python3
"""
Validátor bug reportů - kontrola proti spamu a zneužití
"""
import os
import sys
import json
import re
import requests
from datetime import datetime, timedelta

class IssueValidator:
    def __init__(self):
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY')

    def validate(self, issue_data):
        """
        Vrátí (is_valid, reason, auto_fix_eligible)
        """
        checks = [
            self.check_length(issue_data),
            self.check_language(issue_data),
            self.check_spam_patterns(issue_data),
            self.check_ai_validation(issue_data),
            self.check_duplicates(issue_data),
        ]

        # Pokud nějaká kontrola selhala
        for is_valid, reason in checks:
            if not is_valid:
                return False, reason, False

        # Určit, jestli je vhodný pro auto-fix
        auto_fix_eligible = self.is_auto_fixable(issue_data)

        return True, "Issue je validní", auto_fix_eligible

    def check_length(self, issue_data):
        """Kontrola délky - ne příliš krátké ani dlouhé"""
        body = issue_data.get('body', '')

        if len(body) < 20:
            return False, "Popis je příliš krátký (min 20 znaků)"

        if len(body) > 5000:
            return False, "Popis je příliš dlouhý (max 5000 znaků)"

        return True, "OK"

    def check_language(self, issue_data):
        """Kontrola jazyka - mělo by být česky nebo anglicky"""
        body = issue_data.get('body', '')

        # Jednoduchá heuristika - české/slovenské znaky
        czech_chars = re.findall(r'[áčďéěíňóřšťúůýž]', body.lower())

        # Nebo anglická slova
        english_words = re.findall(r'\b(bug|error|issue|problem|fix|help)\b', body.lower())

        if len(czech_chars) > 0 or len(english_words) > 0:
            return True, "OK"

        return False, "Text není v češtině ani angličtině"

    def check_spam_patterns(self, issue_data):
        """Kontrola spam patternů"""
        body = issue_data.get('body', '').lower()
        url = issue_data.get('url', '')

        # Spam keywords
        spam_keywords = [
            'viagra', 'casino', 'bitcoin', 'crypto', 'loan',
            'weight loss', 'click here', 'buy now', 'limited offer',
            'congratulations', 'winner', 'prize', 'cash',
            'make money', 'work from home', 'млн', 'рублей'
        ]

        for keyword in spam_keywords:
            if keyword in body:
                return False, f"Detekován spam keyword: {keyword}"

        # Příliš mnoho odkazů
        url_count = len(re.findall(r'https?://', body))
        if url_count > 3:
            return False, f"Příliš mnoho odkazů ({url_count})"

        # Kontrola externích odkazů (ne github, ne prijimackynaskolu.cz)
        external_links = re.findall(r'https?://(?!github\.com|prijimackynaskolu\.cz)[\w\-\.]+', body)
        if len(external_links) > 1:
            return False, "Podezřelé externí odkazy"

        return True, "OK"

    def check_ai_validation(self, issue_data):
        """AI validace - je to skutečný bug report?"""
        if not self.openrouter_key:
            return True, "AI validace není nastavena"

        body = issue_data.get('body', '')
        url = issue_data.get('url', '')

        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "anthropic/claude-3.5-haiku",  # Rychlý a levný model
                    "messages": [{
                        "role": "user",
                        "content": f"""Analyzuj tento bug report a urči, jestli je validní a relevantní.

**URL webu:** {url}
**Popis chyby:**
{body}

Odpověz ve formátu JSON:
{{
  "is_valid": true/false,
  "reason": "stručné vysvětlení",
  "is_bug": true/false,
  "is_spam": true/false,
  "is_feature_request": true/false
}}

Bug je validní pokud:
- Popisuje konkrétní problém na webu prijimackynaskolu.cz
- Je jasně srozumitelný
- Není spam/reklama/nesmysl
- Není požadavek na něco úplně jiného než oprava webu
"""
                    }],
                    "max_tokens": 200,
                    "temperature": 0.3
                },
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']

                # Extrahovat JSON z odpovědi
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    validation = json.loads(json_match.group())

                    if validation.get('is_spam'):
                        return False, "AI detekoval spam"

                    if not validation.get('is_valid'):
                        return False, f"AI: {validation.get('reason', 'Není validní')}"

                    if validation.get('is_feature_request'):
                        return False, "Toto je feature request, ne bug report"

                    return True, "AI validace prošla"

            # Pokud AI selže, pustíme to dál
            return True, "AI validace selhala, ale pokračujeme"

        except Exception as e:
            print(f"AI validace error: {e}")
            return True, "AI validace selhala, ale pokračujeme"

    def check_duplicates(self, issue_data):
        """Kontrola duplicit - podobné nedávné issues"""
        # TODO: Implementovat kontrolu proti nedávným issues
        # Prozatím jen log
        return True, "OK"

    def is_auto_fixable(self, issue_data):
        """Určit, jestli je issue vhodný pro automatickou opravu"""
        body = issue_data.get('body', '').lower()
        url = issue_data.get('url', '')

        # Auto-fixable pokud obsahuje klíčová slova
        fixable_keywords = [
            'nefunguje', 'chyba', 'bug', 'error', 'nezobrazuje',
            'špatně', 'nesprávně', 'nejde', 'broken', 'not working'
        ]

        # NE auto-fixable pokud obsahuje
        not_fixable_keywords = [
            'návrh', 'feature', 'přidat', 'vylepšit', 'změnit design',
            'suggestion', 'enhancement', 'improvement', 'new feature'
        ]

        # Kontrola ne-fixable
        for keyword in not_fixable_keywords:
            if keyword in body:
                return False

        # Kontrola fixable
        for keyword in fixable_keywords:
            if keyword in body:
                return True

        # Default: ne auto-fixable pokud nevíme
        return False

def main():
    # Načíst issue data ze stdin nebo argumentů
    if len(sys.argv) > 1:
        issue_json = sys.argv[1]
        issue_data = json.loads(issue_json)
    else:
        issue_data = json.load(sys.stdin)

    validator = IssueValidator()
    is_valid, reason, auto_fix = validator.validate(issue_data)

    result = {
        "valid": is_valid,
        "reason": reason,
        "auto_fix_eligible": auto_fix
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if is_valid else 1)

if __name__ == '__main__':
    main()
