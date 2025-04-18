'use client';

import React, { useState, useEffect } from 'react';
import { MEMBERS, HOST_NAME } from '@/constants/members';
import MapModal from '@/components/MapModal';
import { saveToLocal, loadFromLocal, saveToServer, loadFromServer } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

interface DateOption {
  id: string;
  date: string; // 날짜만 저장 (YYYY-MM-DD)
}

interface TimeOption {
  id: string;
  time: string; // 시간만 저장 (HH:MM)
}

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  member?: string;  // 입금자 (수입의 경우)
  description: string;
  amount: number;
}

interface DuesPayment {
  year: number;
  month: number;
  memberId: string;
  paid: boolean;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export default function Home() {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    kakaoLink?: string;
    naverLink?: string;
  } | null>(null);
  
  // 지도 모달 상태
  const [mapModalOpen, setMapModalOpen] = useState<boolean>(false);
  const [currentMapType, setCurrentMapType] = useState<'kakao' | 'naver'>('kakao');
  
  // 날짜 및 시간 관리를 위한 상태
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([]);
  const [votes, setVotes] = useState<{[key: string]: string[]}>({}); // { dateId: [memberName1, memberName2, ...] }

  // 계비 관리를 위한 상태
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [duesPayments, setDuesPayments] = useState<DuesPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseInput, setExpenseInput] = useState<{
    date: string;
    description: string;
    amount: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: ''
  });

  // 날짜 추가 함수
  const addDateOption = () => {
    if (!dateInput) return;
    
    // 이미 존재하는 날짜인지 확인
    const dateExists = dateOptions.some((date: DateOption) => date.date === dateInput);
    if (dateExists) return;
    
    const newDate: DateOption = {
      id: new Date().getTime().toString(),
      date: dateInput
    };
    
    setDateOptions([...dateOptions, newDate]);
    setDateInput('');
  };

  // 시간 추가 함수
  const addTimeOption = () => {
    if (!timeInput) return;
    
    // 이미 존재하는 시간인지 확인
    const timeExists = timeOptions.some((time: TimeOption) => time.time === timeInput);
    if (timeExists) return;
    
    const newTime: TimeOption = {
      id: new Date().getTime().toString(),
      time: timeInput
    };
    
    setTimeOptions([...timeOptions, newTime]);
    setTimeInput('');
  };

  // 날짜 삭제 함수
  const removeDateOption = (id: string) => {
    setDateOptions(dateOptions.filter((date: DateOption) => date.id !== id));
    
    // 관련된 투표도 삭제
    setVotes((prevVotes: any) => {
      const newVotes = { ...prevVotes };
      Object.keys(newVotes).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          delete newVotes[key];
        }
      });
      return newVotes;
    });
  };

  // 시간 삭제 함수
  const removeTimeOption = (id: string) => {
    setTimeOptions(timeOptions.filter((time: TimeOption) => time.id !== id));
    
    // 관련된 투표도 삭제
    setVotes((prevVotes: any) => {
      const newVotes = { ...prevVotes };
      Object.keys(newVotes).forEach(key => {
        if (key.includes(`-${id}`)) {
          delete newVotes[key];
        }
      });
      return newVotes;
    });
  };

  // 날짜 포맷 함수
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 거래 추가 함수
  const addTransaction = () => {
    // 사용하지 않는 함수 - 계비 관리 시스템 변경으로 인해 제거
  };

  // 거래 삭제 함수
  const removeTransaction = () => {
    // 사용하지 않는 함수 - 계비 관리 시스템 변경으로 인해 제거
  };

  // 총 잔액 계산
  const calculateBalance = () => {
    // 새로운 계산 함수로 대체
    return calculateYearlyBalance(selectedYear);
  };

  // 개인별 정산 계산
  const calculateMemberBalance = (memberName: string) => {
    // 이 함수는 이제 사용하지 않습니다 (계비 관리 시스템 변경으로 인해)
    return 0; // 기본값으로 0 반환
  };

  // 포맷 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  // 투표 관리 함수
  const toggleVote = (dateId: string, timeId: string, memberName: string) => {
    const voteKey = `${dateId}-${timeId}`;
    
    setVotes(prevVotes => {
      const newVotes = { ...prevVotes };
      
      if (!newVotes[voteKey]) {
        newVotes[voteKey] = [];
      }
      
      const memberIndex = newVotes[voteKey].indexOf(memberName);
      
      if (memberIndex > -1) {
        // 이미 투표했다면 투표 취소
        newVotes[voteKey] = newVotes[voteKey].filter(name => name !== memberName);
      } else {
        // 투표 추가
        newVotes[voteKey] = [...newVotes[voteKey], memberName];
      }
      
      return newVotes;
    });
  };

  // 각 날짜와 시간에 대한 투표 결과 확인
  const getVotesForDateAndTime = (dateId: string, timeId: string) => {
    const voteKey = `${dateId}-${timeId}`;
    return votes[voteKey] || [];
  };

  // 가장 투표가 많은 날짜와 시간 찾기
  const getMostVotedOptions = () => {
    let maxVotes = 0;
    let mostVotedOptions: Array<{
      date: string;
      time: string;
      votes: number;
      voters: string[];
    }> = [];
    
    // 먼저 최대 투표수 찾기
    Object.entries(votes).forEach(([key, voters]: [string, string[]]) => {
      if (voters.length > maxVotes) {
        maxVotes = voters.length;
      }
    });
    
    // 최대 투표수가 0이면 투표가 없는 것
    if (maxVotes === 0) return [];
    
    // 최대 투표수와 같은 투표수를 가진 모든 옵션 찾기
    Object.entries(votes).forEach(([key, voters]: [string, string[]]) => {
      if (voters.length === maxVotes) {
        const [dateId, timeId] = key.split('-');
        const dateOption = dateOptions.find(d => d.id === dateId);
        const timeOption = timeOptions.find(t => t.id === timeId);
        
        if (dateOption && timeOption) {
          mostVotedOptions.push({
            date: dateOption.date,
            time: timeOption.time,
            votes: maxVotes,
            voters: voters
          });
        }
      }
    });
    
    return mostVotedOptions;
  };

  // 이전 버전의 함수 (단일 결과) - 하위 호환성 유지
  const getMostVotedOption = () => {
    const options = getMostVotedOptions();
    return options.length > 0 ? options[0] : null;
  };

  // 계비 납부 상태 토글
  const toggleDuesPayment = (memberId: string, year: number, month: number) => {
    setDuesPayments(prevPayments => {
      // 해당 회원, 년도, 월의 납부 내역 찾기
      const existingPaymentIndex = prevPayments.findIndex(
        p => p.memberId === memberId && p.year === year && p.month === month
      );
      
      // 새로운 배열 생성
      const newPayments = [...prevPayments];
      
      if (existingPaymentIndex >= 0) {
        // 이미 존재하면 paid 상태 토글
        newPayments[existingPaymentIndex] = {
          ...newPayments[existingPaymentIndex],
          paid: !newPayments[existingPaymentIndex].paid
        };
      } else {
        // 존재하지 않으면 새로 추가 (기본값 true = 납부함)
        newPayments.push({
          memberId,
          year,
          month,
          paid: true
        });
      }
      
      return newPayments;
    });
  };

  // 지출 추가 함수
  const addExpense = () => {
    if (!expenseInput.description || !expenseInput.amount) return;

    const newExpense: Expense = {
      id: new Date().getTime().toString(),
      date: expenseInput.date,
      description: expenseInput.description,
      amount: Number(expenseInput.amount)
    };

    setExpenses([...expenses, newExpense]);
    setExpenseInput({
      ...expenseInput,
      description: '',
      amount: ''
    });
  };

  // 지출 삭제 함수
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // 계비 납부 현황 확인
  const isDuesPaid = (memberId: string, year: number, month: number) => {
    return duesPayments.some(
      p => p.memberId === memberId && p.year === year && p.month === month && p.paid
    );
  };

  // 연간 총 계비 계산 (20,000원 x 회월 수 x 12개월)
  const calculateYearlyDues = (year: number) => {
    // 기본 계비 = 회원 수 x 12개월 x 20,000원
    const baseDues = MEMBERS.length * 12 * 20000;
    
    // 실제 납부된 금액
    const paidDues = duesPayments
      .filter(p => p.year === year && p.paid)
      .length * 20000;
    
    return {
      baseDues,     // 납부 대상 총액
      paidDues,     // 납부된 총액
      unpaidDues: baseDues - paidDues  // 미납된 총액
    };
  };

  // 연간 총 지출 계산
  const calculateYearlyExpenses = (year: number) => {
    return expenses
      .filter(e => new Date(e.date).getFullYear() === year)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // 연간 잔액 계산
  const calculateYearlyBalance = (year: number) => {
    const { paidDues } = calculateYearlyDues(year);
    const totalExpenses = calculateYearlyExpenses(year);
    
    return paidDues - totalExpenses;
  };

  // 월별 일괄 완납 처리 함수
  const handleBulkPayment = (month: number) => {
    // 현재 해당 월의 모든 회원 납부 상태 확인
    const isAllPaid = MEMBERS.every(member => 
      isDuesPaid(member, selectedYear, month)
    );
    
    // 모두 납부 상태라면 모두 취소, 아니면 모두 납부 처리
    MEMBERS.forEach(member => {
      // 현재 해당 회원의 납부 상태
      const isPaid = isDuesPaid(member, selectedYear, month);
      
      // 모두 납부된 상태면 모두 취소, 아니면 미납된 회원만 납부 처리
      if (isAllPaid || (!isAllPaid && !isPaid)) {
        toggleDuesPayment(member, selectedYear, month);
      }
    });
  };

  // 계원별 1년치 일괄 완납 처리 함수
  const handleMemberYearlyPayment = (member: string) => {
    // 해당 계원의 전체 납부 상태 확인
    const isAllPaid = Array.from({ length: 12 }, (_, i) => i + 1)
      .every(month => isDuesPaid(member, selectedYear, month));
    
    // 모든 달 처리
    Array.from({ length: 12 }, (_, i) => i + 1).forEach(month => {
      // 현재 해당 월의 납부 상태
      const isPaid = isDuesPaid(member, selectedYear, month);
      
      // 전체가 납부되어 있으면 모두 취소, 아니면 미납된 것만 납부 처리
      if (isAllPaid || (!isAllPaid && !isPaid)) {
        toggleDuesPayment(member, selectedYear, month);
      }
    });
  };

  // 월 이름 배열
  const MONTHS = [
    '1월', '2월', '3월', '4월', '5월', '6월', 
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  // 처음 로드 시 데이터 가져오기
  useEffect(() => {
    async function loadData() {
      // 1. 먼저 로컬 데이터 로드 (빠른 로딩)
      const localData = loadFromLocal();
      if (localData) {
        setDateOptions(localData.dateOptions || []);
        setTimeOptions(localData.timeOptions || []);
        setVotes(localData.votes || {});
        setDuesPayments(localData.duesPayments || []);
        setExpenses(localData.expenses || []);
        setSelectedLocation(localData.selectedLocation || null);
      }
      
      // 2. 서버 데이터 로드 (최신 데이터)
      const serverData = await loadFromServer();
      if (serverData) {
        setDateOptions(serverData.dateOptions || []);
        setTimeOptions(serverData.timeOptions || []);
        setVotes(serverData.votes || {});
        setDuesPayments(serverData.duesPayments || []);
        setExpenses(serverData.expenses || []);
        setSelectedLocation(serverData.selectedLocation || null);
      }
    }
    
    loadData();
  }, []);

  // 데이터 변경 시 저장
  useEffect(() => {
    // 처음 로드 시에는 저장 안함
    if (!dateOptions || dateOptions.length === 0) return;
    
    const data = {
      dateOptions,
      timeOptions,
      votes,
      duesPayments,
      expenses,
      selectedLocation
    };
    
    // 로컬 스토리지에 저장 (항상)
    saveToLocal(data);
    
    // 서버에 저장 (2초 간격으로)
    const timer = setTimeout(() => {
      saveToServer(data);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [dateOptions, timeOptions, votes, duesPayments, expenses, selectedLocation]);

  return (
    <main className="min-h-screen p-4 sm:p-8 pb-20 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">삶의 질 동기모임</h1>
        
        {/* 디버깅 정보 (호스트만 볼 수 있음) */}
        {selectedMember === HOST_NAME && (
          <div className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-md border-l-4 border-yellow-500">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span>디버깅 정보</span>
              <button
                className="ml-auto text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.from('meeting_data').select().limit(1);
                    alert(`Supabase 연결 테스트: ${error ? '실패' : '성공'}\n${error ? error.message : JSON.stringify(data)}`);
                  } catch (e: any) {
                    alert(`Supabase 연결 에러: ${e.message}`);
                  }
                }}
              >
                연결 테스트
              </button>
            </h2>
            <div className="text-sm space-y-2">
              <p>
                <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '설정 안됨'}
              </p>
              <p>
                <strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '설정 안됨'}
              </p>
              <p>
                <strong>데이터 저장:</strong> 
                <button
                  className="ml-2 text-xs px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                  onClick={() => {
                    const data = {
                      dateOptions,
                      timeOptions,
                      votes,
                      duesPayments,
                      expenses,
                      selectedLocation,
                      _debug: new Date().toISOString()
                    };
                    saveToServer(data)
                      .then(success => alert(`저장 ${success ? '성공' : '실패'}`))
                      .catch(e => alert(`저장 에러: ${e.message}`));
                  }}
                >
                  저장 테스트
                </button>
              </p>
              <p>
                <strong>데이터 불러오기:</strong> 
                <button
                  className="ml-2 text-xs px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                  onClick={() => {
                    loadFromServer()
                      .then(data => alert(`불러오기 ${data ? '성공' : '실패'}: ${JSON.stringify(data || {}).slice(0, 100)}...`))
                      .catch(e => alert(`불러오기 에러: ${e.message}`));
                  }}
                >
                  불러오기 테스트
                </button>
              </p>
            </div>
          </div>
        )}
        
        {/* 사용자 선택 섹션 */}
        <section className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">참여자 선택</h2>
          <p className="mb-4 text-gray-600">
            본인의 이름을 선택하여 모임 날짜에 투표해주세요.
          </p>
          <div className="max-w-xs">
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">-- 본인 이름 선택 --</option>
              {MEMBERS.map((member) => (
                <option key={member} value={member}>
                  {member}{member === HOST_NAME ? ' (호스트)' : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedMember && (
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <span className="mr-2">
                {selectedMember === HOST_NAME ? '호스트' : '참여자'}: {selectedMember}
              </span>
              <button
                onClick={() => setSelectedMember('')}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                변경
              </button>
            </div>
          )}
        </section>
        
        {/* 모임 일정 섹션 */}
        <section className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">모임 일정 설정</h2>
          <div className="space-y-6">
            {/* 장소 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                모임 장소
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="장소를 검색하거나 지도에서 선택하세요"
                    value={selectedLocation?.name || ''}
                    readOnly
                  />
                  {selectedMember === HOST_NAME ? (
                    <div className="flex gap-2 max-w-full overflow-x-auto">
                      <button 
                        className="min-w-fit px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                        onClick={() => {
                          setCurrentMapType('kakao');
                          setMapModalOpen(true);
                        }}
                      >
                        카카오맵
                      </button>
                      <button 
                        className="min-w-fit px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                        onClick={() => {
                          setCurrentMapType('naver');
                          setMapModalOpen(true);
                        }}
                      >
                        네이버맵
                      </button>
                    </div>
                  ) : selectedLocation && (
                    <div className="flex gap-2 max-w-full overflow-x-auto">
                      {selectedLocation.kakaoLink && (
                        <a
                          href={selectedLocation.kakaoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-fit px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-center text-sm"
                        >
                          카카오맵으로 보기
                        </a>
                      )}
                      {selectedLocation.naverLink && (
                        <a
                          href={selectedLocation.naverLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-fit px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-center text-sm"
                        >
                          네이버맵으로 보기
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {selectedLocation && selectedMember === HOST_NAME && (
                  <div className="flex gap-2 text-sm">
                    {selectedLocation.kakaoLink && (
                      <a
                        href={selectedLocation.kakaoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-600 hover:underline"
                      >
                        카카오맵에서 보기
                      </a>
                    )}
                    {selectedLocation.naverLink && (
                      <a
                        href={selectedLocation.naverLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        네이버맵에서 보기
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 호스트 전용 설정 */}
            {selectedMember === HOST_NAME && (
              <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium">모임 시간 & 날짜 설정 (호스트 전용)</h3>
                
                {/* 시간 설정 */}
                <div>
                  <h4 className="text-md font-medium mb-2">1. 모임 시간 설정</h4>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="time"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      value={timeInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        // 30분 단위로 제한
                        const time = e.target.value;
                        const [hours, minutes] = time.split(':').map(Number);
                        const roundedMinutes = Math.round(minutes / 30) * 30;
                        const formattedTime = `${hours.toString().padStart(2, '0')}:${roundedMinutes === 60 ? '00' : roundedMinutes.toString().padStart(2, '0')}`;
                        setTimeInput(formattedTime);
                      }}
                      step="1800"  // 30분 단위 (30분 = 1800초)
                    />
                    <button 
                      onClick={addTimeOption}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      disabled={!timeInput}
                    >
                      추가
                    </button>
                  </div>
                  
                  {/* 추가된 시간 목록 */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {timeOptions.map((time) => (
                      <div key={time.id} className="inline-flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                        <span>{time.time}</span>
                        <button
                          onClick={() => removeTimeOption(time.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {timeOptions.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">먼저 모임 가능 시간을 설정해주세요.</p>
                  )}
                </div>
                
                {/* 날짜 설정 */}
                <div>
                  <h4 className="text-md font-medium mb-2">2. 모임 가능 날짜 설정</h4>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      value={dateInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateInput(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <button 
                      onClick={addDateOption}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      disabled={!dateInput}
                    >
                      추가
                    </button>
                  </div>
                  
                  {/* 추가된 날짜 목록 */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dateOptions.map((date) => (
                      <div key={date.id} className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-md border border-green-200">
                        <span>{formatDate(date.date)}</span>
                        <button
                          onClick={() => removeDateOption(date.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {dateOptions.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">모임 가능 날짜를 설정해주세요.</p>
                  )}
                </div>
              </div>
            )}

            {/* 날짜 및 시간 투표 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">날짜 투표</h3>
                {!selectedMember && (
                  <div className="text-sm text-gray-500">
                    투표하려면 먼저 본인 이름을 선택해주세요
                  </div>
                )}
              </div>
              
              {dateOptions.length === 0 || timeOptions.length === 0 ? (
                <p className="text-gray-500 py-4 text-center">
                  {dateOptions.length === 0 && timeOptions.length === 0 
                    ? '아직 날짜와 시간이 설정되지 않았습니다.' 
                    : dateOptions.length === 0 
                      ? '아직 날짜가 설정되지 않았습니다.' 
                      : '아직 시간이 설정되지 않았습니다.'}
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜 / 시간</th>
                        {timeOptions.map(time => (
                          <th key={time.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {time.time}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateOptions.map(dateOption => (
                        <tr key={dateOption.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatDate(dateOption.date)}
                          </td>
                          {timeOptions.map(timeOption => {
                            const voters = getVotesForDateAndTime(dateOption.id, timeOption.id);
                            const hasVoted = selectedMember ? voters.includes(selectedMember) : false;
                            
                            return (
                              <td key={timeOption.id} className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <div 
                                    className={`relative inline-flex justify-center items-center w-8 h-8 rounded-full mb-1 cursor-pointer border ${
                                      hasVoted 
                                        ? 'bg-blue-100 border-blue-400 text-blue-800' 
                                        : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                                    }`}
                                    onClick={() => selectedMember && toggleVote(dateOption.id, timeOption.id, selectedMember)}
                                    title={hasVoted ? '참석 불가능으로 변경' : '참석 가능으로 변경'}
                                  >
                                    {hasVoted ? '✓' : ''}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {voters.length > 0 ? `${voters.length}명` : ''}
                                  </div>
                                </div>
                                {voters.length > 0 && (
                                  <div className="hidden group-hover:block absolute z-10 bg-white p-2 rounded shadow-lg border">
                                    <div className="text-xs font-medium mb-1">참여 가능:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {voters.map(voter => (
                                        <span key={voter} className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded text-xs">
                                          {voter}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* 최종 결정된 일정 표시 (가장 많은 투표를 받은 날짜) */}
            {getMostVotedOptions().length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">
                  현재 가장 많은 투표를 받은 날짜
                  {getMostVotedOptions().length > 1 ? ' (복수)' : ''}
                </h3>
                
                {getMostVotedOptions().map((option, index) => (
                  <div key={`${option.date}-${option.time}`} className={index > 0 ? "mt-4 pt-4 border-t border-green-200" : "mt-2"}>
                    <div className="text-xl">
                      {formatDate(option.date)} {option.time}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {option.votes}명 참여 가능
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {option.voters.map(voter => (
                        <span 
                          key={`${option.date}-${option.time}-${voter}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {voter}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* 계비 관리 섹션 */}
        <section className="p-4 sm:p-6 bg-white rounded-lg shadow-md mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">계비 관리</h2>
          
          {/* 연도 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연도 선택
            </label>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 계비 현황 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">납부 대상 총액</div>
              <div className="text-xl font-bold text-blue-700">
                {formatCurrency(calculateYearlyDues(selectedYear).baseDues)}
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-gray-600 mb-1">납부된 총액</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(calculateYearlyDues(selectedYear).paidDues)}
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-gray-600 mb-1">미납된 총액</div>
              <div className="text-xl font-bold text-red-700">
                {formatCurrency(calculateYearlyDues(selectedYear).unpaidDues)}
              </div>
            </div>
          </div>
          
          {/* 연간 잔액 요약 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-3 text-yellow-800">{selectedYear}년 계비 잔액</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">납부된 총액:</span>
                <span className="text-green-700">{formatCurrency(calculateYearlyDues(selectedYear).paidDues)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">지출 총액:</span>
                <span className="text-red-700">{formatCurrency(calculateYearlyExpenses(selectedYear))}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">잔액:</span>
                <span className={`font-bold ${
                  calculateYearlyBalance(selectedYear) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formatCurrency(calculateYearlyBalance(selectedYear))}
                </span>
              </div>
            </div>
          </div>
          
          {/* 월별 납부 현황 테이블 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3">월별 납부 현황</h3>
            
            {/* 월별 일괄 완납 버튼 (호스트 전용) */}
            {selectedMember === HOST_NAME && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium mb-2">월별 일괄 완납 처리 (세로 처리)</h4>
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map((month, index) => {
                    const monthNumber = index + 1;
                    const isAllPaid = MEMBERS.every(member => 
                      isDuesPaid(member, selectedYear, monthNumber)
                    );
                    
                    return (
                      <button
                        key={month}
                        onClick={() => handleBulkPayment(monthNumber)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          isAllPaid 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                        title={isAllPaid ? '모두 납부 취소' : '모두 납부 처리'}
                      >
                        {month} {isAllPaid ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 계원별 1년치 일괄 완납 버튼 (호스트 전용) */}
            {selectedMember === HOST_NAME && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium mb-2">계원별 1년치 일괄 완납 처리 (가로 처리)</h4>
                <div className="flex flex-wrap gap-2">
                  {MEMBERS.map((member) => {
                    // 해당 계원의 전체 납부 상태 확인
                    const isAllPaid = Array.from({ length: 12 }, (_, i) => i + 1)
                      .every(month => isDuesPaid(member, selectedYear, month));
                    
                    return (
                      <button
                        key={member}
                        onClick={() => handleMemberYearlyPayment(member)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          isAllPaid 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                        title={isAllPaid ? '모든 납부 취소' : '1년치 납부 처리'}
                      >
                        {member} {isAllPaid ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      이름
                    </th>
                    {MONTHS.map((month, index) => (
                      <th key={month} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {month}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      납부합계
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {MEMBERS.map((member) => {
                    // 해당 회원의 연간 납부 횟수
                    const paidMonthsCount = Array.from({ length: 12 }, (_, i) => i + 1)
                      .filter(month => isDuesPaid(member, selectedYear, month))
                      .length;
                    
                    return (
                      <tr key={member}>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                          {member}
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                          const isPaid = isDuesPaid(member, selectedYear, month);
                          
                          return (
                            <td 
                              key={`${member}-${month}`} 
                              className={`px-3 py-3 text-center ${selectedMember === HOST_NAME ? 'cursor-pointer' : ''}`}
                              onClick={() => selectedMember === HOST_NAME && toggleDuesPayment(member, selectedYear, month)}
                            >
                              <div 
                                className={`mx-auto w-6 h-6 flex items-center justify-center rounded-full ${
                                  isPaid 
                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                    : 'bg-gray-100 text-gray-400 border border-gray-300'
                                } ${selectedMember === HOST_NAME ? 'cursor-pointer' : ''}`}
                                title={selectedMember === HOST_NAME ? (isPaid ? '납부 취소' : '납부 처리') : (isPaid ? '납부됨' : '미납')}
                              >
                                {isPaid ? '✓' : ''}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center font-medium">
                          {formatCurrency(paidMonthsCount * 20000)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {selectedMember === HOST_NAME ? (
                <span><span className="font-medium">도움말:</span> 각 월의 박스를 클릭하여 납부 여부를 변경할 수 있습니다. (월 2만원)</span>
              ) : (
                <span>납부 여부는 호스트만 변경할 수 있습니다. (월 2만원)</span>
              )}
            </div>
          </div>
          
          {/* 지출 내역 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3">지출 내역</h3>
            
            {/* 지출 추가 폼 - 호스트만 사용 가능 */}
            {selectedMember === HOST_NAME && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      날짜
                    </label>
                    <input
                      type="date"
                      value={expenseInput.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseInput({...expenseInput, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      내용
                    </label>
                    <input
                      type="text"
                      placeholder="지출 내역"
                      value={expenseInput.description}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseInput({...expenseInput, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      금액
                    </label>
                    <input
                      type="number"
                      placeholder="금액"
                      value={expenseInput.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseInput({...expenseInput, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={addExpense}
                    disabled={!expenseInput.description || !expenseInput.amount}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    지출 추가
                  </button>
                </div>
              </div>
            )}
            
            {expenses.filter(e => new Date(e.date).getFullYear() === selectedYear).length === 0 ? (
              <p className="text-gray-500 text-center py-4">아직 등록된 지출 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">내용</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                      {selectedMember === HOST_NAME && (
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses
                      .filter(expense => new Date(expense.date).getFullYear() === selectedYear)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(expense => (
                        <tr key={expense.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                            {formatCurrency(expense.amount)}
                          </td>
                          {selectedMember === HOST_NAME && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => removeExpense(expense.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                삭제
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900" colSpan={2}>
                        총 지출
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900">
                        {formatCurrency(calculateYearlyExpenses(selectedYear))}
                      </td>
                      {selectedMember === HOST_NAME && <td></td>}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900" colSpan={2}>
                        잔액 (납부된 계비 - 지출)
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900">
                        {formatCurrency(calculateYearlyBalance(selectedYear))}
                      </td>
                      {selectedMember === HOST_NAME && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
      
      {/* 계비 요약 정보를 항상 보여주는 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white py-3 px-4 shadow-lg z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-1 sm:mb-0">
              <div className="text-sm">
                <span className="mr-2">계비 합계:</span>
                <span className="font-bold text-green-400">{formatCurrency(calculateYearlyDues(selectedYear).paidDues)}</span>
              </div>
              <div className="text-sm">
                <span className="mr-2">지출 합계:</span>
                <span className="font-bold text-red-400">{formatCurrency(calculateYearlyExpenses(selectedYear))}</span>
              </div>
              <div className="text-sm">
                <span className="mr-2">잔액:</span>
                <span className={`font-bold ${
                  calculateYearlyBalance(selectedYear) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(calculateYearlyBalance(selectedYear))}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-300">
              {selectedYear}년 계비 현황
            </div>
          </div>
        </div>
      </div>
      
      {/* 지도 모달 */}
      <MapModal 
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={(location) => {
          setSelectedLocation(location);
          setMapModalOpen(false);
        }}
        mapType={currentMapType}
      />
    </main>
  );
}
