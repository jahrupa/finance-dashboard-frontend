import { downloadZipFile } from "../../api/Service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/apiMessage";

// ── Filename helpers ─────────────────────────────────────────
// Extract just the filename from a stored path
const getFileName = (docPath) => {
  if (!docPath) return "";
  return docPath.split("/").pop(); // handles "folder/file.pdf" or "file.pdf"
};

// "1779183565_file-sample_150kB.pdf"  →  "file-sample_150kB.pdf"
const friendlyName = (docPath) => {
  const fileName = getFileName(docPath);
  if (!fileName) return "";
  // filename format: <timestamp/id>_<original_name>
  const underscore = fileName.indexOf("_");
  return underscore !== -1 ? fileName.slice(underscore + 1) : fileName;
};

// Get all docs for an invoice row (handles array or single string)
const getRowDocs = (inv) =>
  Array.isArray(inv?.documents) && inv.documents.length
    ? inv.documents
    : inv?.documentUrl
      ? [inv.documentUrl]
      : [];

// ── Reusable download button ─────────────────────────────────
// Downloads an invoice's supporting document(s) as a ZIP.
export default function DownloadDocsButton({ invoice }) {
  const rowDocs = getRowDocs(invoice);
  const toast = useToast();

  // Download all docs for an invoice as a ZIP
  const handleDownloadZip = async (invoiceId) => {
    if (!invoiceId || typeof invoiceId !== "string") {
      console.error("Invalid invoiceId:", invoiceId);
      toast.error("Unable to download — invalid invoice.");
      return;
    }
    try {
      const response = await downloadZipFile(invoiceId);
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-documents.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP download error:", err);
      toast.error(getErrorMessage(err, "Unable to download ZIP file."));
    }
  };

  return (
    <button
      className="download-doc-btn"
      title={
        rowDocs.length > 1
          ? `Download ${rowDocs.length} documents as ZIP`
          : rowDocs.length === 1
            ? `Download ${friendlyName(rowDocs[0])}`
            : "Download documents"
      }
      onClick={() => handleDownloadZip(invoice.id)}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {rowDocs.length > 0 && (
        <span className="doc-count-badge">{rowDocs.length}</span>
      )}
    </button>
  );
}
