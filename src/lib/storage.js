/**
 * @fileoverview 로컬 및 서버 저장소 관련 함수들
 */

import { supabase } from './supabase';

/**
 * 로컬 스토리지에 데이터 저장
 * @param {string|Object} keyOrData - 키 또는 저장할 데이터
 * @param {Object} [data] - 저장할 데이터
 * @returns {boolean} 성공 여부
 */
export function saveToLocal(keyOrData, data) {
  try {
    let key = 'meetingData';
    
    // 첫 번째 인자만 전달된 경우 (이전 방식 호환)
    if (arguments.length === 1) {
      data = keyOrData;
    } else {
      key = keyOrData;
    }
    
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('로컬 저장 실패:', error);
    return false;
  }
}

/**
 * 로컬 스토리지에서 데이터 불러오기
 * @param {string} [key='meetingData'] - 불러올 데이터의 키
 * @returns {Object|null} 불러온 데이터 또는 null
 */
export function loadFromLocal(key = 'meetingData') {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('로컬 불러오기 실패:', error);
    return null;
  }
}

/**
 * 서버에 데이터 저장
 * @param {Object} data - 저장할 데이터
 * @returns {Promise<boolean>} 성공 여부
 */
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

/**
 * 서버에서 데이터 불러오기
 * @returns {Promise<Object|null>} 불러온 데이터 또는 null
 */
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