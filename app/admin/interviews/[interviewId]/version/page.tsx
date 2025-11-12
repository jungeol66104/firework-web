'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/clients/client';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

interface QAData {
  general_personality: string[];
  cover_letter_personality: string[];
  cover_letter_competency: string[];
}

interface QAPair {
  category: string;
  index: number;
  question: string;
  answer: string;
}

export default function InterviewVersionPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.interviewId as string;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [originalQA, setOriginalQA] = useState<any>(null);

  useEffect(() => {
    fetchLatestQA();
  }, [interviewId]);

  const fetchLatestQA = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch interview details with user info
      const { data: interview } = await supabase
        .from('interviews')
        .select('company_name, user_id')
        .eq('id', interviewId)
        .single();

      if (interview) {
        setCompanyName(interview.company_name || '');
        setUserId(interview.user_id || '');

        // Fetch user name from profiles table
        if (interview.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', interview.user_id)
            .single();

          if (profile) {
            setUserName(profile.name || '');
          }
        }
      }

      // Fetch latest QA
      const { data: qa } = await supabase
        .from('interview_qas')
        .select('*')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single();

      if (qa && qa.questions_data && qa.answers_data) {
        // Store the original QA for comparison
        setOriginalQA(qa);

        const pairs: QAPair[] = [];

        const categories: Array<keyof QAData> = [
          'general_personality',
          'cover_letter_personality',
          'cover_letter_competency'
        ];

        categories.forEach(category => {
          const questions = qa.questions_data[category] || [];
          const answers = qa.answers_data[category] || [];

          questions.forEach((question: string, index: number) => {
            pairs.push({
              category,
              index,
              question: question || '',
              answer: answers[index] || ''
            });
          });
        });

        setQAPairs(pairs);
      }
    } catch (error) {
      console.error('Error fetching QA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (globalIndex: number, value: string) => {
    const newPairs = [...qaPairs];
    newPairs[globalIndex].question = value;
    setQAPairs(newPairs);
  };

  const handleAnswerChange = (globalIndex: number, value: string) => {
    const newPairs = [...qaPairs];
    newPairs[globalIndex].answer = value;
    setQAPairs(newPairs);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (!originalQA) {
        toast.error('원본 QA 데이터를 찾을 수 없습니다.');
        return;
      }

      // Convert qaPairs back into questions_data and answers_data format
      const questions_data: QAData = {
        general_personality: [],
        cover_letter_personality: [],
        cover_letter_competency: []
      };

      const answers_data: QAData = {
        general_personality: [],
        cover_letter_personality: [],
        cover_letter_competency: []
      };

      qaPairs.forEach(pair => {
        const category = pair.category as keyof QAData;
        questions_data[category].push(pair.question);
        answers_data[category].push(pair.answer);
      });

      // Compare with original to build target_items
      const targetQuestions: Array<{category: string, index: number}> = [];
      const targetAnswers: Array<{category: string, index: number}> = [];

      const categories: Array<keyof QAData> = [
        'general_personality',
        'cover_letter_personality',
        'cover_letter_competency'
      ];

      categories.forEach(category => {
        const originalQuestions = originalQA.questions_data?.[category] || [];
        const originalAnswers = originalQA.answers_data?.[category] || [];
        const newQuestions = questions_data[category];
        const newAnswers = answers_data[category];

        // Compare questions
        newQuestions.forEach((question: string, index: number) => {
          if (question !== originalQuestions[index]) {
            targetQuestions.push({ category, index });
          }
        });

        // Compare answers (only count answers that actually changed)
        newAnswers.forEach((answer: string, index: number) => {
          const normalizedNew = answer === null || answer === '' ? null : answer;
          const normalizedOriginal = originalAnswers[index] === null || originalAnswers[index] === '' ? null : originalAnswers[index];

          // Only count if both are non-empty AND different
          if (normalizedNew !== null && normalizedNew !== normalizedOriginal) {
            targetAnswers.push({ category, index });
          }
        });
      });

      const target_items = {
        questions: targetQuestions,
        answers: targetAnswers
      };

      // Insert new QA version
      const { error } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: '관리자 수정',
          questions_data,
          answers_data,
          is_default: false,
          type: 'admin_edited',
          parent_qa_id: originalQA.id,
          target_items,
          tokens_used: 0  // No AI tokens used for admin edits
        });

      if (error) {
        throw error;
      }

      toast.success('새 버전이 성공적으로 생성되었습니다!');
      router.back();
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('버전 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'general_personality':
        return '일반 인성';
      case 'cover_letter_personality':
        return '자소서 인성';
      case 'cover_letter_competency':
        return '자소서 역량';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-4 w-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-4">새 버전 생성</h1>

        {/* Metadata */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="font-medium text-gray-700 text-sm">사용자</label>
            <p className="text-gray-900 text-sm mt-1">{userName || '정보 없음'}</p>
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">사용자 ID</label>
            <p className="text-gray-900 font-mono text-sm mt-1">{userId || '정보 없음'}</p>
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">면접 ID</label>
            <p className="text-gray-900 font-mono text-sm mt-1">{interviewId}</p>
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">면접</label>
            <p className="text-gray-900 text-sm mt-1">{companyName || '면접 정보 없음'}</p>
          </div>
        </div>

        {/* Q&A List */}
        <div className="space-y-3">
          {qaPairs.map((pair, globalIndex) => (
            <div key={globalIndex} className="bg-white border border-gray-200">
              <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 border-b border-gray-200">
                <span className="font-medium text-sm text-gray-900">Q{globalIndex + 1}</span>
                <span className="text-xs text-gray-500 px-2 py-0.5 bg-white border border-gray-200">
                  {getCategoryLabel(pair.category)}
                </span>
              </div>

              <div className="p-3 space-y-3">
                {/* Question */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    질문
                  </label>
                  <textarea
                    value={pair.question}
                    onChange={(e) => handleQuestionChange(globalIndex, e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm leading-6"
                    rows={2}
                  />
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    답변
                  </label>
                  <textarea
                    value={pair.answer}
                    onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm leading-6"
                    rows={6}
                    placeholder="답변이 없습니다"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-4 h-[60px] mt-6">
          <div className="h-full flex items-center justify-between">
            <div></div>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-3 py-1 h-8 bg-black text-white hover:bg-gray-800 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
