import { createClient } from '@supabase/supabase-js';

// 개발 환경용 더미 Supabase 클라이언트
const dummyClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        limit: () => Promise.resolve({ data: [], error: null })
      }),
      limit: () => Promise.resolve({ data: [], error: null })
    }),
    upsert: () => Promise.resolve({ error: null })
  })
};

// 실제 URL과 키가 있으면 실제 클라이언트를, 없으면 더미 클라이언트를 사용합니다
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (url && key) 
  ? createClient(url, key)
  : dummyClient;