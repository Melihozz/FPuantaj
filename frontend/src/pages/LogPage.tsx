import { useState, useEffect } from 'react';
import {
  AuditLog,
  PaginatedLogsResponse,
  getAllLogs,
  isLogApiError,
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
  getFieldLabel,
  formatDate,
  formatTime,
} from '../api/log';
import { getAllEmployees, Employee, isApiError } from '../api/employee';
import { PanelLoader } from '../components/Loaders';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconClose,
  IconHistory,
  IconInbox,
} from '../components/Icons';

// Action badge colors
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'badge-success',
  UPDATE: 'badge-info',
  DELETE: 'badge-danger',
};

// Log entry component
interface LogEntryProps {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}

function formatEntityNameForDisplay(log: AuditLog): string {
  // Older traffic fine logs might include a date suffix like "(Fri Jan 23)".
  if (log.entityType === 'TRAFFIC_FINE') {
    return log.entityName.replace(/\s*\([^)]*\)\s*$/, '');
  }
  return log.entityName;
}

function LogEntry({ log, isExpanded, onToggle }: LogEntryProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-card transition-all duration-200 hover:border-ink-300 hover:shadow-soft">
      <div
        className="cursor-pointer px-3.5 py-3 transition-colors hover:bg-ink-50/70 sm:px-4"
        onClick={onToggle}
      >
        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className={`badge ${ACTION_COLORS[log.action]}`}>
              {ACTION_LABELS[log.action]}
            </span>
            <IconChevronDown
              className={`h-5 w-5 text-ink-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
          <div className="text-sm font-medium text-ink-900 mb-1">{formatEntityNameForDisplay(log)}</div>
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>{ENTITY_TYPE_LABELS[log.entityType]} • {log.userName}</span>
            <span>{formatDate(log.timestamp)}</span>
          </div>
        </div>
        
        {/* Desktop layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`badge ${ACTION_COLORS[log.action]}`}>
              {ACTION_LABELS[log.action]}
            </span>
            <span className="text-sm text-ink-500">
              {ENTITY_TYPE_LABELS[log.entityType]}
            </span>
            <span className="text-sm font-medium text-ink-900">
              {formatEntityNameForDisplay(log)}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-ink-500">
              {log.userName}
            </span>
            <span className="text-sm text-ink-400">
              {formatDate(log.timestamp)} {formatTime(log.timestamp)}
            </span>
            <IconChevronDown
              className={`h-5 w-5 text-ink-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>
      
      {isExpanded && log.changes.length > 0 && (
        <div className="border-t border-ink-200/70 bg-ink-50/50 px-3.5 py-3.5 sm:px-4">
          <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500">Değişiklikler</h4>
          <div className="space-y-2">
            {log.changes.map((change, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-start text-sm">
                <span className="font-medium text-ink-600 sm:w-40 flex-shrink-0 mb-1 sm:mb-0">
                  {getFieldLabel(change.field)}:
                </span>
                <div className="flex items-center space-x-2 ml-2 sm:ml-0">
                  {change.oldValue !== null && (
                    <>
                      <span className="text-rose-600 line-through break-all">
                        {formatChangeValue(change.oldValue)}
                      </span>
                      <span className="text-ink-400">→</span>
                    </>
                  )}
                  {change.newValue !== null && (
                    <span className="text-emerald-600 break-all">
                      {formatChangeValue(change.newValue)}
                    </span>
                  )}
                  {change.oldValue !== null && change.newValue === null && (
                    <span className="text-ink-400 italic">(silindi)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isExpanded && log.changes.length === 0 && (
        <div className="border-t border-ink-200/70 bg-ink-50/50 px-3.5 py-3.5 sm:px-4">
          <p className="text-sm italic text-ink-500">Değişiklik detayı bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}

// Helper to format change values for display
function formatChangeValue(value: string): string {
  // Try to parse as boolean
  if (value === 'true') return 'Evet';
  if (value === 'false') return 'Hayır';
  
  // Try to parse as date
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('tr-TR');
      }
    } catch {
      // Not a valid date, return as is
    }
  }
  
  // Try to parse as number for currency formatting
  const num = parseFloat(value);
  if (!isNaN(num) && value.match(/^\d+(\.\d+)?$/)) {
    // Check if it looks like a currency value (has decimals or is large)
    if (num >= 100 || value.includes('.')) {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
      }).format(num);
    }
  }
  
  // Work area labels
  const workAreaLabels: Record<string, string> = {
    DEPO: 'Depo',
    URETIM: 'Üretim',
    OFIS: 'Ofis',
    DIGER: 'Diğer',
  };
  if (workAreaLabels[value]) {
    return workAreaLabels[value];
  }
  
  return value;
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-600 transition-all hover:border-ink-300 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Önceki
      </button>
      
      {pages.map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-semibold transition-all ${
              page === currentPage
                ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-glow'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-1.5 text-ink-400">
            {page}
          </span>
        )
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-600 transition-all hover:border-ink-300 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sonraki
      </button>
    </div>
  );
}

// Main LogPage component
export default function LogPage() {
  const [logsData, setLogsData] = useState<PaginatedLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const pageSize = 20;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllEmployees();
        setEmployees(data);
      } catch (err) {
        // non-blocking for log page
        const message = isApiError(err) ? err.message : 'Çalışanlar yüklenirken bir hata oluştu';
        console.warn(message);
      }
    })();
  }, []);

  useEffect(() => {
    fetchLogs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedEmployeeName, selectedMonth, selectedYear]);

  const fetchLogs = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllLogs(page, pageSize, {
        employeeName: selectedEmployeeName || undefined,
        month: selectedMonth,
        year: selectedYear,
      });
      setLogsData(data);
    } catch (err) {
      const message = isLogApiError(err) ? err.message : 'Log kayıtları yüklenirken bir hata oluştu';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedLogId(null);
  };

  const handleToggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  if (isLoading && !logsData) {
    return <PanelLoader label="İşlem geçmişi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconHistory className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              İşlem Geçmişi
              {logsData && <span className="badge badge-neutral">{logsData.total} kayıt</span>}
            </h1>
            <p className="page-desc">
              Sistemde yapılan tüm değişiklikler; kim, ne zaman ve neyi değiştirdi.
            </p>
          </div>
        </div>
      </header>

      <div className="card">

      {error && (
        <div className="alert alert-danger mx-5 mt-5 sm:mx-6">
          <IconAlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="btn-icon h-7 w-7 shrink-0 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
            aria-label="Hatayı kapat"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {/* Filters */}
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-ink-200/70 bg-ink-50/50 p-4 md:grid-cols-3">
          <div>
            <label htmlFor="log_employee" className="form-label">
              Çalışan
            </label>
            <select
              id="log_employee"
              value={selectedEmployeeName}
              onChange={(e) => {
                setCurrentPage(1);
                setExpandedLogId(null);
                setSelectedEmployeeName(e.target.value);
              }}
              className="field"
            >
              <option value="">Tümü</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.fullName}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="log_month" className="form-label">
              Ay
            </label>
            <select
              id="log_month"
              value={String(selectedMonth)}
              onChange={(e) => {
                const v = e.target.value;
                setCurrentPage(1);
                setExpandedLogId(null);
                setSelectedMonth(v === 'all' ? 'all' : parseInt(v, 10));
              }}
              className="field"
            >
              <option value="all">Tümü</option>
              <option value="1">Ocak</option>
              <option value="2">Şubat</option>
              <option value="3">Mart</option>
              <option value="4">Nisan</option>
              <option value="5">Mayıs</option>
              <option value="6">Haziran</option>
              <option value="7">Temmuz</option>
              <option value="8">Ağustos</option>
              <option value="9">Eylül</option>
              <option value="10">Ekim</option>
              <option value="11">Kasım</option>
              <option value="12">Aralık</option>
            </select>
          </div>

          <div>
            <label htmlFor="log_year" className="form-label">
              Yıl
            </label>
            <select
              id="log_year"
              value={String(selectedYear)}
              onChange={(e) => {
                setCurrentPage(1);
                setExpandedLogId(null);
                setSelectedYear(parseInt(e.target.value, 10));
              }}
              className="field"
            >
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {logsData && logsData.logs.length === 0 ? (
          <div className="empty-state">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <IconInbox className="h-7 w-7" />
            </span>
            <p className="font-display text-base font-semibold text-ink-800">
              Henüz işlem geçmişi bulunmuyor
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Seçili filtrelere uyan bir kayıt yok. Dönemi veya çalışanı değiştirmeyi deneyin.
            </p>
          </div>
        ) : (
          <>
            {/* Summary info */}
            {logsData && (
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Toplam {logsData.total} kayıt
                <span className="h-1 w-1 rounded-full bg-ink-300" />
                Sayfa {logsData.page} / {logsData.totalPages}
              </div>
            )}

            {/* Log list */}
            <div className="space-y-2">
              {logsData?.logs.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogId === log.id}
                  onToggle={() => handleToggleExpand(log.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {logsData && (
              <Pagination
                currentPage={logsData.page}
                totalPages={logsData.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
