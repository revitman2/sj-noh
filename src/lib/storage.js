/**
 * @fileoverview 서버 저장소 관련 함수들 (로컬 스토리지 제거)
 */

import { supabase } from './supabase';

/**
 * 서버에 데이터 저장
 * @param {Object} data - 저장할 데이터
 * @param {string} [id='life-meeting-v2'] - 데이터 저장 ID
 * @returns {Promise<boolean>} 성공 여부
 */
export async function saveToServer(data, id = 'life-meeting-v2') {
  try {
    // 저장 전 타임스탬프 추가
    const dataWithTimestamp = {
      ...data,
      _lastUpdated: new Date().toISOString()
    };
    
    // 공유 ID를 사용하여 모든 사용자가 같은 데이터를 볼 수 있게 함
    const { error } = await supabase
      .from('meeting_data')
      .upsert({ id, data: dataWithTimestamp }, { onConflict: 'id' });
    
    if (error) {
      console.error('서버 저장 오류:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('서버 저장 실패:', error);
    return false;
  }
}

/**
 * 서버에서 데이터 불러오기
 * @param {string} [id='life-meeting-v2'] - 데이터 ID
 * @returns {Promise<Object|null>} 불러온 데이터 또는 null
 */
export async function loadFromServer(id = 'life-meeting-v2') {
  try {
    const { data, error } = await supabase
      .from('meeting_data')
      .select('data')
      .eq('id', id)
      .single();
    
    if (error) {
      // 데이터가 없는 경우는 에러로 처리하지 않음
      if (error.code === 'PGRST116') {
        console.log('서버에 데이터가 없습니다. 신규 데이터를 생성합니다.');
        return null;
      }
      
      console.error('서버 불러오기 오류:', error);
      return null;
    }
    
    return data?.data;
  } catch (error) {
    console.error('서버 불러오기 실패:', error);
    return null;
  }
}