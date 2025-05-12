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

/**
 * 서버 핑 메커니즘 설정
 * 주기적으로 Supabase에 API 호출을 보내 프로젝트가 일시 중지되지 않도록 함
 * @param {number} [intervalDays=7] - 핑 간격(일)
 * @returns {Function} 핑 메커니즘 정리 함수
 */
export function setupPingMechanism(intervalDays = 7) {
  // 핑 함수 - 간단한 쿼리 실행
  const pingServer = async () => {
    try {
      // 날짜와 시간을 로그에 기록
      console.log(`서버 핑 시도: ${new Date().toISOString()}`);
      
      // 간단한 쿼리 실행 (테이블 존재 여부 확인만으로도 핑 효과 있음)
      const { data, error } = await supabase
        .from('meeting_data')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('서버 핑 실패:', error);
      } else {
        console.log('서버 핑 성공:', data);
      }
    } catch (err) {
      console.error('서버 핑 중 예외 발생:', err);
    }
  };
  
  // 초기 핑 시도 (페이지 로드 시)
  pingServer();
  
  // 정기적인 핑 설정 (밀리초 단위로 변환)
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const pingInterval = setInterval(pingServer, intervalMs);
  
  // 브라우저 환경에서는 페이지 가시성 변경 이벤트에 대응
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 즉시 핑 실행
        pingServer();
      }
    });
  }
  
  // 정리 함수 반환 (컴포넌트 언마운트 시 호출)
  return () => {
    clearInterval(pingInterval);
  };
}

/**
 * Supabase 연결 상태 확인 및 오류 처리
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export async function checkConnection() {
  try {
    const { data, error } = await supabase
      .from('meeting_data')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 확인 실패:', error);
      
      // 프로젝트가 일시 중지된 경우 특별 처리
      if (error.message && (
        error.message.includes('paused') || 
        error.message.includes('not found') ||
        error.code === 'PGRST116'
      )) {
        console.error('Supabase 프로젝트가 일시 중지되었을 수 있습니다.');
        return false;
      }
      
      return false;
    }
    
    console.log('Supabase 연결 확인 성공');
    return true;
  } catch (err) {
    console.error('Supabase 연결 확인 중 예외 발생:', err);
    return false;
  }
}

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