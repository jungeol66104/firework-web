'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, Search, X, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/clients/client';
import { fetchAllPayments } from '@/lib/admin/adminServices';
import { useSearchParams } from 'next/navigation';

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get('user_id');

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [statusSearchInput, setStatusSearchInput] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [columnWidths, setColumnWidths] = useState({
    index: 50,
    id: 100,
    userName: 100,
    userId: 120,
    amount: 80,
    tokens: 70,
    orderid: 120,
    method: 100,
    status: 90,
    created: 120,
    completed: 120,
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    fetchPayments();
  }, [userIdFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const result = await fetchAllPayments(supabase, {
        limit: 1000,
        user_id: userIdFilter || undefined
      });
      setData(result.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
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

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '대기중',
      'completed': '완료',
      'failed': '실패',
      'cancelled': '취소'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Filter data by status search
  const filteredData = data.filter(payment => {
    if (!statusSearchInput) return true;
    const status = payment.status?.toLowerCase() || '';
    const search = statusSearchInput.toLowerCase();
    return status.includes(search);
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
          <h1 className="text-2xl font-bold mb-4">결제</h1>
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
          <h1 className="text-2xl font-bold">결제</h1>
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
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.userName, minWidth: columnWidths.userName }}>
                    사용자
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'userName')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.userId, minWidth: columnWidths.userId }}>
                    사용자 ID
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'userId')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.amount, minWidth: columnWidths.amount }}>
                    금액
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'amount')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.tokens, minWidth: columnWidths.tokens }}>
                    토큰
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'tokens')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.orderid, minWidth: columnWidths.orderid }}>
                    주문 ID
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'orderid')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.method, minWidth: columnWidths.method }}>
                    결제 수단
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'method')}
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
                          <Search className={`w-3 h-3 ${statusSearchInput ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showStatusDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={statusSearchInput}
                                onChange={(e) => { setStatusSearchInput(e.target.value); setPage(1); }}
                                placeholder="상태"
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {statusSearchInput && (
                                <button
                                  onClick={() => { setStatusSearchInput(''); setPage(1); }}
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
                      onMouseDown={(e) => handleMouseDown(e, 'status')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                    생성일
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'created')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs" style={{ width: columnWidths.completed, minWidth: columnWidths.completed }}>
                    완료일
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 border-b"
                  >
                    <td className="px-3 py-2 text-xs text-gray-500 border-r text-center" style={{ width: columnWidths.index, minWidth: columnWidths.index }}>
                      {start + index + 1}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 overflow-hidden border-r" title={payment.id} style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate">{payment.id.slice(0, 8)}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyId(payment.id);
                          }}
                          className="flex-shrink-0 p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" title={payment.user?.name || ''} style={{ width: columnWidths.userName, minWidth: columnWidths.userName }}>
                      <div className="truncate">{payment.user?.name || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 border-r" title={payment.user_id || ''} style={{ width: columnWidths.userId, minWidth: columnWidths.userId }}>
                      {payment.user_id?.slice(0, 8) || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-right" style={{ width: columnWidths.amount, minWidth: columnWidths.amount }}>
                      {payment.amount?.toLocaleString() || '-'}원
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-right" style={{ width: columnWidths.tokens, minWidth: columnWidths.tokens }}>
                      {payment.tokens || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 overflow-hidden border-r" title={payment.order_id || ''} style={{ width: columnWidths.orderid, minWidth: columnWidths.orderid }}>
                      <div className="truncate">{payment.order_id || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" title={payment.payment_method || ''} style={{ width: columnWidths.method, minWidth: columnWidths.method }}>
                      <div className="truncate">{payment.payment_method || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                      {new Date(payment.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ width: columnWidths.completed, minWidth: columnWidths.completed }}>
                      {payment.completed_at ? new Date(payment.completed_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
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
