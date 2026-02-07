import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PrahaDostupnostClient } from "./PrahaDostupnostClient";

export const metadata: Metadata = {
  title: "Dostupnost škol v Praze a Středočeském kraji (MHD)",
  description:
    "Najděte školy dostupné do zadané doby cesty MHD v oblasti Prahy a Středočeského kraje nad PID OpenData.",
  openGraph: {
    title: "Dostupnost škol v Praze a Středočeském kraji | Přijímačky na SŠ",
    description:
      "Vyhledejte školy dostupné do časového limitu podle adresy v oblasti Prahy a Středočeského kraje (PID OpenData).",
  },
};

export default function PrahaDostupnostPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-slate-50">
        <section className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Dostupnost škol podle MHD (PID)
            </h1>
            <p className="text-lg opacity-90 max-w-3xl">
              Zadejte adresu, dojezdový limit a režim pokrytí (Pouze Praha nebo
              Praha + Středočeský kraj). Nástroj vypíše školy, které se vejdou
              do času, a seřadí je podle odhadované doby cesty. Výpočet používá
              PID OpenData.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="max-w-6xl mx-auto px-4">
            <PrahaDostupnostClient />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
