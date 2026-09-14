import { Suspense } from 'react';
import { SearchView } from './SearchView';
import { fetchETendersPage } from '@/lib/etenders-client.server';
import { getMunicipalityFacets } from '@/lib/municipality-facets.server';
import { CATEGORIES, PROVINCES } from '@/types/tender';
import type { Category, Province, SortOption, TenderWithUserState } from '@/types/tender';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function appCategory(raw: string | null): Category {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('construction')) return 'Construction';
  if (value.includes('information') || value.includes('computer') || value.includes('software') || value.includes('telecom')) return 'IT & Technology';
  if (value.includes('security')) return 'Security';
  if (value.includes('clean')) return 'Cleaning';
  if (value.includes('transport')) return 'Transport';
  if (value.includes('health')) return 'Healthcare';
  if (value.includes('engineer')) return 'Engineering';
  if (value.includes('consult')) return 'Consulting';
  if (value.includes('market')) return 'Marketing';
  if (value.includes('agric')) return 'Agriculture';
  if (value.includes('professional')) return 'Professional Services';
  if (value.includes('supply') || value.includes('goods') || value.includes('equipment')) return 'Supply & Delivery';
  return 'Other';
}

function province(value: string | null): Province {
  const match = PROVINCES.find((item) => item.toLowerCase() === (value ?? '').trim().toLowerCase());
  return match ?? 'National';
}

function toTender(row: Awaited<ReturnType<typeof fetchETendersPage>>['data'][number]): TenderWithUserState {
  const publishedDate = row.publishedDate ?? new Date().toISOString();
  const closingDate = row.closingDate ?? publishedDate;
  const category = appCategory(row.category);
  const provinceName = province(row.province);
  return {
    id: row.id,
    tenderNumber: row.tenderNumber,
    title: row.title,
    description: row.title,
    organisation: row.organisation,
    category,
    categoryRaw: row.category ?? undefined,
    province: provinceName,
    location: row.municipality || row.province || 'South Africa',
    locationFull: row.municipality || row.province || null,
    valueCents: null,
    publishedDate,
    closingDate,
    sourceUrl: row.sourceUrl,
    documents: [],
    contactInformation: null,
    lifecycleStatus: 'active',
    cidbGrade: null,
    firstSeenAt: publishedDate,
    isSaved: false,
    savedAt: null,
    matchScore: null,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = one(searchParams.q) ?? '';
  const sort = (one(searchParams.sort) as SortOption) ?? 'newest';
  const requestedPage = Math.max(1, Number(one(searchParams.page) ?? 1) || 1);
  const pageSize = 20;
  const municipalityCode = one(searchParams.municipalityCode);
  const municipality = one(searchParams.municipality);

  try {
    const [data, facets] = await Promise.all([
      fetchETendersPage({
        start: (requestedPage - 1) * pageSize,
        length: pageSize,
        search: q,
        draw: requestedPage,
      }),
      getMunicipalityFacets(),
    ]);

    const results = data.data
      .map(toTender)
      .filter((tender) => !municipalityCode || tender.location.toLowerCase().includes(municipalityCode.toLowerCase()))
      .filter((tender) => !municipality || tender.location.toLowerCase().includes(municipality.toLowerCase()));

    return (
      <Suspense fallback={null}>
        <SearchView
          results={results}
          total={data.recordsFiltered}
          page={requestedPage}
          totalPages={Math.max(1, Math.ceil(data.recordsFiltered / pageSize))}
          source="live"
          initialQuery={q}
          activeSort={sort}
          municipalities={facets.municipalities}
          procurementTypes={facets.procurementTypes}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('[search] eTenders discovery failed:', error);
    return (
      <Suspense fallback={null}>
        <SearchView
          results={[]}
          total={0}
          page={1}
          totalPages={1}
          source="error"
          notice="eTenders is temporarily unavailable."
          initialQuery={q}
          activeSort={sort}
          municipalities={[]}
          procurementTypes={[]}
        />
      </Suspense>
    );
  }
}
