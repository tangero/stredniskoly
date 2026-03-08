# Claude Code Instructions - stredniskoly

## Knowledge Base Integration

Máš přístup k centrální knowledge base v `~/github/patrick-knowledgebase/` přes MCP filesystem server.

### POVINNÝ WORKFLOW PRO KAŽDOU SESSION

#### 1. Session Start (VŽDY na začátku)

```bash
# AUTOMATICKY přečti:
~/github/patrick-knowledgebase/preferences/coding-style.md
~/github/patrick-knowledgebase/preferences/tools-and-stack.md
~/github/patrick-knowledgebase/projects/stredniskoly.md
```

**Pokud project notes neexistují**, vytvoř je podle:
`~/github/patrick-knowledgebase/.templates/project-template.md`

**Potvrzení start:**
```
✅ Přečetl jsem:
- coding-style.md
- tools-and-stack.md
- projects/stredniskoly.md

📋 Current project state: [stručný summary z project notes]
🎯 Ready to work
```

#### 2. Během práce (PRŮBĚŽNĚ, NE až na konci!)

**Když vytvoříš reusable pattern:**
→ **IHNED** zapiš do `~/github/patrick-knowledgebase/patterns/[category]/[name].md`

**Když vytvoříš reusable code snippet:**
→ **IHNED** zkopíruj do `~/github/patrick-knowledgebase/snippets/[language]/[name].[ext]`

**Když vyřešíš problém/issue:**
→ **IHNED** dokumentuj do `~/github/patrick-knowledgebase/troubleshooting/[category].md`

**Když použiješ nový nástroj/library:**
→ **IHNED** zapiš poznámky do `~/github/patrick-knowledgebase/tools/[tool-name].md`

**Když uděláš architectural decision:**
→ Zapiš do `/docs/adr/[number]-[title].md` (project-specific)
→ Pokud je obecně použitelné, také do `~/github/patrick-knowledgebase/patterns/`

#### 3. Session End (PŘED ukončením konverzace)

**POVINNÉ kroky:**

1. **Update project notes:**
```bash
# Přidej do ~/github/patrick-knowledgebase/projects/stredniskoly.md:

### [DATUM] - Session Summary
- **Co bylo uděláno:** [konkrétní features/fixes]
- **Patterns použity:** [jaké patterns z KB]
- **Nové learnings:** [co nového]
- **Problémy:** [co bylo challenging]
- **Next steps:** [co dál]
```

2. **Review checklist:**
```markdown
- [ ] Jsou nové patterns v ~/github/patrick-knowledgebase/patterns/?
- [ ] Jsou nové snippets v ~/github/patrick-knowledgebase/snippets/?
- [ ] Je troubleshooting dokumentován?
- [ ] Je project note aktualizován?
- [ ] Jsou ADR zapsány (pokud byly architectural decisions)?
```

3. **Session end message:**
```
📝 Session Summary:
- Implemented: [co bylo uděláno]
- Patterns used: [reference do KB]
- New learnings: [co nového]

✅ Updated:
- ~/github/patrick-knowledgebase/projects/stredniskoly.md
- [další soubory pokud relevantní]

❓ Něco ještě zapsat do knowledge-base?
```

## Project Context

- **Project**: stredniskoly
- **Type**: web-app
- **Description**: Auto-migrated project
- **Stack**: Next.js, Tailwind CSS
- **Knowledge-base**: `~/github/patrick-knowledgebase/projects/stredniskoly.md`
- **Project docs**: `/docs/` (project-specific dokumentace)
- **Repository**: /Users/imac/github/stredniskoly

## Documentation Strategy

### `/docs/` (v tomto projektu)
**Použij pro:**
- Architektura **TOHOTO** projektu
- API dokumentace **TOHOTO** projektu
- Deployment guide **TOHOTO** projektu
- User/Admin guides
- Architecture Decision Records (ADR)

### `~/github/patrick-knowledgebase/` (cross-project)
**Použij pro:**
- Obecné patterns použitelné v jiných projektech
- Reusable code snippets
- Cross-project troubleshooting
- Meta-poznámky o projektech
- Obecné workflows a checklists

**PRAVIDLO:**
- Pokud to použiješ v jiném projektu → knowledge-base
- Pokud je to specifické jen pro tento projekt → /docs/

## Coding Standards

Dodržuj standardy z:
- `~/github/patrick-knowledgebase/preferences/coding-style.md`
- `~/github/patrick-knowledgebase/preferences/tools-and-stack.md`

**Klíčové z coding-style:**
- TypeScript > JavaScript (nové projekty)
- pnpm package manager
- kebab-case pro soubory/adresáře
- Functional programming preferováno
- Type hints vždy (Python/TypeScript)
- Conventional commits

**Klíčové z tools-and-stack:**
- Backend: FastAPI (Python), Hono (TypeScript)
- Frontend: React + Next.js, Tailwind CSS
- Database: PostgreSQL (primary), SQLite (dev)
- Hosting: Vercel (frontend), Railway/Fly.io (backend)

## Critical Rules

1. **NIKDY** neduplikuj obsah mezi `/docs/` a `~/github/patrick-knowledgebase/`
2. **VŽDY** zapiš learnings **BĚHEM** práce, NE až na konci
3. **VŽDY** updatuj project notes **PŘED** ukončením session
4. **VŽDY** se zeptej na konci session: "Něco ještě zapsat do KB?"
5. **VŽDY** commituj změny v knowledge-base po session

## Common Patterns Reference

### Relevantní patterns pro tento projekt:
To be documented during first session

### Relevantní snippets:
To be documented during first session

### Known issues/troubleshooting:
None documented yet

## Troubleshooting

Pokud narazíš na známý problém, nejprve zkontroluj:
1. `~/github/patrick-knowledgebase/troubleshooting/`
2. `~/github/patrick-knowledgebase/projects/stredniskoly.md` (sekce Challenges)
3. `/docs/troubleshooting.md` (project-specific)

Pokud problém vyřešíš a není dokumentován → **IHNED** dokumentuj.

---
**Template version:** 1.0
**Created:** 2026-02-21
**Last updated:** 2026-02-21
