import { unstable_cache } from 'next/cache';
import { dotaz, jeDbNastavena } from './novinky-db';
import { potvrzeneUdaje } from './portal-profil';
import { TAG_PROFIL } from './portal-api';
import { getPortalSkolData, type PortalSkolData, type PortalZaznam } from './portal-skol';

// ============================================================================
// Potvrzené údaje profilu pro veřejné stránky (docs/portal-pro-skoly-2027.md,
// oddíl 4). Stejný vzor jako portal-verejne.ts: jeden dotaz pro celý web
// v cache s tagem, zápis školy i oprava redakce cache zneplatní, jinak se
// obnoví nejpozději za hodinu. „Bez zbytečného odkladu“, ne v téže vteřině.
//
// Bez databáze (build, náhled, lokální vývoj) a při jejím výpadku se čte
// public/portal_skol.json, tedy poslední vyexportovaný snímek. Stránka školy
// tak nikdy nespadne kvůli portálu a nezmizí z ní údaje.
// ============================================================================

const nactiUdaje = unstable_cache(
  async (): Promise<PortalSkolData> => potvrzeneUdaje({ dotaz }),
  ['portal-potvrzene-udaje'],
  { tags: [TAG_PROFIL], revalidate: 3600 },
);

export async function vsechnyPotvrzeneUdaje(): Promise<PortalSkolData> {
  if (!jeDbNastavena()) return getPortalSkolData();
  try {
    return await nactiUdaje();
  } catch (e) {
    console.error('❌ Portál: potvrzené údaje nejdou načíst', e);
    return getPortalSkolData();
  }
}

export async function potvrzenyProfil(redizo: string): Promise<PortalZaznam | null> {
  return (await vsechnyPotvrzeneUdaje())[redizo] ?? null;
}
