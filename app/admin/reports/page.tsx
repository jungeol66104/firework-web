'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, Search, X, Copy, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/clients/client';
import { fetchAllReports, ReportWithDetails } from '@/lib/admin/adminServices';
import { ReportStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '대기',
  in_review: '검토중',
  resolved: '해결',
  rejected: '반려'
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [statusFilter, setStatusFilter] = useState<ReportStatus[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [columnWidths, setColumnWidths] = useState({
    index: 50,
    id: 100,
    user: 120,
    company: 150,
    status: 80,
    items: 120,
    refunded: 100,
    description: 250,
    created: 120,
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const reports = await fetchAllReports(supabase);
      setData(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (status: ReportStatus) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
    setPage(1);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMouseDown = (e: React.MouseEvent, columnKey: keyof typeof columnWidths) => {
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  };

  const handleMouseUp = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleRowClick = (reportId: string) => {
    window.open(`/admin/reports/${reportId}`, '_blank');
  };

  // Filter data by user search and status
  const filteredData = data.filter(report => {
    // User search filter
    if (userSearchInput) {
      const userName = report.user?.name?.toLowerCase() || '';
      const userEmail = report.user?.email?.toLowerCase() || '';
      const search = userSearchInput.toLowerCase();
      if (!userName.includes(search) && !userEmail.includes(search)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter.length > 0) {
      if (!statusFilter.includes(report.status)) {
        return false;
      }
    }

    return true;
  });

  // Paginate filtered data
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = filteredData.slice(start, end);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  if (loading && data.length === 0) {
    return (
      <div className="h-full flex-1 bg-white">
        <div className="max-w-4xl mx-auto pb-4">
          <h1 className="text-2xl font-bold mb-4">신고 관리</h1>
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="max-w-4xl mx-auto pb-4 w-full flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">신고 관리</h1>
        </div>

        {/* Table */}
        <div className="bg-white shadow flex-1 flex flex-col overflow-hidden mb-4 border-t border-l border-r">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-100 border-b sticky top-0" style={{ zIndex: 50 }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.index, minWidth: columnWidths.index }}>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'index')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                    ID
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'id')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.user, minWidth: columnWidths.user }}>
                    <div className="flex items-center justify-between">
                      <span>사용자</span>
                      <div className="relative" ref={userDropdownRef}>
                        <button
                          onClick={() => setShowUserDropdown(!showUserDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${userSearchInput ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showUserDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={userSearchInput}
                                onChange={(e) => { setUserSearchInput(e.target.value); setPage(1); }}
                                placeholder="이름 또는 이메일"
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {userSearchInput && (
                                <button
                                  onClick={() => { setUserSearchInput(''); setPage(1); }}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'user')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.company, minWidth: columnWidths.company }}>
                    회사 / 직무
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'company')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
                    <div className="flex items-center justify-between">
                      <span>상태</span>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Filter className={`w-3 h-3 ${statusFilter.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showStatusDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg" style={{ minWidth: '150px', zIndex: 9999 }}>
                            {(['pending', 'in_review', 'resolved', 'rejected'] as ReportStatus[]).map(status => (
                              <div
                                key={status}
                                onClick={() => handleStatusToggle(status)}
                                className={`px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer ${
                                  statusFilter.includes(status) ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              >
                                {STATUS_LABELS[status]}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'status')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.items, minWidth: columnWidths.items }}>
                    항목 (질문/답변)
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'items')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.refunded, minWidth: columnWidths.refunded }}>
                    환불액
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'refunded')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.description, minWidth: columnWidths.description }}>
                    설명
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'description')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                    신고일
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((report, index) => {
                  const totalRefunded = [
                    ...report.items.questions.filter(q => q.refunded),
                    ...report.items.answers.filter(a => a.refunded)
                  ].reduce((sum, item) => sum + (item.refund_amount || 0), 0);

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 border-b cursor-pointer"
                      onClick={() => handleRowClick(report.id)}
                    >
                      <td className="px-3 py-2 text-xs text-gray-500 border-r text-center" style={{ width: columnWidths.index, minWidth: columnWidths.index }}>
                        {start + index + 1}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500 overflow-hidden border-r" title={report.id} style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate">{report.id.slice(0, 8)}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyId(report.id);
                            }}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.user, minWidth: columnWidths.user }}>
                        <div className="truncate" title={report.user?.email || ''}>
                          {report.user?.name || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.company, minWidth: columnWidths.company }}>
                        <div className="truncate" title={`${report.interview?.company_name || ''} ${report.interview?.position || ''}`}>
                          {report.interview?.company_name || '-'} / {report.interview?.position || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[report.status]}`}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.items, minWidth: columnWidths.items }}>
                        {report.items.questions.length}개 / {report.items.answers.length}개
                      </td>
                      <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.refunded, minWidth: columnWidths.refunded }}>
                        {totalRefunded > 0 ? (
                          <span className="text-green-600 font-medium">{totalRefunded.toFixed(1)}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs overflow-hidden border-r" title={report.description} style={{ width: columnWidths.description, minWidth: columnWidths.description }}>
                        <div className="truncate">{report.description}</div>
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                        {new Date(report.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="sticky bottom-0 bg-white border-t px-3 flex items-center justify-between text-xs" style={{ height: '33px' }}>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {page} / {totalPages || 1} 페이지
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  paddingLeft: '0.5rem',
                  paddingRight: '1.75rem',
                  paddingTop: '0.25rem',
                  paddingBottom: '0.25rem',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.25rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
                className="border text-xs appearance-none"
              >
                <option value={100}>100개씩 보기</option>
                <option value={500}>500개씩 보기</option>
                <option value={1000}>1000개씩 보기</option>
              </select>
              <span className="text-gray-600">
                총 {filteredData.length}개
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Toast */}
      {copiedId && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border shadow-lg px-4 py-2 text-sm text-gray-700"
          style={{ zIndex: 10001 }}
        >
          ID 복사됨: {copiedId.slice(0, 8)}
        </div>
      )}
    </div>
  );
}
