import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DostupnostClient } from "./DostupnostClient";

export const metadata: Metadata = {
  title: "Dopravní dostupnost škol v celé ČR",
  description:
    "Najděte střední školy dostupné veřejnou dopravou z libovolné zastávky v ČR. Transfer-aware Dijkstra routing na celostátním GTFS grafu.",
  openGraph: {
    title: "Dopravní dostupnost škol v celé ČR | Přijímačky na střední školy",
    description:
      "Vyhledejte školy dostupné do časového limitu z libovolné zastávky v České republice. Zahrnuje čekání na spoj, přestupy a linky.",
  },
};

export default function DostupnostPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-slate-50">
        <section className="bg-gradient-to-br from-blue-500 to-blue-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Dopravní dostupnost středních škol
            </h1>
            <p className="text-lg opacity-90 max-w-3xl">
              Zadejte výchozí zastávku kdekoliv v ČR a zjistěte, které střední školy
              stihnete do zvoleného časového limitu. Výpočet zahrnuje jízdní dobu,
              čekání na spoj i přestupy na 35 000+ stanicích veřejné dopravy.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="max-w-6xl mx-auto px-4">
            <DostupnostClient />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
