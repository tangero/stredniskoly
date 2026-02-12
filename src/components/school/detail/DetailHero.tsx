import Link from 'next/link';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getDemandClass } from '@/lib/utils';

interface DetailHeroProps {
  schoolName: string;
  programName: string;
  location: string;
  kraj: string;
  minBody: number;
  indexPoptavky: number;
  studyLength: number;
  overviewSlug: string;
}

export function DetailHero({
  schoolName,
  programName,
  location,
  kraj,
  minBody,
  indexPoptavky,
  studyLength,
  overviewSlug,
}: DetailHeroProps) {
  const demand = getDemandClass(indexPoptavky);

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back link */}
        <Link
          href={`/skola/${overviewSlug}`}
          className="inline-flex items-center gap-2 text-sm opacity-90 hover:opacity-100 transition-opacity mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled školy
        </Link>

        {/* School name */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{schoolName}</h1>

        {/* Program name */}
        <p className="text-lg md:text-xl opacity-95 mb-3">{programName}</p>

        {/* Location */}
        <p className="text-sm opacity-80 mb-4">
          {location}, {kraj}
        </p>

        {/* Key metrics */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
            <Trophy className="w-5 h-5" />
            <div>
              <div className="text-xs opacity-80">Min. body</div>
              <div className="text-lg font-bold">{minBody}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
            <Users className="w-5 h-5" />
            <div>
              <div className="text-xs opacity-80">Poptávka</div>
              <div className="text-lg font-bold">
                {indexPoptavky.toFixed(1)}× {demand.emoji}
              </div>
            </div>
          </div>

          <Badge variant="neutral" className="bg-white/20 text-white border-white/30">
            {studyLength}leté studium
          </Badge>
        </div>
      </div>
    </div>
  );
}
