import { useMemo, useState } from 'react';
import { ExtractionRecord, ExtractionField } from '@/types/extraction';

// Field labels for better display
const FIELD_LABELS: Record<ExtractionField, string> = {
  lob: 'Line of Business',
  insured: 'Insured',
  dba: 'DBA',
  policyNumber: 'Policy Number',
  effdate: 'Effective Date',
  expdate: 'Expiration Date',
  carrier: 'Carrier',
  valuedDate: 'Valued Date',
  claimNumber: 'Claim Number',
  claimant: 'Claimant',
  claimStatus: 'Claim Status',
  closedDate: 'Closed Date',
  reportedDate: 'Reported Date',
  dateOfLoss: 'Date of Loss',
  lossDescription: 'Loss Description',
  lossLocation: 'Loss Location',
  state: 'State',
  city: 'City',
  medicalPaid: 'Medical Paid',
  medicalPaid2: 'Medical Paid 2',
  medicalPaid3: 'Medical Paid 3',
  medicalReserves: 'Medical Reserves',
  medicalReserves2: 'Medical Reserves 2',
  medicalReserves3: 'Medical Reserves 3',
  indemnityPaid: 'Indemnity Paid',
  indemnityPaid2: 'Indemnity Paid 2',
  indemnityPaid3: 'Indemnity Paid 3',
  indemnityPaid4: 'Indemnity Paid 4',
  indemnityPaid5: 'Indemnity Paid 5',
  indemnityPaid6: 'Indemnity Paid 6',
  indemnityReserves: 'Indemnity Reserves',
  indemnityReserves2: 'Indemnity Reserves 2',
  indemnityReserves3: 'Indemnity Reserves 3',
  indemnityReserves4: 'Indemnity Reserves 4',
  indemnityReserves5: 'Indemnity Reserves 5',
  indemnityReserves6: 'Indemnity Reserves 6',
  expensesPaid: 'Expenses Paid',
  expensesPaid2: 'Expenses Paid 2',
  expensesPaid3: 'Expenses Paid 3',
  expensesPaid4: 'Expenses Paid 4',
  expensesPaid5: 'Expenses Paid 5',
  expensesPaid6: 'Expenses Paid 6',
  expensesReserves: 'Expenses Reserves',
  expensesReserves2: 'Expenses Reserves 2',
  expensesReserves3: 'Expenses Reserves 3',
  expensesReserves4: 'Expenses Reserves 4',
  expensesReserves5: 'Expenses Reserves 5',
  expensesReserves6: 'Expenses Reserves 6',
  totalPaid: 'Total Paid',
  totalPaid2: 'Total Paid 2',
  totalReserve: 'Total Reserve',
  totalReserve2: 'Total Reserve 2',
  totalIncurredSource: 'Total Incurred Source',
  recoveries: 'Recoveries',
  recoveries2: 'Recoveries 2',
  recoveries3: 'Recoveries 3',
  recoveries4: 'Recoveries 4',
  recoveries5: 'Recoveries 5',
  recoveries6: 'Recoveries 6',
  totalMedical: 'Total Medical',
  totalIndemnity: 'Total Indemnity',
  totalExpenses: 'Total Expenses',
  inferredCurrency: 'Inferred Currency',
  pageNumber: 'Page Number',
  sheetName: 'Sheet Name'
};

// Field groups for organized display
const POLICY_FIELDS: ExtractionField[] = [
  'lob',
  'insured',
  'dba',
  'policyNumber',
  'effdate',
  'expdate',
  'carrier',
  'valuedDate'
];

const CLAIM_FIELDS: ExtractionField[] = [
  'claimNumber',
  'claimant',
  'claimStatus',
  'closedDate',
  'reportedDate',
  'dateOfLoss',
  'lossDescription',
  'lossLocation',
  'state',
  'city'
];

const MEDICAL_FIELDS: ExtractionField[] = [
  'medicalPaid',
  'medicalPaid2',
  'medicalPaid3',
  'medicalReserves',
  'medicalReserves2',
  'medicalReserves3',
  'totalMedical'
];

const INDEMNITY_FIELDS: ExtractionField[] = [
  'indemnityPaid',
  'indemnityPaid2',
  'indemnityPaid3',
  'indemnityPaid4',
  'indemnityPaid5',
  'indemnityPaid6',
  'indemnityReserves',
  'indemnityReserves2',
  'indemnityReserves3',
  'indemnityReserves4',
  'indemnityReserves5',
  'indemnityReserves6',
  'totalIndemnity'
];

const EXPENSES_FIELDS: ExtractionField[] = [
  'expensesPaid',
  'expensesPaid2',
  'expensesPaid3',
  'expensesPaid4',
  'expensesPaid5',
  'expensesPaid6',
  'expensesReserves',
  'expensesReserves2',
  'expensesReserves3',
  'expensesReserves4',
  'expensesReserves5',
  'expensesReserves6',
  'totalExpenses'
];

const FINANCIAL_SUMMARY_FIELDS: ExtractionField[] = [
  'totalPaid',
  'totalPaid2',
  'totalReserve',
  'totalReserve2',
  'totalIncurredSource',
  'recoveries',
  'recoveries2',
  'recoveries3',
  'recoveries4',
  'recoveries5',
  'recoveries6'
];

const METADATA_FIELDS: ExtractionField[] = [
  'inferredCurrency',
  'pageNumber',
  'sheetName'
];

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

  const getFieldLabel = (field: ExtractionField): string => {
    return FIELD_LABELS[field] || field;
  };

  const getFieldEntries = (fields: ExtractionField[]) => {
    if (!record) return [];
    return fields
      .map((field) => [field, record[field]] as [ExtractionField, string])
      .filter(([_, value]) => value && value.trim() !== '');
  };

  const summaryEntries = useMemo(() => getFieldEntries(SUMMARY_FIELDS), [record]);
  const policyEntries = useMemo(() => getFieldEntries(POLICY_FIELDS), [record]);
  const claimEntries = useMemo(() => getFieldEntries(CLAIM_FIELDS), [record]);
  const medicalEntries = useMemo(() => getFieldEntries(MEDICAL_FIELDS), [record]);
  const indemnityEntries = useMemo(() => getFieldEntries(INDEMNITY_FIELDS), [record]);
  const expensesEntries = useMemo(() => getFieldEntries(EXPENSES_FIELDS), [record]);
  const financialEntries = useMemo(() => getFieldEntries(FINANCIAL_SUMMARY_FIELDS), [record]);
  const metadataEntries = useMemo(() => getFieldEntries(METADATA_FIELDS), [record]);

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
          {/* Summary Section */}
          {summaryEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Summary</h4>
              <table className="policy-summary-table">
                <tbody>
                  {summaryEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Policy Information Section */}
          {policyEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Policy Information</h4>
              <table className="policy-summary-table">
                <tbody>
                  {policyEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Claim Details Section */}
          <div className="claims-section-container">
            <div className="claims-section-header flex items-center justify-between" onClick={() => setClaimExpanded((prev) => !prev)}>
              <span>Claim Details</span>
              <span className={`claim-summary-arrow ${claimExpanded ? 'rotate-arrow' : ''}`}>›</span>
            </div>
            {claimExpanded && claimEntries.length > 0 && (
              <div className="claim-row-list">
                <div className="claim-item">
                  <div className="claim-detail-content" style={{ maxHeight: 600 }}>
                    <table className="claim-detail-table">
                      <tbody>
                        {claimEntries.map(([field, value]) => {
                          const isEditing = editingField === field;
                          return (
                            <tr key={field}>
                              <td className="field-label">{getFieldLabel(field)}</td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="edit-input"
                                    value={draftValue}
                                    onChange={(e) => setDraftValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                    autoFocus
                                  />
                                ) : (
                                  <div className="editable-cell-value">
                                    <span>{value}</span>
                                    <button className="action-icon" onClick={() => beginEdit(field, value)}>
                                      Edit
                                    </button>
                                    <button type="button" className="action-icon" onClick={() => onViewSource?.(field)}>
                                      View Source
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Medical Section */}
          {medicalEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Medical</h4>
              <table className="policy-summary-table">
                <tbody>
                  {medicalEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Indemnity Section */}
          {indemnityEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Indemnity</h4>
              <table className="policy-summary-table">
                <tbody>
                  {indemnityEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expenses Section */}
          {expensesEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Expenses</h4>
              <table className="policy-summary-table">
                <tbody>
                  {expensesEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary Section */}
          {financialEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Financial Summary</h4>
              <table className="policy-summary-table">
                <tbody>
                  {financialEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Metadata Section */}
          {metadataEntries.length > 0 && (
            <div className="section-group">
              <h4 className="section-title">Metadata</h4>
              <table className="policy-summary-table">
                <tbody>
                  {metadataEntries.map(([field]) => {
                    const value = record[field];
                    if (!value) return null;
                    const isEditing = editingField === field;
                    return (
                      <tr key={field}>
                        <td className="field-label">{getFieldLabel(field)}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          ) : (
                            <div className="editable-cell-value">
                              <span>{value}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="action-icon" 
                                  onClick={() => beginEdit(field, value)}
                                  title="Edit value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="action-icon" 
                                  onClick={() => onViewSource?.(field)}
                                  title="View Source"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

