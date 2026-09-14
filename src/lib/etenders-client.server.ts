import 'server-only';

/**
 * Minimal eTenders discovery client.
 *
 * The public Opportunities page uses a DataTables/XHR endpoint rather than
 * the retired OCDS API path we previously depended on. This module keeps that
 * source isolated so the rest of TenderBase can consume a stable tender shape.
 */

const DEFAULT_BASE_URL = 'https://www.etenders.gov.za';
export const ETENDERS_BASE_URL = (
  process.env.ETENDERS_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/$/, '');

export const ETENDERS_OPPORTUNITIES_PATH = '/Home/PaginatedTenderOpportunities';

export interface ETenderDiscoveryRecord {
  id: string;
  tenderNumber: string;
  title: string;
  organisation: string;
  category: string | null;
  province: string | null;
  municipality: string | null;
  publishedDate: string | null;
  closingDate: string | null;
  eSubmission: string | null;
  sourceUrl: string;
  raw: Record<string, unknown>;
}

export interface ETendersPage {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: ETenderDiscoveryRecord[];
}

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function firstString(row: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
}

function normaliseRow(row: UnknownRecord, index: number): ETenderDiscoveryRecord {
  const tenderNumber = firstString(row, [
    'tenderNumber', 'tenderNo', 'reference', 'referenceNumber', 'bidNumber',
    'refNo', 'TenderNo', 'Reference', 'ReferenceNumber',
  ]) || `etenders-${index}`;

  const title = firstString(row, [
    'title', 'description', 'tenderDescription', 'Description', 'TenderDescription',
  ]) || 'Untitled tender';

  const organisation = firstString(row, [
    'organisation', 'organization', 'buyer', 'department', 'institution',
    'Organisation', 'Organization', 'Buyer',
  ]) || 'Unknown organisation';

  const publishedDate = firstString(row, [
    'date_Published', 'datePublished', 'publishedDate', 'publicationDate', 'DatePublished',
  ]);
  const closingDate = firstString(row, [
    'closing_Date', 'closingDate', 'closeDate', 'deadline', 'ClosingDate',
  ]);

  const category = firstString(row, ['category', 'Category', 'procurementType', 'ProcurementType']);
  const province = firstString(row, ['province', 'Province']);
  const municipality = firstString(row, ['municipality', 'Municipality', 'municipalityName']);
  const eSubmission = firstString(row, ['eSubmission', 'esubmission', 'eSubmissionType']);

  const id = firstString(row, ['id', 'tenderId', 'Id', 'ID']) || tenderNumber;

  return {
    id,
    tenderNumber,
    title,
    organisation,
    category,
    province,
    municipality,
    publishedDate,
    closingDate,
    eSubmission,
    sourceUrl: `${ETENDERS_BASE_URL}/Home/opportunities?id=1`,
    raw: row,
  };
}

export function buildETendersQuery(options: {
  start?: number;
  length?: number;
  search?: string;
  status?: number;
  draw?: number;
} = {}): string {
  const params = new URLSearchParams();
  params.set('draw', String(options.draw ?? 1));
  params.set('start', String(Math.max(0, options.start ?? 0)));
  params.set('length', String(Math.min(100, Math.max(1, options.length ?? 20))));
  params.set('status', String(options.status ?? 1));
  params.set('search[value]', options.search ?? '');
  params.set('search[regex]', 'false');
  params.set('order[0][column]', '2');
  params.set('order[0][dir]', 'desc');
  return `${ETENDERS_OPPORTUNITIES_PATH}?${params.toString()}`;
}

export async function fetchETendersPage(options: Parameters<typeof buildETendersQuery>[0] = {}): Promise<ETendersPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${ETENDERS_BASE_URL}${buildETendersQuery(options)}`, {
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`eTenders returned HTTP ${response.status}`);
    }

    const payload = await response.json() as UnknownRecord;
    const rows = Array.isArray(payload.data) ? payload.data : [];

    return {
      draw: Number(payload.draw ?? options.draw ?? 1),
      recordsTotal: Number(payload.recordsTotal ?? rows.length),
      recordsFiltered: Number(payload.recordsFiltered ?? rows.length),
      data: rows.filter((row): row is UnknownRecord => !!row && typeof row === 'object').map(normaliseRow),
    };
  } finally {
    clearTimeout(timer);
  }
}
