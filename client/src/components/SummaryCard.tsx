interface SummaryCardProps {
  stats: { label: string; value: string }[];
  onExportJson: () => void;
  onExportExcel: () => void;
  onRestart?: () => void;
}

export default function SummaryCard({ stats, onExportJson, onExportExcel, onRestart }: SummaryCardProps) {
  return (
    <section className="screen5">
      <div className="card summary-card text-center">
        <h2 className="summary-title">Extraction Complete</h2>
        <p className="muted">Review the summary and export your data.</p>
        <div className="summary-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="download-buttons">
          <button className="btn btn-primary" onClick={onExportJson}>
            Download JSON
          </button>
          <button className="btn btn-secondary-action" onClick={onExportExcel}>
            Download Excel
          </button>
        </div>
        <div className="utility-buttons flex flex-col gap-2">
          <button className="btn btn-small-manual">Archive batch</button>
          <button className="btn btn-small-manual" onClick={onRestart}>
            Start new upload
          </button>
        </div>
      </div>
    </section>
  );
}

