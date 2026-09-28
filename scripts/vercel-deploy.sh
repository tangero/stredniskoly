#!/usr/bin/env bash
# Spouští pouze GitHub Actions po úspěšných testech stejného commitu.
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }

[[ "${GITHUB_REPOSITORY:-}" == 'tangero/stredniskoly' ]] || fail 'Nasazení je určeno pouze pro tangero/stredniskoly.'
case "${GITHUB_EVENT_NAME:-}" in
  push|workflow_dispatch) ;;
  *) fail 'Nasazení je povoleno pouze pro push nebo ruční spuštění.' ;;
esac
[[ "${GITHUB_REF:-}" == refs/heads/* ]] || fail 'Nasazení vyžaduje větev, nikoli tag nebo PR ref.'
[[ -n "${GITHUB_SHA:-}" ]] || fail 'Chybí přesný commit nasazení.'

case "${DEPLOYMENT:-}" in
  preview) target=preview ;;
  production|production-staged)
    [[ "$GITHUB_REF" == 'refs/heads/main' ]] || fail 'Produkční prostředí lze nasadit pouze z main.'
    target=production
    ;;
  *) fail 'Neznámý režim nasazení.' ;;
esac

for name in GH_TOKEN VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  [[ -n "${!name:-}" ]] || fail "Chybí $name; doplň přístup v GitHub Actions."
done
[[ "$VERCEL_ORG_ID" == 'team_6pc2wHKjeUuaXwZfCS3jOhvX' ]] || fail 'VERCEL_ORG_ID neodpovídá týmu projektu.'
[[ "$VERCEL_PROJECT_ID" == 'prj_Yh3UGtfELluIwvXazLyVxF5JIPsD' ]] || fail 'VERCEL_PROJECT_ID neodpovídá projektu stredniskoly.'

# Po čekání na testy/concurrency již mohl na větev přibýt novější commit.
# Selhání API nesmí znamenat povolení publikace.
require_current() {
  local current
  current=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/${GITHUB_REF#refs/heads/}" --jq '.object.sha') || fail 'Nelze ověřit aktuální commit větve; nasazení se zastavuje.'
  [[ "$current" =~ ^[a-f0-9]{40}$ ]] || fail 'GitHub nevrátil platný commit větve.'
  [[ "$current" == "$GITHUB_SHA" ]] || skip_stale
}
skip_stale() {
  printf '%s\n' 'Větev se posunula; starší commit nebude publikován.'
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' 'Nasazení přeskočeno: větev už obsahuje novější commit.' >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 0
}

require_current
pull_args=(pull --yes --environment="$target" --token="$VERCEL_TOKEN")
# Vercel povoluje přepsání proměnných podle větve pouze u preview.
if [[ "$target" == preview ]]; then
  pull_args+=(--git-branch="${GITHUB_REF#refs/heads/}")
fi
vercel "${pull_args[@]}"

build_args=(build --yes --token="$VERCEL_TOKEN")
# Výstup projektu má přes 39 tisíc souborů; API přijímá nejvýše 15 tisíc
# jednotlivých položek. Archiv přenáší hotový build bez nového sestavení.
deploy_args=(deploy --prebuilt --archive=tgz --yes --token="$VERCEL_TOKEN")
if [[ "$target" == production ]]; then
  build_args+=(--prod)
  # Produkční konfigurace, ale doménu přiřadíme až po kontrole READY a SHA.
  deploy_args+=(--prod --skip-domain)
fi
vercel "${build_args[@]}"
require_current

url=$(vercel "${deploy_args[@]}")
[[ "$url" =~ ^https://[a-zA-Z0-9.-]+\.vercel\.app$ ]] || fail 'Vercel nevrátil očekávanou URL nasazení.'
vercel inspect "$url" --wait --timeout=5m --token="$VERCEL_TOKEN"

if [[ "$DEPLOYMENT" == production ]]; then
  require_current
  vercel promote "$url" --yes --token="$VERCEL_TOKEN"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'url=%s\n' "$url" >> "$GITHUB_OUTPUT"
fi
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    printf 'Nasazení **%s** commitu `%s`: [%s](%s)\n\n' "$DEPLOYMENT" "$GITHUB_SHA" "$url" "$url"
    if [[ "$DEPLOYMENT" == production-staged ]]; then
      printf '%s\n' 'Produkční konfigurace je připravená k ověření; doména zatím zůstává u předchozího nasazení.'
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi
