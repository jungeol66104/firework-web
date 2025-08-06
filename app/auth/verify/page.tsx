'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3 w-fit">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>이메일을 확인하세요</CardTitle>
            <CardDescription>
              인증 이메일을 보냈습니다. 이메일을 확인하고 링크를 클릭하여 인증을 완료하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/auth/signin" className="w-full">
              <Button variant="outline" className="w-full">
                로그인으로 돌아가기
              </Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              이메일을 받지 못하셨나요? 스팸 폴더를 확인하거나{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                다시 시도해보세요
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 