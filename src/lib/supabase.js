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
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: { path: 'dummy/path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://cdn-icons-png.flaticon.com/512/3419/3419924.png' } })
    })
  }
};

// 실제 URL과 키가 있으면 실제 클라이언트를, 없으면 더미 클라이언트를 사용합니다
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (url && key) 
  ? createClient(url, key)
  : dummyClient;

// 이미지 업로드 함수
export const uploadImage = async (file, bucket = 'images', path = '') => {
  if (!supabase.storage) {
    console.error('Supabase Storage not available');
    return { publicUrl: 'https://cdn-icons-png.flaticon.com/512/3419/3419924.png', error: new Error('Supabase Storage not available') };
  }

  // 이미지 파일 확장자 확인
  const fileExt = file.name.split('.').pop();
  const fileName = `${path ? path + '/' : ''}${new Date().getTime()}.${fileExt}`;

  // Storage에 업로드
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error uploading image:', error);
    return { publicUrl: 'https://cdn-icons-png.flaticon.com/512/3419/3419924.png', error };
  }

  // 공개 URL 가져오기
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return { publicUrl: urlData.publicUrl, error: null };
};