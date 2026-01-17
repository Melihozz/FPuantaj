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

// Action badge colors
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

// Log entry component
interface LogEntryProps {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}

function LogEntry({ log, isExpanded, onToggle }: LogEntryProps) {
  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <div
        className="px-3 sm:px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ACTION_COLORS[log.action]}`}>
              {ACTION_LABELS[log.action]}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-900 mb-1">{log.entityName}</div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{ENTITY_TYPE_LABELS[log.entityType]} • {log.userName}</span>
            <span>{formatDate(log.timestamp)}</span>
          </div>
        </div>
        
        {/* Desktop layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ACTION_COLORS[log.action]}`}>
              {ACTION_LABELS[log.action]}
            </span>
            <span className="text-sm text-gray-500">
              {ENTITY_TYPE_LABELS[log.entityType]}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {log.entityName}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {log.userName}
            </span>
            <span className="text-sm text-gray-400">
              {formatDate(log.timestamp)} {formatTime(log.timestamp)}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && log.changes.length > 0 && (
        <div className="px-3 sm:px-4 py-3 bg-white border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Değişiklikler:</h4>
          <div className="space-y-2">
            {log.changes.map((change, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-start text-sm">
                <span className="font-medium text-gray-600 sm:w-40 flex-shrink-0 mb-1 sm:mb-0">
                  {getFieldLabel(change.field)}:
                </span>
                <div className="flex items-center space-x-2 ml-2 sm:ml-0">
                  {change.oldValue !== null && (
                    <>
                      <span className="text-red-600 line-through break-all">
                        {formatChangeValue(change.oldValue)}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  {change.newValue !== null && (
                    <span className="text-green-600 break-all">
                      {formatChangeValue(change.newValue)}
                    </span>
                  )}
                  {change.oldValue !== null && change.newValue === null && (
                    <span className="text-gray-400 italic">(silindi)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isExpanded && log.changes.length === 0 && (
        <div className="px-3 sm:px-4 py-3 bg-white border-t border-gray-200">
          <p className="text-sm text-gray-500 italic">Değişiklik detayı bulunmuyor.</p>
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
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Önceki
      </button>
      
      {pages.map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 text-sm border rounded-md ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 text-gray-400">
            {page}
          </span>
        )
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const fetchLogs = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllLogs(page, pageSize);
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
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">İşlem Geçmişi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sistemde yapılan tüm değişikliklerin kaydı
        </p>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {logsData && logsData.logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Henüz işlem geçmişi bulunmuyor.
          </div>
        ) : (
          <>
            {/* Summary info */}
            {logsData && (
              <div className="mb-4 text-sm text-gray-500">
                Toplam {logsData.total} kayıt, Sayfa {logsData.page} / {logsData.totalPages}
              </div>
            )}

            {/* Log list */}
            <div className="space-y-1">
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
  );
}
