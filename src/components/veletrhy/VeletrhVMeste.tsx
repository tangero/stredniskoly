import { nactiAkce } from '@/lib/veletrhy-zdroj';
import { VeletrhUpoutavka } from './VeletrhUpoutavka';

/**
 * Upoutávka na veletrh ve městě s akcemi z databáze. Čte stejnou položku
 * cache jako /veletrhy, takže obě místa ukazují totéž a databáze dostane
 * dotaz nejvýš jednou za hodinu (docs/veletrhy-api-2027.md, oddíl 6).
 */
export async function VeletrhVMeste(props: Omit<Parameters<typeof VeletrhUpoutavka>[0], 'akce'>) {
  const akce = await nactiAkce();
  return <VeletrhUpoutavka {...props} akce={akce} />;
}
