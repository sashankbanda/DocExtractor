import { useMemo, useState } from 'react';
import { ExtractionRecord, ExtractionField } from '@/types/extraction';

const SUMMARY_FIELDS: ExtractionField[] = [
  'policyNumber',
  'insured',
  'dba',
  'carrier',
  'lob',
  'effdate',
  'expdate',
  'state',
  'city'
];

interface PolicyAccordionProps {
  record?: ExtractionRecord;
  search: string;
  onViewSource?: (field: ExtractionField) => void;
  onEditField?: (field: ExtractionField, value: string) => Promise<void>;
}

export default function PolicyAccordion({ record, search, onViewSource, onEditField }: PolicyAccordionProps) {
  const [expanded, setExpanded] = useState(true);
  const [claimExpanded, setClaimExpanded] = useState(true);
  const [editingField, setEditingField] = useState<ExtractionField | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const normalizedSearch = search.toLowerCase();
  const matchesSearch =
    !record ||
    !normalizedSearch ||
    [record.policyNumber, record.insured, record.claimNumber]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedSearch));
  const visible = record && matchesSearch;

  const summaryEntries = useMemo(() => {
    if (!record) return [];
    return SUMMARY_FIELDS.filter((field) => record[field]);
  }, [record]);

  const claimEntries = useMemo(() => {
    if (!record) return [];
    return Object.entries(record).filter(
      ([field, value]) => value && !['fileId', ...SUMMARY_FIELDS].includes(field)
    ) as [ExtractionField, string][];
  }, [record]);

  if (!visible) {
    return <div className="muted text-sm">No policies match your search.</div>;
  }

  const beginEdit = (field: ExtractionField, value: string) => {
    setEditingField(field);
    setDraftValue(value);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    await onEditField?.(editingField, draftValue);
    setEditingField(null);
  };

  return (
    <div className="policy-item">
      <div className="policy-header" onClick={() => setExpanded((prev) => !prev)}>
        <span>{record?.policyNumber || record?.fileId || 'Policy'}</span>
        <span className={`arrow-icon ${expanded ? 'rotate-arrow' : ''}`}>›</span>
      </div>
      {expanded && record && (
        <div className="policy-content">
          <table className="policy-summary-table">
            <tbody>
              {summaryEntries.map((field) => {
                const value = record[field];
                if (!value) return null;
                const isEditing = editingField === field;
                return (
                  <tr key={field}>
                    <td className="capitalize">{field}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className="edit-input"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        <div className="editable-cell-value">
                          <span>{value}</span>
                          <button className="action-icon" onClick={() => beginEdit(field, value)}>
                            Edit
                          </button>
                          <button className="action-icon" onClick={() => onViewSource?.(field)}>
                            View Source
                          </button>
                        </div>
                      )}
                    </td>
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="claims-section-container">
            <div className="claims-section-header flex items-center justify-between" onClick={() => setClaimExpanded((prev) => !prev)}>
              <span>Claim Details</span>
              <span className={`claim-summary-arrow ${claimExpanded ? 'rotate-arrow' : ''}`}>›</span>
            </div>
            {claimExpanded && (
              <div className="claim-row-list">
                <div className="claim-item">
                  <div className="claim-detail-content" style={{ maxHeight: 600 }}>
                    <table className="claim-detail-table">
                      <tbody>
                        {claimEntries.map(([field, value]) => (
                          <tr key={field}>
                            <td className="capitalize">{field}</td>
                            <td>{value}</td>
                            <td>
                              <button type="button" className="action-icon" onClick={() => onViewSource?.(field)}>
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

