import { redirect } from 'next/navigation';

/** Staré odkazy zachovají výběr; jedinou udržovanou srovnávací cestou je simulátor. */
export default async function MojeSancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const selection = typeof params.skoly === 'string' ? params.skoly : undefined;
  redirect(selection ? `/simulator?${new URLSearchParams({ skoly: selection })}` : '/simulator');
}
