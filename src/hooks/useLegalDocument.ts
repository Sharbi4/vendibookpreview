/**
 * useLegalDocument — loads the currently-active version of a document from
 * the `legal_documents` table via the `current_legal_document` RPC.
 * Cache is per-type; documents are immutable once active so a long stale
 * window is safe.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentType, LegalDocumentRow } from '@/lib/legalDocuments';

export function useLegalDocument(documentType: DocumentType | null | undefined) {
  return useQuery<LegalDocumentRow | null>({
    queryKey: ['legal-document', documentType],
    enabled: !!documentType,
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!documentType) return null;
      // RPC returns a single row (record type). supabase-js maps it as an object.
      const { data, error } = await supabase.rpc('current_legal_document', {
        _document_type: documentType,
      });
      if (error) throw error;
      if (!data) return null;
      return (Array.isArray(data) ? data[0] : data) as LegalDocumentRow;
    },
  });
}

/** Same lookup keyed by URL slug — used by the /legal/:slug page. */
export function useLegalDocumentBySlug(slug: string | undefined) {
  return useQuery<LegalDocumentRow | null>({
    queryKey: ['legal-document-slug', slug],
    enabled: !!slug,
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .order('effective_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LegalDocumentRow | null;
    },
  });
}
