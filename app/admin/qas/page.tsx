'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, Search, X, Copy, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/clients/client';
import { fetchAllQAs } from '@/lib/admin/adminServices';
import { useRouter, useSearchParams } from 'next/navigation';

interface InterviewQA {
  id: string;
  interview_id: string | null;
  name: string;
  questions_data: any;
  answers_data: any;
  is_default: boolean;
  type: string;
  created_at: string;
  parent_qa_id?: string | null;
  target_items?: {
    questions: Array<{category: string, index: number}>;
    answers: Array<{category: string, index: number}>;
  };
  tokens_used?: number;
}

export default function AdminQAsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewIdFilter = searchParams.get('interview_id');

  const [data, setData] = useState<InterviewQA[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [nameSearchInput, setNameSearchInput] = useState('');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const nameDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const [columnWidths, setColumnWidths] = useState({
    index: 50,
    id: 100,
    name: 200,
    type: 120,
    interviewId: 120,
    questionsCount: 100,
    answersCount: 100,
    targetQuestions: 100,
    targetAnswers: 100,
    tokensUsed: 100,
    isDefault: 80,
    created: 120,
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    fetchQAs();
  }, [interviewIdFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(event.target as Node)) {
        setShowNameDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchQAs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const result = await fetchAllQAs(supabase, {
        limit: 1000,
        interview_id: interviewIdFilter || undefined
      });
      setData(result.qas);
    } catch (error) {
      console.error('Error fetching QAs:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // No calculations needed - data comes from DB directly!

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTypeToggle = (type: string) => {
    setTypeFilter(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
    setPage(1);
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

  const handleRowClick = (qaId: string) => {
    router.push(`/admin/qas/${qaId}`);
  };

  // Get unique types from data
  const uniqueTypes = Array.from(new Set(data.map(qa => qa.type).filter(Boolean)));

  // Filter data by name search and type
  const filteredData = data.filter(qa => {
    // Name search filter
    if (nameSearchInput) {
      const qaName = qa.name?.toLowerCase() || '';
      const search = nameSearchInput.toLowerCase();
      if (!qaName.includes(search)) {
        return false;
      }
    }

    // Type filter
    if (typeFilter.length > 0) {
      if (!typeFilter.includes(qa.type)) {
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

  // Helper function to count questions/answers
  const getQuestionsCount = (questionsData: any) => {
    if (!questionsData) return 0;
    if (Array.isArray(questionsData)) return questionsData.length;
    if (typeof questionsData === 'object') {
      // Count items in nested arrays (e.g., {general_personality: [...], cover_letter_personality: [...]})
      return Object.values(questionsData).reduce((total: number, arr) => {
        return total + (Array.isArray(arr) ? arr.filter(item => item !== null && item !== undefined).length : 0);
      }, 0);
    }
    return 0;
  };

  const getAnswersCount = (answersData: any) => {
    if (!answersData) return 0;
    if (Array.isArray(answersData)) return answersData.length;
    if (typeof answersData === 'object') {
      // Count items in nested arrays (e.g., {general_personality: [...], cover_letter_personality: [...]})
      return Object.values(answersData).reduce((total: number, arr) => {
        return total + (Array.isArray(arr) ? arr.filter(item => item !== null && item !== undefined).length : 0);
      }, 0);
    }
    return 0;
  };

  if (loading && data.length === 0) {
    return (
      <div className="h-full flex-1 bg-white">
        <div className="max-w-4xl mx-auto pb-4">
          <h1 className="text-2xl font-bold mb-4">질의응답</h1>
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
          <h1 className="text-2xl font-bold">질의응답</h1>
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
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.name, minWidth: columnWidths.name }}>
                    <div className="flex items-center justify-between">
                      <span>이름</span>
                      <div className="relative" ref={nameDropdownRef}>
                        <button
                          onClick={() => setShowNameDropdown(!showNameDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${nameSearchInput ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showNameDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={nameSearchInput}
                                onChange={(e) => { setNameSearchInput(e.target.value); setPage(1); }}
                                placeholder="이름"
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {nameSearchInput && (
                                <button
                                  onClick={() => { setNameSearchInput(''); setPage(1); }}
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
                      onMouseDown={(e) => handleMouseDown(e, 'name')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.type, minWidth: columnWidths.type }}>
                    <div className="flex items-center justify-between">
                      <span>타입</span>
                      <div className="relative" ref={typeDropdownRef}>
                        <button
                          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Filter className={`w-3 h-3 ${typeFilter.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showTypeDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg" style={{ minWidth: '150px', zIndex: 9999 }}>
                            {uniqueTypes.map(type => (
                              <div
                                key={type}
                                onClick={() => handleTypeToggle(type)}
                                className={`px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer ${
                                  typeFilter.includes(type) ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              >
                                {type}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'type')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.interviewId, minWidth: columnWidths.interviewId }}>
                    면접 ID
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'interviewId')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.questionsCount, minWidth: columnWidths.questionsCount }}>
                    질문 수
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'questionsCount')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.answersCount, minWidth: columnWidths.answersCount }}>
                    답변 수
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'answersCount')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.targetQuestions, minWidth: columnWidths.targetQuestions }}>
                    대상 질문 수
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'targetQuestions')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.targetAnswers, minWidth: columnWidths.targetAnswers }}>
                    대상 답변 수
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'targetAnswers')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.tokensUsed, minWidth: columnWidths.tokensUsed }}>
                    토큰 사용
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'tokensUsed')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.isDefault, minWidth: columnWidths.isDefault }}>
                    기본값
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'isDefault')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                    생성일
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((qa, index) => (
                  <tr
                    key={qa.id}
                    className="hover:bg-gray-50 border-b cursor-pointer"
                    onClick={() => handleRowClick(qa.id)}
                  >
                    <td className="px-3 py-2 text-xs text-gray-500 border-r text-center" style={{ width: columnWidths.index, minWidth: columnWidths.index }}>
                      {start + index + 1}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 overflow-hidden border-r" title={qa.id} style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate">{qa.id.slice(0, 8)}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyId(qa.id);
                          }}
                          className="flex-shrink-0 p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.name, minWidth: columnWidths.name }}>
                      <div className="truncate">{qa.name || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.type, minWidth: columnWidths.type }}>
                      <div className="truncate">{qa.type || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 border-r" title={qa.interview_id || ''} style={{ width: columnWidths.interviewId, minWidth: columnWidths.interviewId }}>
                      {qa.interview_id?.slice(0, 8) || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.questionsCount, minWidth: columnWidths.questionsCount }}>
                      {getQuestionsCount(qa.questions_data)}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.answersCount, minWidth: columnWidths.answersCount }}>
                      {getAnswersCount(qa.answers_data)}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.targetQuestions, minWidth: columnWidths.targetQuestions }}>
                      {qa.target_items?.questions?.length || 0}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.targetAnswers, minWidth: columnWidths.targetAnswers }}>
                      {qa.target_items?.answers?.length || 0}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.tokensUsed, minWidth: columnWidths.tokensUsed }}>
                      {qa.tokens_used != null ? Number(qa.tokens_used).toFixed(1) : '0.0'}
                    </td>
                    <td className="px-3 py-2 text-xs border-r text-center" style={{ width: columnWidths.isDefault, minWidth: columnWidths.isDefault }}>
                      {qa.is_default ? '✓' : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ width: columnWidths.created, minWidth: columnWidths.created }}>
                      {new Date(qa.created_at).toLocaleDateString('ko-KR')}
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
