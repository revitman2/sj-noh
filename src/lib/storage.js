import { supabase } from './supabase';

// 로컬 스토리지에 저장
export function saveToLocal(data) {
  try {
    localStorage.setItem('meetingData', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('로컬 저장 실패:', error);
    return false;
  }
}

// 로컬 스토리지에서 불러오기
export function loadFromLocal() {
  try {
    const data = localStorage.getItem('meetingData');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('로컬 불러오기 실패:', error);
    return null;
  }
}

// 서버에 저장
export async function saveToServer(data) {
  try {
    const { error } = await supabase
      .from('meeting_data')
      .upsert({ id: 'main', data }, { onConflict: 'id' });
    
    return !error;
  } catch (error) {
    console.error('서버 저장 실패:', error);
    return false;
  }
}

// 서버에서 불러오기
export async function loadFromServer() {
  try {
    const { data, error } = await supabase
      .from('meeting_data')
      .select('data')
      .eq('id', 'main')
      .single();
    
    return error ? null : data?.data;
  } catch (error) {
    console.error('서버 불러오기 실패:', error);
    return null;
  }
}