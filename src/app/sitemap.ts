import { MetadataRoute } from 'next';
import { getAllSchools, getAllKraje } from '@/lib/data';
import { createSlug } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://stredniskoly.vercel.app';

  // Statické stránky
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/simulator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/skoly`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/regiony`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Stránky regionů
  const kraje = await getAllKraje();
  const regionPages: MetadataRoute.Sitemap = kraje.map((kraj) => ({
    url: `${baseUrl}/region/${kraj.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Stránky škol
  const schools = await getAllSchools();
  const schoolPages: MetadataRoute.Sitemap = schools.map((school) => {
    const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
    return {
      url: `${baseUrl}/skola/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  return [...staticPages, ...regionPages, ...schoolPages];
}
