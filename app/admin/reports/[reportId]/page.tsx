'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, MoreVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/clients/client';
import { getReportDetailWithVersions } from '@/lib/admin/adminServices';
import { useParams } from 'next/navigation';
import { ReportStatus } from '@/lib/types';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

interface QAItem {
  index: number;
  type: 'question' | 'answer';
  content?: string;
  category?: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.reportId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const firstReportedCellRef = useRef<HTMLTableCellElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ versionId: string; qaKey: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ versionId: string; qaKey: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  // Scroll to first reported cell when data loads
  useEffect(() => {
    if (data && firstReportedCellRef.current) {
      // Wait a bit for rendering to complete
      setTimeout(() => {
        firstReportedCellRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 100);
    }
  }, [data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const result = await getReportDetailWithVersions(supabase, reportId);
      setData(result);
      // Initialize admin response
      setAdminResponse(result?.report?.admin_response || '');
    } catch (error) {
      console.error('Error fetching report detail:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (newStatus: ReportStatus) => {
    setUpdatingStatus(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
        return;
      }

      // Update local state
      setData((prev: any) => ({
        ...prev,
        report: {
          ...prev.report,
          status: newStatus
        }
      }));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRefund = async (versionId: string, qaKey: string) => {
    if (!confirm('정말 환불하시겠습니까?')) {
      return;
    }

    try {
      const supabase = createClient();

      // Parse qaKey to get type, category, and index
      // Format: q-{category}-{index} or a-{category}-{index}
      const [type, category, indexStr] = qaKey.split('-');
      const index = parseInt(indexStr);
      const isQuestion = type === 'q';

      // Calculate refund amount
      // Questions: 0.1 tokens each (3 tokens / 30 questions)
      // Answers: 0.2 tokens each (6 tokens / 30 answers)
      const refundAmount = isQuestion ? 0.1 : 0.2;

      // Get current report data
      const report = data.report;

      // Check if this item is already refunded
      const items = report.items;
      const itemList = isQuestion ? items.questions : items.answers;
      const existingItem = itemList?.find((item: any) =>
        item.category === category && item.index === index
      );

      if (existingItem?.refunded) {
        alert('이미 환불된 항목입니다.');
        setOpenDropdown(null);
        return;
      }

      // Update report items to mark as refunded
      const updatedItems = { ...items };
      const targetList = isQuestion ? 'questions' : 'answers';

      if (!updatedItems[targetList]) {
        updatedItems[targetList] = [];
      }

      // Find and update the item, or add it if it doesn't exist
      const itemIndex = updatedItems[targetList].findIndex((item: any) =>
        item.category === category && item.index === index
      );

      const updatedItem = {
        category,
        index,
        refunded: true,
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString()
      };

      if (itemIndex >= 0) {
        updatedItems[targetList][itemIndex] = {
          ...updatedItems[targetList][itemIndex],
          ...updatedItem
        };
      } else {
        updatedItems[targetList].push(updatedItem);
      }

      // Update report in database
      const { error: updateError } = await supabase
        .from('reports')
        .update({ items: updatedItems })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report:', updateError);
        alert('환불 처리 중 오류가 발생했습니다.');
        return;
      }

      // Add tokens back to user using admin client
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // Import and use addTokens from tokenService
      const { addTokens } = await import('@/lib/supabase/services/tokenService');
      await addTokens(supabase, report.user_id, refundAmount);

      // Update local state
      setData((prev: any) => ({
        ...prev,
        report: {
          ...prev.report,
          items: updatedItems
        }
      }));

      alert(`환불이 완료되었습니다. (${refundAmount} 토큰)`);
      setOpenDropdown(null);

    } catch (error) {
      console.error('Error processing refund:', error);
      alert('환불 처리에 실패했습니다.');
    }
  };

  const handleCellClick = (versionId: string, qaKey: string) => {
    setSelectedCell({ versionId, qaKey });
  };

  const saveAdminResponse = async () => {
    setSavingResponse(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('reports')
        .update({ admin_response: adminResponse })
        .eq('id', reportId);

      if (error) {
        console.error('Error saving admin response:', error);
        alert('Failed to save admin response');
        return;
      }

      // Update local state
      setData((prev: any) => ({
        ...prev,
        report: {
          ...prev.report,
          admin_response: adminResponse
        }
      }));

      alert('관리자 응답이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving admin response:', error);
      alert('Failed to save admin response');
    } finally {
      setSavingResponse(false);
    }
  };

  // Parse questions/answers from a version
  const parseQAData = (version: any): { questions: QAItem[], answers: QAItem[] } => {
    const questions: QAItem[] = [];
    const answers: QAItem[] = [];

    // Parse questions_data
    if (version.questions_data) {
      const questionsData = version.questions_data;

      if (Array.isArray(questionsData)) {
        // Direct array format
        questionsData.forEach((q: any, idx: number) => {
          if (!q) return; // Skip null/undefined items
          questions.push({
            index: idx + 1,
            type: 'question',
            content: typeof q === 'string' ? q : (q.question || q.content || q),
            category: typeof q === 'object' ? (q.category || q.type) : undefined
          });
        });
      } else if (typeof questionsData === 'object') {
        // Object format - could be category-based or index-based
        Object.keys(questionsData).forEach((key) => {
          const value = questionsData[key];

          // Check if value is an array (category-based grouping)
          if (Array.isArray(value)) {
            value.forEach((q: any) => {
              if (!q) return; // Skip null/undefined items
              questions.push({
                index: questions.length + 1,
                type: 'question',
                content: typeof q === 'string' ? q : (q.question || q.content || q),
                category: key // Use the object key as category
              });
            });
          } else {
            // Index-based format like { "q1": {...}, "q2": {...} }
            const index = parseInt(key.replace(/\D/g, '')) || questions.length + 1;
            questions.push({
              index,
              type: 'question',
              content: typeof value === 'string' ? value : (value.question || value.content || value),
              category: typeof value === 'object' ? (value.category || value.type) : undefined
            });
          }
        });
      }
    }

    // Parse answers_data
    if (version.answers_data) {
      const answersData = version.answers_data;

      if (Array.isArray(answersData)) {
        // Direct array format
        answersData.forEach((a: any, idx: number) => {
          if (!a) return; // Skip null/undefined items
          answers.push({
            index: idx + 1,
            type: 'answer',
            content: typeof a === 'string' ? a : (a.answer || a.content || a),
            category: typeof a === 'object' ? (a.category || a.type) : undefined
          });
        });
      } else if (typeof answersData === 'object') {
        // Object format - could be category-based or index-based
        Object.keys(answersData).forEach((key) => {
          const value = answersData[key];

          // Check if value is an array (category-based grouping)
          if (Array.isArray(value)) {
            value.forEach((a: any) => {
              if (!a) return; // Skip null/undefined items
              answers.push({
                index: answers.length + 1,
                type: 'answer',
                content: typeof a === 'string' ? a : (a.answer || a.content || a),
                category: key // Use the object key as category
              });
            });
          } else {
            // Index-based format like { "a1": {...}, "a2": {...} }
            const index = parseInt(key.replace(/\D/g, '')) || answers.length + 1;
            answers.push({
              index,
              type: 'answer',
              content: typeof value === 'string' ? value : (value.answer || value.content || value),
              category: typeof value === 'object' ? (value.category || value.type) : undefined
            });
          }
        });
      }
    }

    return { questions, answers };
  };

  // Create a map for quick lookup
  const getQAMap = (version: any) => {
    const { questions, answers } = parseQAData(version);
    const map: Record<string, QAItem> = {};

    questions.forEach(q => {
      map[`q${q.index}`] = q;
    });

    answers.forEach(a => {
      map[`a${a.index}`] = a;
    });

    return map;
  };

  // Build category structure with paired Q&A
  const buildCategoryStructure = (version: any) => {
    const { questions, answers } = parseQAData(version);

    // Group questions by category
    const categoryGroups: Record<string, { questions: QAItem[], answers: QAItem[] }> = {};

    questions.forEach(q => {
      const cat = q.category || 'uncategorized';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = { questions: [], answers: [] };
      }
      categoryGroups[cat].questions.push(q);
    });

    // Group answers by category
    answers.forEach(a => {
      const cat = a.category || 'uncategorized';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = { questions: [], answers: [] };
      }
      categoryGroups[cat].answers.push(a);
    });

    return categoryGroups;
  };

  // Category name translations
  const getCategoryNameKorean = (category: string): string => {
    const translations: Record<string, string> = {
      'general_personality': '일반 인성면접',
      'cover_letter_competency': '자소서 기반 역량면접',
      'cover_letter_personality': '자소서 기반 인성면접',
      'technical': '기술면접',
      'situational': '상황면접',
      'behavioral': '행동면접',
      'uncategorized': '기타'
    };
    return translations[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="animate-spin h-4 w-4" />
      </div>
    );
  }

  if (!data || !data.report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Report not found</h1>
          <p className="text-gray-600">This report does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  const { report, qaVersions } = data;

  // Get the specific version ID that was reported
  const reportedVersionId = report.interview_qas_id;

  // Get reported item indices and refunded items
  const reportedItems = new Set<string>();
  const refundedItems = new Map<string, { refund_amount: number; refunded_at: string }>();

  if (report.items) {
    // Add reported questions
    if (report.items.questions && Array.isArray(report.items.questions)) {
      report.items.questions.forEach((q: any) => {
        const category = q.category || 'uncategorized';
        const index = q.index || q.question_index || 0;
        const key = `q-${category}-${index}`;
        reportedItems.add(key);

        // Track refunded items
        if (q.refunded) {
          refundedItems.set(key, {
            refund_amount: q.refund_amount || 0,
            refunded_at: q.refunded_at || ''
          });
        }
      });
    }

    // Add reported answers
    if (report.items.answers && Array.isArray(report.items.answers)) {
      report.items.answers.forEach((a: any) => {
        const category = a.category || 'uncategorized';
        const index = a.index || a.answer_index || 0;
        const key = `a-${category}-${index}`;
        reportedItems.add(key);

        // Track refunded items
        if (a.refunded) {
          refundedItems.set(key, {
            refund_amount: a.refund_amount || 0,
            refunded_at: a.refunded_at || ''
          });
        }
      });
    }
  }

  // Find the first reported cell for auto-scroll
  let firstReportedCell: { versionId: string; qaKey: string } | null = null;
  if (reportedItems.size > 0 && reportedVersionId) {
    const firstQaKey = Array.from(reportedItems)[0];
    firstReportedCell = {
      versionId: reportedVersionId,
      qaKey: firstQaKey
    };
  }

  // Build rows with categories and paired Q&A
  type RowType =
    | { type: 'category'; category: string; key: string }
    | { type: 'qa'; qaKey: string; label: string; qIndex: number; aIndex: number; key: string };

  const rows: RowType[] = [];

  // Get all categories from all versions
  const allCategories = new Set<string>();
  qaVersions.forEach((version: any) => {
    const categoryGroups = buildCategoryStructure(version);
    Object.keys(categoryGroups).forEach(cat => allCategories.add(cat));
  });

  // For each category, create category row + paired Q&A rows
  Array.from(allCategories).forEach((category, catIdx) => {
    // Add category header row
    rows.push({
      type: 'category',
      category,
      key: `cat-${catIdx}`
    });

    // Determine max Q&A pairs in this category across all versions
    let maxPairs = 0;
    qaVersions.forEach((version: any) => {
      const categoryGroups = buildCategoryStructure(version);
      if (categoryGroups[category]) {
        const qCount = categoryGroups[category].questions.length;
        const aCount = categoryGroups[category].answers.length;
        maxPairs = Math.max(maxPairs, qCount, aCount);
      }
    });

    // Create paired Q&A rows
    for (let i = 0; i < maxPairs; i++) {
      // Question row
      rows.push({
        type: 'qa',
        qaKey: `q-${category}-${i}`,
        label: `Q${i + 1}`,
        qIndex: i,
        aIndex: -1,
        key: `q-${category}-${i}`
      });

      // Answer row
      rows.push({
        type: 'qa',
        qaKey: `a-${category}-${i}`,
        label: `A${i + 1}`,
        qIndex: -1,
        aIndex: i,
        key: `a-${category}-${i}`
      });
    }
  });

  return (
    <ResizablePanelGroup direction="horizontal" className="fixed inset-0">
      {/* Left Panel - Table */}
      <ResizablePanel defaultSize={75} minSize={50}>
        <div className="h-full bg-gray-100 overflow-auto">
          {/* Grid Table - starts from top-left edge */}
          <div className="inline-block">
            <table className="text-xs shadow-lg" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50">
                  <th
                    className="px-3 py-2 text-left font-semibold sticky left-0 bg-gray-50 z-30"
                    style={{
                      minWidth: '80px',
                      boxShadow: '1px 0 0 0 rgb(229 231 235), 0 1px 0 0 rgb(229 231 235)'
                    }}
                  >
                    항목
                  </th>
                  {qaVersions.map((version: any, idx: number) => (
                    <th
                      key={version.id}
                      className="px-3 py-2 text-left border-r border-gray-200 font-semibold bg-gray-50"
                      style={{
                        minWidth: '300px',
                        maxWidth: '400px',
                        boxShadow: '0 1px 0 0 rgb(229 231 235)'
                      }}
                    >
                      <div className="space-y-1">
                        <div className="font-bold">V{idx + 1}</div>
                        <div className="font-normal text-gray-600 truncate">{version.name}</div>
                        <div className="font-normal text-gray-500">{version.type}</div>
                        <div className="font-normal text-gray-400">
                          {new Date(version.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  if (row.type === 'category') {
                    // Category header row
                    return (
                      <tr key={row.key} className="bg-blue-50">
                        <td
                          colSpan={qaVersions.length + 1}
                          className="px-3 py-2 font-bold text-sm text-blue-800 sticky left-0 z-10 bg-blue-50 border-b border-gray-200"
                          style={{
                            boxShadow: '1px 0 0 0 rgb(229 231 235)'
                          }}
                        >
                          {getCategoryNameKorean(row.category)}
                        </td>
                      </tr>
                    );
                  }

                  // Q&A row
                  const isQuestion = row.label.startsWith('Q');
                  const category = row.qaKey.split('-')[1];

                  // Color scheme: Q rows white, A rows gray-50
                  const rowBg = isQuestion ? 'bg-white' : 'bg-gray-50';
                  const firstColBg = 'bg-gray-50';

                  return (
                    <tr key={row.key} className={rowBg}>
                      <td
                        className={`px-3 py-2 font-medium sticky left-0 z-10 ${firstColBg} text-gray-700 border-b border-gray-200`}
                        style={{
                          boxShadow: '1px 0 0 0 rgb(229 231 235)'
                        }}
                      >
                        {row.label}
                      </td>
                      {qaVersions.map((version: any) => {
                        const categoryGroups = buildCategoryStructure(version);
                        const group = categoryGroups[category];

                        let item: QAItem | undefined;
                        if (isQuestion && group && row.qIndex >= 0) {
                          item = group.questions[row.qIndex];
                        } else if (!isQuestion && group && row.aIndex >= 0) {
                          item = group.answers[row.aIndex];
                        }

                        // Check if this specific cell in this specific version is reported
                        const isReportedVersion = version.id === reportedVersionId;
                        const isReportedCell = reportedItems.has(row.qaKey);
                        const isReported = isReportedVersion && isReportedCell;

                        // Check if this is the first reported cell
                        const isFirstReported = firstReportedCell &&
                          version.id === firstReportedCell.versionId &&
                          row.qaKey === firstReportedCell.qaKey;

                        // Check if this cell is selected
                        const isSelected = selectedCell?.versionId === version.id && selectedCell?.qaKey === row.qaKey;
                        const isDropdownOpen = openDropdown?.versionId === version.id && openDropdown?.qaKey === row.qaKey;

                        // Check if this cell is refunded
                        const refundInfo = refundedItems.get(row.qaKey);
                        const isRefunded = isReportedVersion && !!refundInfo;

                        return (
                          <td
                            key={`${row.key}-${version.id}`}
                            ref={isFirstReported ? firstReportedCellRef : null}
                            onClick={() => handleCellClick(version.id, row.qaKey)}
                            className={`px-3 py-2 align-top cursor-pointer hover:bg-gray-50 transition-colors relative group ${
                              isReported ? (isRefunded ? 'bg-green-50' : 'bg-red-50') : isSelected ? 'bg-blue-50' : rowBg
                            }`}
                            style={{
                              minWidth: '300px',
                              maxWidth: '400px',
                              borderRight: '1px solid rgb(229 231 235)',
                              borderBottom: '1px solid rgb(229 231 235)',
                              boxShadow: isReported
                                ? (isRefunded ? 'inset 0 0 0 2px rgb(34 197 94)' : 'inset 0 0 0 2px rgb(239 68 68)')
                                : isSelected
                                  ? 'inset 0 0 0 2px rgb(59 130 246)'
                                  : 'none'
                            }}
                          >
                            {item && item.content ? (
                              <>
                                {/* Refunded badge - show at top left if refunded */}
                                {isRefunded && (
                                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                                    환불완료
                                  </div>
                                )}
                                <div className={`text-xs text-gray-700 whitespace-pre-wrap pr-6 ${isRefunded ? 'mt-6' : ''}`}>
                                  {item.content}
                                </div>
                                {/* More button - show on hover or when dropdown is open */}
                                <div className={`absolute top-2 right-2 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(isDropdownOpen ? null : { versionId: version.id, qaKey: row.qaKey });
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-600" />
                                  </button>
                                  {/* Dropdown menu */}
                                  {isDropdownOpen && (
                                    <div
                                      ref={dropdownRef}
                                      className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[120px]"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRefund(version.id, row.qaKey);
                                        }}
                                        disabled={isRefunded}
                                        className={`w-full px-4 py-2 text-left text-sm ${
                                          isRefunded
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        } transition-colors`}
                                      >
                                        {isRefunded ? '환불완료' : '환불'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-400 text-center">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel - Report Info */}
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <div className="h-full bg-white overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-6">신고 상세</h2>

            <div className="space-y-5 text-sm">
              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">신고 ID</div>
                <div className="font-mono text-xs text-gray-600 break-all">
                  {report.id}
                </div>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">사용자</div>
                <div className="text-gray-900">{report.user?.name}</div>
                <div className="text-xs text-gray-600 mt-0.5">{report.user?.email}</div>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">면접</div>
                <div className="text-gray-900">{report.interview?.company_name}</div>
                <div className="text-xs text-gray-600 mt-0.5">{report.interview?.position}</div>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">상태</div>
                <select
                  value={report.status}
                  onChange={(e) => updateReportStatus(e.target.value as ReportStatus)}
                  disabled={updatingStatus}
                  style={{
                    paddingLeft: '0.75rem',
                    paddingRight: '2rem',
                    paddingTop: '0.375rem',
                    paddingBottom: '0.375rem',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                  }}
                  className="w-full border text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="pending">대기 중</option>
                  <option value="in_review">검토 중</option>
                  <option value="resolved">해결됨</option>
                  <option value="rejected">거부됨</option>
                </select>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">설명</div>
                <div className="text-sm text-gray-900 leading-relaxed">
                  {report.description}
                </div>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">관리자 응답</div>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="신고에 대한 관리자 응답을 입력하세요..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
                  disabled={savingResponse}
                />
                <button
                  onClick={saveAdminResponse}
                  disabled={savingResponse}
                  className="mt-2 w-full px-3 py-1 h-8 text-sm border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingResponse ? '저장 중...' : '저장'}
                </button>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">신고 항목</div>
                <div className="space-y-2">
                  {report.items?.questions && report.items.questions.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">질문 ({report.items.questions.length}개)</div>
                      <div className="text-xs text-gray-600">
                        {report.items.questions.map((q: any, idx: number) => (
                          <div key={idx} className="mb-0.5">• {q.id || `Question ${idx + 1}`}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.items?.answers && report.items.answers.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">답변 ({report.items.answers.length}개)</div>
                      <div className="text-xs text-gray-600">
                        {report.items.answers.map((a: any, idx: number) => (
                          <div key={idx} className="mb-0.5">• {a.id || `Answer ${idx + 1}`}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="font-bold text-xs text-gray-700 mb-1.5">생성일</div>
                <div className="text-xs text-gray-600">
                  {new Date(report.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
