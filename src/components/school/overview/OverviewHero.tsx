import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MapPin, Building2 } from "lucide-react";

interface OverviewHeroProps {
  schoolName: string;
  location: string;
  kraj: string;
  studyLength: number;
  schoolType: string;
  category: string;
  hasInspection?: boolean;
  overviewSlug?: string;
}

const studyLengthLabels: Record<number, string> = {
  2: "Dvouleté",
  3: "Tříleté",
  4: "Čtyřleté",
  5: "Pětileté",
  6: "Šestileté",
  8: "Osmileté",
};

export function OverviewHero({
  schoolName,
  location,
  kraj,
  studyLength,
  schoolType,
  category,
  hasInspection = false,
  overviewSlug,
}: OverviewHeroProps) {
  const studyLengthLabel = studyLengthLabels[studyLength] || `${studyLength}leté`;

  return (
    <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Název školy */}
        <h1 className="text-2xl md:text-4xl font-bold mb-4">{schoolName}</h1>

        {/* Lokace */}
        <div className="flex items-center gap-2 text-lg opacity-90 mb-4">
          <MapPin className="w-5 h-5" />
          <span>{location}, {kraj}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="neutral"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
          >
            {studyLengthLabel} studium
          </Badge>

          <Badge
            variant="neutral"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
          >
            <Building2 className="w-4 h-4 mr-1" />
            {schoolType}
          </Badge>

          {hasInspection && overviewSlug && (
            <Link
              href={`/skola/${overviewSlug}/inspekce`}
              className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors"
            >
              Co si o škole myslí Školní inspekce?
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
