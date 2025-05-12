import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    // request에서 JSON 데이터 추출
    const body = await request.json();
    const { id = 'life-meeting', data } = body;
    
    if (!data) {
      return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });
    }
    
    // 데이터에 타임스탬프 추가
    const dataWithTimestamp = {
      ...data,
      _lastUpdated: new Date().toISOString()
    };
    
    // Supabase에 데이터 저장
    const { error } = await supabase
      .from('storage')
      .upsert({ id, data: dataWithTimestamp }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error saving data to Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in save-data API route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// sendBeacon은 응답을 처리하지 않지만, 다른 API 클라이언트도 사용할 수 있도록 GET 메서드도 제공
export async function GET() {
  return NextResponse.json({ status: 'API endpoint is working' }, { status: 200 });
} 