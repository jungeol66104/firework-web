'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, MoreVertical, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/clients/client';
import { getReportDetailWithVersions } from '@/lib/admin/adminServices';
import { useParams } from 'next/navigation';
import { ReportStatus } from '@/lib/types';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    versionId: string | null;
    qaKey: string | null;
  }>({
    open: false,
    versionId: null,
    qaKey: null
  });

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  // Scroll to first reported cell when data loads (only once on initial load)
  useEffect(() => {
    if (data && firstReportedCellRef.current && !hasScrolledRef.current) {
      // Wait a bit for rendering to complete
      setTimeout(() => {
        firstReportedCellRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
        hasScrolledRef.current = true; // Mark as scrolled
      }, 100);
    }
  }, [data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
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
        setAlertDialog({ open: true, title: '오류', message: '상태 업데이트에 실패했습니다.' });
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
      setAlertDialog({ open: true, title: '오류', message: '상태 업데이트에 실패했습니다.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRefundClick = (versionId: string, qaKey: string) => {
    setConfirmDialog({ open: true, versionId, qaKey });
  };

  const handleRefund = async () => {
    const { versionId, qaKey } = confirmDialog;
    if (!versionId || !qaKey) return;

    setConfirmDialog({ open: false, versionId: null, qaKey: null });

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

      // Find the report for this specific version
      const targetReport = (data.allReports || []).find((r: any) => r.interview_qas_id === versionId);

      if (!targetReport) {
        setAlertDialog({ open: true, title: '오류', message: '해당 버전의 신고를 찾을 수 없습니다.' });
        setOpenDropdown(null);
        return;
      }

      // Check if this item is already refunded in THIS report
      const items = targetReport.items || {};
      const itemList = isQuestion ? items.questions : items.answers;
      const existingItem = itemList?.find((item: any) =>
        item.category === category && item.index === index
      );

      if (existingItem?.refunded) {
        setAlertDialog({ open: true, title: '알림', message: '이미 환불된 항목입니다.' });
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

      // Update THIS report in database (not the page's report)
      const { error: updateError } = await supabase
        .from('reports')
        .update({ items: updatedItems })
        .eq('id', targetReport.id);

      if (updateError) {
        console.error('Error updating report:', updateError);
        setAlertDialog({ open: true, title: '오류', message: '환불 처리 중 오류가 발생했습니다.' });
        return;
      }

      // Add tokens back to user using admin client
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlertDialog({ open: true, title: '오류', message: '사용자 정보를 찾을 수 없습니다.' });
        return;
      }

      // Import and use addTokens from tokenService
      const { addTokens } = await import('@/lib/supabase/services/tokenService');
      await addTokens(supabase, targetReport.user_id, refundAmount);

      // Update local state - update the correct report in allReports
      setData((prev: any) => {
        const updatedAllReports = (prev.allReports || []).map((r: any) => {
          if (r.id === targetReport.id) {
            return { ...r, items: updatedItems };
          }
          return r;
        });

        // Also update the main report if it's the same one
        const updatedReport = prev.report.id === targetReport.id
          ? { ...prev.report, items: updatedItems }
          : prev.report;

        return {
          ...prev,
          report: updatedReport,
          allReports: updatedAllReports
        };
      });

      setAlertDialog({ open: true, title: '성공', message: `환불이 완료되었습니다. (${refundAmount} 토큰)` });
      setOpenDropdown(null);

    } catch (error) {
      console.error('Error processing refund:', error);
      setAlertDialog({ open: true, title: '오류', message: '환불 처리에 실패했습니다.' });
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
        setAlertDialog({ open: true, title: '오류', message: '관리자 응답 저장에 실패했습니다.' });
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

      setAlertDialog({ open: true, title: '성공', message: '관리자 응답이 저장되었습니다.' });
    } catch (error) {
      console.error('Error saving admin response:', error);
      setAlertDialog({ open: true, title: '오류', message: '관리자 응답 저장에 실패했습니다.' });
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
          // Don't skip null items - preserve the index gaps
          questions.push({
            index: idx + 1,
            type: 'question',
            content: q ? (typeof q === 'string' ? q : (q.question || q.content || q)) : undefined,
            category: typeof q === 'object' ? (q.category || q.type) : undefined
          });
        });
      } else if (typeof questionsData === 'object') {
        // Object format - could be category-based or index-based
        Object.keys(questionsData).forEach((key) => {
          const value = questionsData[key];

          // Check if value is an array (category-based grouping)
          if (Array.isArray(value)) {
            value.forEach((q: any, idx: number) => {
              // Don't skip null items - preserve the index gaps
              questions.push({
                index: idx, // Use the index within the category array (0-based)
                type: 'question',
                content: q ? (typeof q === 'string' ? q : (q.question || q.content || q)) : undefined,
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
          // Don't skip null items - preserve the index gaps
          answers.push({
            index: idx + 1,
            type: 'answer',
            content: a ? (typeof a === 'string' ? a : (a.answer || a.content || a)) : undefined,
            category: typeof a === 'object' ? (a.category || a.type) : undefined
          });
        });
      } else if (typeof answersData === 'object') {
        // Object format - could be category-based or index-based
        Object.keys(answersData).forEach((key) => {
          const value = answersData[key];

          // Check if value is an array (category-based grouping)
          if (Array.isArray(value)) {
            value.forEach((a: any, idx: number) => {
              // Don't skip null items - preserve the index gaps
              answers.push({
                index: idx, // Use the index within the category array (0-based)
                type: 'answer',
                content: a ? (typeof a === 'string' ? a : (a.answer || a.content || a)) : undefined,
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

  const { report, qaVersions, allReports } = data;

  // Get the specific version ID that was reported (for current report)
  const reportedVersionId = report.interview_qas_id;

  // Build a comprehensive map of all reported and refunded items across ALL reports
  // Map structure: versionId -> qaKey -> { isReported: boolean, isRefunded: boolean, refundInfo: {...} }
  const allReportedItems = new Map<string, Map<string, { isReported: boolean; isRefunded: boolean; refundInfo?: { refund_amount: number; refunded_at: string } }>>();

  // Process all reports
  (allReports || []).forEach((r: any) => {
    const versionId = r.interview_qas_id;
    if (!versionId) return;

    // Initialize map for this version if not exists
    if (!allReportedItems.has(versionId)) {
      allReportedItems.set(versionId, new Map());
    }
    const versionMap = allReportedItems.get(versionId)!;

    if (r.items) {
      // Process reported questions
      if (r.items.questions && Array.isArray(r.items.questions)) {
        r.items.questions.forEach((q: any) => {
          const category = q.category || 'uncategorized';
          const index = q.index || q.question_index || 0;
          const key = `q-${category}-${index}`;

          versionMap.set(key, {
            isReported: true,
            isRefunded: !!q.refunded,
            refundInfo: q.refunded ? {
              refund_amount: q.refund_amount || 0,
              refunded_at: q.refunded_at || ''
            } : undefined
          });
        });
      }

      // Process reported answers
      if (r.items.answers && Array.isArray(r.items.answers)) {
        r.items.answers.forEach((a: any) => {
          const category = a.category || 'uncategorized';
          const index = a.index || a.answer_index || 0;
          const key = `a-${category}-${index}`;

          versionMap.set(key, {
            isReported: true,
            isRefunded: !!a.refunded,
            refundInfo: a.refunded ? {
              refund_amount: a.refund_amount || 0,
              refunded_at: a.refunded_at || ''
            } : undefined
          });
        });
      }
    }
  });

  // For backward compatibility - get reported items for the current report's version
  const reportedItems = allReportedItems.get(reportedVersionId) || new Map();
  const refundedItems = new Map<string, { refund_amount: number; refunded_at: string }>();
  reportedItems.forEach((info, key) => {
    if (info.isRefunded && info.refundInfo) {
      refundedItems.set(key, info.refundInfo);
    }
  });

  // Find the first reported cell for auto-scroll (from current report only)
  let firstReportedCell: { versionId: string; qaKey: string } | null = null;
  if (reportedItems.size > 0 && reportedVersionId) {
    const firstQaKey = Array.from(reportedItems.keys())[0];
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

  // Define the correct category order
  const categoryOrder = [
    'general_personality',
    'cover_letter_personality',
    'cover_letter_competency',
    'technical',
    'situational',
    'behavioral',
    'uncategorized'
  ];

  // Sort categories according to the defined order
  const sortedCategories = Array.from(allCategories).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    // If category not in order list, put it at the end
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // For each category, create category row + paired Q&A rows
  sortedCategories.forEach((category, catIdx) => {
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
                  {qaVersions.map((version: any, idx: number) => {
                    const isReportedVersion = version.id === data.report.interview_qas_id;
                    return (
                      <th
                        key={version.id}
                        className={`px-3 py-2 text-left border-r border-gray-200 ${
                          isReportedVersion ? 'bg-gradient-to-br from-blue-50 to-indigo-50 font-semibold' : 'bg-gray-100/50 font-normal'
                        }`}
                        style={{
                          minWidth: '300px',
                          maxWidth: '400px',
                          boxShadow: isReportedVersion
                            ? 'inset 0 0 0 2px rgb(99 102 241 / 0.3), 0 1px 0 0 rgb(229 231 235)'
                            : '0 1px 0 0 rgb(229 231 235)'
                        }}
                      >
                        <div className="space-y-1">
                          <div className={isReportedVersion ? 'font-bold' : 'font-medium text-gray-500'}>V{idx + 1}</div>
                          <div className={`font-normal truncate ${isReportedVersion ? 'text-gray-600' : 'text-gray-400'}`}>{version.name}</div>
                          <div className={`font-normal ${isReportedVersion ? 'text-gray-500' : 'text-gray-400'}`}>{version.type}</div>
                          <div className={`font-normal ${isReportedVersion ? 'text-gray-400' : 'text-gray-300'}`}>
                            {new Date(version.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </th>
                    );
                  })}
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

                        // Check if this specific cell in this specific version is reported across ANY report
                        const versionReportMap = allReportedItems.get(version.id);
                        const cellReportInfo = versionReportMap?.get(row.qaKey);
                        const isReported = !!cellReportInfo?.isReported;
                        const isRefunded = !!cellReportInfo?.isRefunded;
                        const refundInfo = cellReportInfo?.refundInfo;

                        // Check if this is the first reported cell (for current report only, for scroll)
                        const isFirstReported = firstReportedCell &&
                          version.id === firstReportedCell.versionId &&
                          row.qaKey === firstReportedCell.qaKey;

                        // Check if this cell is selected
                        const isSelected = selectedCell?.versionId === version.id && selectedCell?.qaKey === row.qaKey;
                        const isDropdownOpen = openDropdown?.versionId === version.id && openDropdown?.qaKey === row.qaKey;

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
                              <div className="flex items-start gap-2">
                                {/* Refunded badge - show at left if refunded */}
                                {isRefunded && (
                                  <div className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded flex-shrink-0">
                                    환불완료
                                  </div>
                                )}
                                <div className="flex-1 text-xs text-gray-700 whitespace-pre-wrap">
                                  {item.content}
                                </div>
                                {/* More button - only visible for reported items, styled like interview page */}
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isReported) {
                                        setOpenDropdown(isDropdownOpen ? null : { versionId: version.id, qaKey: row.qaKey });
                                      }
                                    }}
                                    className={`h-6 w-6 p-0 flex-shrink-0 flex items-center justify-center ${
                                      isReported
                                        ? 'text-gray-300 group-hover:text-black hover:bg-transparent cursor-pointer'
                                        : 'invisible'
                                    } transition-colors`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
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
                                          handleRefundClick(version.id, row.qaKey);
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
                              </div>
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
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    disabled={updatingStatus}
                    className="w-full px-3 py-2 text-sm text-left border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                  >
                    <span>
                      {report.status === 'pending' && '대기 중'}
                      {report.status === 'in_review' && '검토 중'}
                      {report.status === 'resolved' && '해결됨'}
                      {report.status === 'rejected' && '거부됨'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border shadow-lg z-50">
                      <div
                        onClick={() => {
                          updateReportStatus('pending');
                          setShowStatusDropdown(false);
                        }}
                        className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                          report.status === 'pending' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        대기 중
                      </div>
                      <div
                        onClick={() => {
                          updateReportStatus('in_review');
                          setShowStatusDropdown(false);
                        }}
                        className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                          report.status === 'in_review' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        검토 중
                      </div>
                      <div
                        onClick={() => {
                          updateReportStatus('resolved');
                          setShowStatusDropdown(false);
                        }}
                        className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                          report.status === 'resolved' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        해결됨
                      </div>
                      <div
                        onClick={() => {
                          updateReportStatus('rejected');
                          setShowStatusDropdown(false);
                        }}
                        className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                          report.status === 'rejected' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        거부됨
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="text-sm text-gray-900">
                  질문 <span className="font-semibold">{report.items?.questions?.length || 0}개</span>,
                  답변 <span className="font-semibold">{report.items?.answers?.length || 0}개</span>
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

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertDialog.title}</DialogTitle>
            <DialogDescription>{alertDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertDialog({ ...alertDialog, open: false })}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불 확인</DialogTitle>
            <DialogDescription>정말 환불하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, versionId: null, qaKey: null })}
            >
              취소
            </Button>
            <Button onClick={handleRefund}>
              환불
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResizablePanelGroup>
  );
}
