import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { DocViewModal } from "~/components/ui/DocViewModal";
import { useClientData } from "~/lib/client-data-context";
import type { Document } from "~/lib/types";

/**
 * App-level document viewer. Any component can call `openDoc(id, page?)` (or
 * `openDocObject(doc, page?)`) to pop the reusable Document Viewer modal —
 * used by the Vault, fund/sponsor/direct Documents tabs, and Atlas-AI source
 * citations. The modal is mounted once, here.
 */
interface DocViewerApi {
  /** Open by id — resolved from the shared client-data documents slice. */
  openDoc: (documentId: string, page?: number) => void;
  /** Open a document object directly (e.g. one not in the global list yet). */
  openDocObject: (doc: Document, page?: number) => void;
  close: () => void;
}

const DocViewerContext = createContext<DocViewerApi | null>(null);

export function DocViewerProvider({ children }: { children: ReactNode }) {
  const { documents } = useClientData();
  const [doc, setDoc] = useState<Document | null>(null);
  const [page, setPage] = useState<number | undefined>(undefined);

  const openDoc = useCallback(
    (documentId: string, p?: number) => {
      const found = documents.find((d) => d.id === documentId);
      if (found) {
        setDoc(found);
        setPage(p);
      }
    },
    [documents]
  );

  const openDocObject = useCallback((d: Document, p?: number) => {
    setDoc(d);
    setPage(p);
  }, []);

  const close = useCallback(() => {
    setDoc(null);
    setPage(undefined);
  }, []);

  return (
    <DocViewerContext.Provider value={{ openDoc, openDocObject, close }}>
      {children}
      {doc && <DocViewModal doc={doc} page={page} onClose={close} />}
    </DocViewerContext.Provider>
  );
}

export function useDocViewer(): DocViewerApi {
  const ctx = useContext(DocViewerContext);
  if (!ctx) throw new Error("useDocViewer must be used within DocViewerProvider");
  return ctx;
}
