'use client';

import React, { useState, useEffect } from 'react';
import { MEMBERS, HOST_NAME } from '@/constants/members';
import MapModal from '@/components/MapModal';
import { saveToLocal, loadFromLocal, saveToServer, loadFromServer } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import KakaoShareButton from '@/components/KakaoShare';
import { getTodaysBirthdayMembers, getUpcomingBirthdayMembers, BirthdayMember } from '@/constants/birthdays';

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
  
  // 투표 결과 확정 관련 상태
  const [confirmedDateOption, setConfirmedDateOption] = useState<{
    dateId: string;
    timeId: string;
    date: string;
    time: string;
  } | null>(null);

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

  // 투표자 목록 팝업 상태 (최상위 레벨로 이동)
  const [showVotersPopup, setShowVotersPopup] = useState<boolean>(false);
  
  // 저장 성공 메시지 표시 상태
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);

  // 오늘이 생일인지 체크하는 함수
  const isBirthdayToday = () => {
    return getTodaysBirthdayMembers().length > 0;
  };

  // 생일 알림을 확인했는지 저장하는 상태
  const [birthdayNotified, setBirthdayNotified] = useState<{[key: string]: boolean}>({});
  
  // 생일 알림 팝업 표시 상태
  const [showBirthdayAlert, setShowBirthdayAlert] = useState<boolean>(false);
  
  // 호스트에게 생일 알림 표시
  useEffect(() => {
    // 호스트이고 오늘 생일인 멤버가 있을 때만 실행
    if (isHost() && isBirthdayToday()) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 오늘 날짜에 이미 알림을 표시했는지 확인
      const wasNotified = birthdayNotified[today] || false;
      
      if (!wasNotified) {
        // 알림 표시
        setShowBirthdayAlert(true);
        
        // 알림 표시 내역 저장
        setBirthdayNotified(prev => ({
          ...prev,
          [today]: true
        }));
        
        // 로컬 스토리지에 알림 내역 저장
        saveToLocal('birthdayNotified', {
          ...birthdayNotified,
          [today]: true
        });
      }
    }
  }, [selectedMember, birthdayNotified]);
  
  // 페이지 로드 시 생일 알림 내역 불러오기
  useEffect(() => {
    const notifiedData = loadFromLocal('birthdayNotified');
    if (notifiedData) {
      setBirthdayNotified(notifiedData as { [key: string]: boolean });
    }
  }, []);

  // 호스트 여부 확인 함수
  const isHost = () => {
    return selectedMember === HOST_NAME;
  };

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
    const date = new Date(dateStr);
    
    // 연도 2자리로 표시 (예: 2025 -> 25)
    const year = date.getFullYear().toString().slice(2);
    
    // 월, 일 가져오기
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 요일 가져오기
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
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

  // 투표 결과 확정 함수
  const confirmDateOption = (dateId: string, timeId: string) => {
    // 호스트만 사용 가능
    if (!isHost()) return;
    
    const dateOption = dateOptions.find(d => d.id === dateId);
    const timeOption = timeOptions.find(t => t.id === timeId);
    
    if (dateOption && timeOption) {
      setConfirmedDateOption({
        dateId,
        timeId,
        date: dateOption.date,
        time: timeOption.time
      });
      
      // 확정 정보 저장
      saveToLocal('confirmedDate', {
        dateId,
        timeId,
        date: dateOption.date,
        time: timeOption.time
      });
    }
  };
  
  // 투표하지 않은 멤버 목록 가져오기
  const getUnvotedMembers = () => {
    // 모든 투표를 한 멤버 목록 수집
    const allVoters = new Set<string>();
    
    Object.values(votes).forEach(voters => {
      voters.forEach(voter => {
        allVoters.add(voter);
      });
    });
    
    // 투표하지 않은 멤버 필터링
    return MEMBERS.filter(member => !allVoters.has(member));
  };
  
  // 현재 월에 납부하지 않은 멤버 목록 가져오기
  const getCurrentMonthUnpaidMembers = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript의 월은 0부터 시작
    
    return MEMBERS.filter(member => 
      !isDuesPaid(member, currentYear, currentMonth)
    );
  };

  // 페이지 로드 시 저장된 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      try {
        // 서버 데이터를 먼저 로드 (최신 데이터)
        const serverData = await loadFromServer() as any;
        
        if (serverData) {
          console.log('서버에서 데이터를 불러왔습니다.');
          setDateOptions(serverData.dateOptions || []);
          setTimeOptions(serverData.timeOptions || []);
          setVotes(serverData.votes || {});
          setDuesPayments(serverData.duesPayments || []);
          setExpenses(serverData.expenses || []);
          setSelectedLocation(serverData.selectedLocation || null);
          
          // 서버 데이터를 로컬에도 저장 (백업)
          saveToLocal('meetingData', serverData);
        } else {
          // 서버 데이터가 없을 경우에만 로컬 데이터 사용
          console.log('서버 데이터가 없어 로컬 데이터를 불러옵니다.');
          const localData = loadFromLocal() as any;
          if (localData) {
            setDateOptions(localData.dateOptions || []);
            setTimeOptions(localData.timeOptions || []);
            setVotes(localData.votes || {});
            setDuesPayments(localData.duesPayments || []);
            setExpenses(localData.expenses || []);
            setSelectedLocation(localData.selectedLocation || null);
          }
        }
        
        // 저장된 확정 날짜 불러오기
        const savedConfirmedDate = loadFromLocal('confirmedDate');
        if (savedConfirmedDate) {
          setConfirmedDateOption(savedConfirmedDate as { 
            dateId: string; 
            timeId: string; 
            date: string; 
            time: string; 
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        
        // 서버 로드 실패 시 로컬 데이터 사용
        const localData = loadFromLocal() as any;
        if (localData) {
          setDateOptions(localData.dateOptions || []);
          setTimeOptions(localData.timeOptions || []);
          setVotes(localData.votes || {});
          setDuesPayments(localData.duesPayments || []);
          setExpenses(localData.expenses || []);
          setSelectedLocation(localData.selectedLocation || null);
        }
      }
    }
    
    loadData();
  }, []);

  // 데이터 변경 시 저장
  useEffect(() => {
    // 처음 로드 시에는 저장 안함 (빈 데이터 저장 방지)
    if (!dateOptions || dateOptions.length === 0) return;
    
    const data = {
      dateOptions,
      timeOptions,
      votes,
      duesPayments,
      expenses,
      selectedLocation
    };
    
    // 로컬 스토리지에 저장 (항상, 백업용)
    saveToLocal('meetingData', data);
    
    // 서버에 즉시 저장 (타이머 제거하고 바로 저장)
    saveToServer(data)
      .then(success => {
        if (success) {
          console.log('서버에 데이터가 성공적으로 저장되었습니다.');
        } else {
          console.warn('서버 저장에 실패했습니다. 로컬 백업만 완료되었습니다.');
        }
      })
      .catch(e => console.error('서버 저장 에러:', e));
    
  }, [dateOptions, timeOptions, votes, duesPayments, expenses, selectedLocation]);

  // 페이지 언로드(닫기) 시 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 페이지 닫기 전 마지막으로 한번 더 저장
      const data = {
        dateOptions,
        timeOptions,
        votes,
        duesPayments,
        expenses,
        selectedLocation
      };
      
      // 로컬 저장 (동기적)
      saveToLocal('meetingData', data);
      
      // 서버 저장 시도 - sendBeacon 사용 (비동기지만 페이지 닫혀도 실행됨)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({
          id: 'life-meeting',
          data
        })], { type: 'application/json' });
        
        navigator.sendBeacon('/api/save-data', blob);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dateOptions, timeOptions, votes, duesPayments, expenses, selectedLocation]);

  // 페이지 초기화
  const resetState = () => {
    // 데이터 초기화
    const resetData = {
      selectedLocation: null,
      timeOptions: [],
      dateOptions: [],
      votes: {},
      duesPayments: [],
      expenses: [],
      _resetTime: new Date().toISOString()
    };
    
    // 상태 업데이트
    setSelectedLocation(null);
    setTimeOptions([]);
    setDateOptions([]);
    setVotes({});
    setDuesPayments([]);
    setExpenses([]);
    
    // 저장
    saveToLocal('meetingData', resetData);
    saveToServer(resetData)
      .then(success => {
        if (!success) {
          console.warn('서버 초기화 실패. 다시 시도해주세요.');
        }
      });
    
    alert('모든 데이터가 초기화되었습니다.');
  };

  // 디버깅 정보 저장
  const saveDebugInfo = () => {
    const data = {
      selectedLocation,
      dateOptions,
      timeOptions,
      votes,
      duesPayments,
      expenses,
      _saveTime: new Date().toISOString()
    };
    
    saveToLocal('meetingData', data);
    saveToServer(data)
      .then(success => alert(`저장 ${success ? '성공' : '실패'}`))
      .catch(e => alert(`저장 에러: ${e.message}`));
  };

  // 데이터 상태 확인
  const checkDataStatus = async () => {
    try {
      // 현재 서버 데이터 가져오기
      const serverData = await loadFromServer('life-meeting') as any;
      
      // 현재 로컬 데이터 가져오기
      const localData = loadFromLocal('meetingData') as any;
      
      // 데이터 비교
      const serverTimestamp = serverData?._lastUpdated || 'None';
      const localTimestamp = localData?._saveTime || 'None';
      
      const status = `
데이터 상태:
------------------------------
서버 데이터: ${serverData ? '있음' : '없음'}
서버 마지막 업데이트: ${serverTimestamp}
------------------------------
로컬 데이터: ${localData ? '있음' : '없음'}
로컬 마지막 저장: ${localTimestamp}
------------------------------
정보: ${Object.keys(votes).length}명 투표 / ${duesPayments.length}명 회비 / ${expenses.length}개 지출
      `;
      
      alert(status);
    } catch (error) {
      alert(`데이터 확인 실패: ${(error as Error).message}`);
    }
  };

  // 생일까지 남은 일수를 계산하는 함수
  const getDaysUntilBirthday = (birthMonth: number, birthDay: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const birthDate = new Date(currentYear, birthMonth - 1, birthDay);
    
    // 이미 지난 경우 다음 해로 설정
    if (today > birthDate) {
      birthDate.setFullYear(currentYear + 1);
    }
    
    const diffTime = birthDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // 생일 날짜를 포맷하는 함수
  const formatBirthday = (birthDate: string) => {
    const [month, day] = birthDate.split('-').map(Number);
    const daysUntil = getDaysUntilBirthday(month, day);
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    
    let emoji = '🎂';
    if (daysUntil <= 7) emoji = '🎉🎊🎂'; // 7일 이내
    else if (daysUntil <= 14) emoji = '🎁🎂'; // 14일 이내
    
    let daysText = '';
    if (daysUntil === 0) {
      daysText = '오늘이에요! 🥳🎉';
    } else if (daysUntil === 1) {
      daysText = '내일이에요! 🤩';
    } else {
      daysText = `${daysUntil}일 남았어요! ${daysUntil <= 7 ? '🥳' : '✨'}`;
    }
    
    return {
      formatted: `${emoji} ${monthNames[month-1]} ${day}일 (${daysText})`,
      daysUntil
    };
  };

  // 각 섹션에 ID 추가
  useEffect(() => {
    // URL 파라미터 확인
    const handleURLParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section');
      
      if (section) {
        // 페이지가 완전히 로드된 후 스크롤 수행
        setTimeout(() => {
          let targetElement;
          
          switch (section) {
            case 'schedule':
              // 모임 일정 섹션으로 스크롤
              targetElement = document.getElementById('schedule-section');
              // 투표 결과 영역이 있으면 그쪽으로 스크롤
              const voteResults = document.getElementById('vote-results');
              if (voteResults) targetElement = voteResults;
              break;
            case 'vote':
              // 투표 섹션으로 스크롤
              targetElement = document.getElementById('vote-section');
              break;
            case 'dues':
              // 계비 관리 섹션으로 스크롤
              targetElement = document.getElementById('dues-section');
              break;
            case 'birthday':
              // 생일 알림 섹션으로 스크롤
              targetElement = document.getElementById('birthday-section');
              break;
          }
          
          if (targetElement) {
            // 먼저 부드럽게 스크롤
            window.scrollTo({
              top: targetElement.offsetTop - 20, // 약간의 여백 추가
              behavior: 'smooth'
            });
            
            // 스크롤 완료 후 섹션 하이라이트 효과 추가
            setTimeout(() => {
              // 임시 하이라이트 클래스 추가
              targetElement.classList.add('highlight-section');
              
              // 3초 후 하이라이트 제거
              setTimeout(() => {
                targetElement.classList.remove('highlight-section');
              }, 3000);
            }, 1000);
          }
        }, 10); // 페이지 로딩 후 스크롤하기 위한 시간 조정 (500ms에서 10ms로 변경)
      }
    };
    
    // 하이라이트 스타일 동적 추가
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes highlightPulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
        70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      .highlight-section {
        animation: highlightPulse 2s ease-out;
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    handleURLParams();
    
    // 컴포넌트 언마운트 시 스타일 제거
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto pb-20 bg-gray-50">
      <h1 className="text-2xl font-bold mb-8 text-center py-4 border-b-2 border-blue-500">삶의 질 동기모임</h1>
      
      {/* 참여자 선택 섹션 */}
      <section className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-700 flex items-center">
          <span className="mr-2">👥</span>
          참여자 선택
        </h2>
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
      
      {/* 생일 알림 모달 */}
      {showBirthdayAlert && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">🎂 생일 알림</h3>
            <p className="mb-4">오늘은 다음 멤버의 생일입니다:</p>
            <div className="mb-4">
              {getTodaysBirthdayMembers().map(member => (
                <div key={member.name} className="p-2 bg-yellow-50 rounded mb-2">
                  <p className="font-semibold">{member.name}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBirthdayAlert(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                나중에 알림
              </button>
              <button
                onClick={() => {
                  // 생일 멤버가 있으면 첫 번째 멤버의 생일을 공유
                  if (getTodaysBirthdayMembers().length > 0) {
                    const member = getTodaysBirthdayMembers()[0];
                    // 여기서 카카오톡 공유 기능 호출 - 직접 호출하기보다는 버튼 클릭 준비
                    setShowBirthdayAlert(false);
                    
                    // 잠시 후 자동으로 스크롤
                    setTimeout(() => {
                      const birthdaySection = document.getElementById('birthday-section');
                      if (birthdaySection) {
                        birthdaySection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 500);
                  }
                }}
                className="flex-1 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                축하 메시지 준비
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 생일 알림 섹션 - 이미 개선됨 */}
      <section id="birthday-section" className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg shadow-md mb-8 border-l-4 border-pink-500">
        <h2 className="text-xl font-semibold mb-4 flex items-center text-pink-700">
          <span className="text-2xl mr-2">🎂</span> 
          생일 알림 공유
          <span className="text-2xl ml-2">🎈</span>
        </h2>
        
        {/* 기존 생일 알림 내용 유지 */}
        {getTodaysBirthdayMembers().length > 0 ? (
          <>
            <p className="mb-4 font-medium text-pink-700">✨ 오늘 생일인 멤버가 있습니다! ✨</p>
            {getTodaysBirthdayMembers().map((member) => (
              <div key={member.name} className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-pink-50 rounded-lg border border-yellow-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg text-pink-800">
                      🎉 오늘은 {member.name}의 생일입니다! 🎉
                    </p>
                    <p className="text-gray-600">다 같이 축하해요! 👏👏👏</p>
                  </div>
                  <div className="text-3xl">🎁</div>
                </div>
                <div className="mt-3">
                  <KakaoShareButton
                    templateType="birthday"
                    params={{
                      memberName: member.name,
                      birthDate: member.birthDate
                    }}
                    buttonText="🎊 생일 축하 공유하기 🎊"
                    className="mt-2 bg-pink-500 hover:bg-pink-600"
                  />
                </div>
              </div>
            ))}
          </>
        ) : (
          <p className="p-3 bg-white rounded-lg border border-gray-200">오늘 생일인 멤버가 없습니다. 🙂</p>
        )}
        
        {getUpcomingBirthdayMembers(30).length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3 flex items-center text-purple-800">
              <span className="text-xl mr-2">🗓️</span> 
              다가오는 생일 (30일 이내)
            </h3>
            <div className="grid gap-3">
              {getUpcomingBirthdayMembers(30).map((member) => {
                const birthday = formatBirthday(member.birthDate);
                return (
                  <div 
                    key={member.name} 
                    className={`p-3 rounded-lg border ${
                      member.daysUntil && member.daysUntil <= 7 
                        ? 'bg-gradient-to-r from-pink-50 to-red-50 border-pink-200' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium">
                        <span className="text-lg">{member.name}</span> 
                        <span className="ml-2 text-gray-600">{birthday.formatted}</span>
                      </p>
                      {isHost() && (
                        <KakaoShareButton
                          templateType="birthday"
                          params={{
                            memberName: member.name,
                            birthDate: member.birthDate
                          }}
                          buttonText={member.daysUntil && member.daysUntil <= 7 ? "🎉 지금 축하하기" : "🎂 축하 준비하기"}
                          className={`text-xs ${
                            member.daysUntil && member.daysUntil <= 7 
                              ? 'bg-pink-500 hover:bg-pink-600' 
                              : 'bg-purple-500 hover:bg-purple-600'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
      
      {/* 모임 일정 섹션 */}
      <section id="schedule-section" className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-md border-l-4 border-green-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-green-700 flex items-center">
            <span className="mr-2">📅</span>
            모임일정
          </h2>
          
          {/* 호스트 전용 리셋 버튼 */}
          {selectedMember === HOST_NAME && (
            <button
              onClick={() => {
                if (window.confirm('정말 모임 정보를 초기화하시겠습니까? (장소, 시간, 날짜, 투표 정보가 모두 삭제됩니다)')) {
                  // 모임 장소 초기화
                  setSelectedLocation(null);
                  
                  // 시간 옵션 초기화
                  setTimeOptions([]);
                  setTimeInput('');
                  
                  // 날짜 옵션 초기화
                  setDateOptions([]);
                  setDateInput('');
                  
                  // 투표 초기화
                  setVotes({});
                  
                  // 로컬 저장소에도 반영
                  const data = {
                    selectedLocation: null,
                    timeOptions: [],
                    dateOptions: [],
                    votes: {},
                    // 계비 관리 정보는 유지
                    duesPayments,
                    expenses,
                    _resetTime: new Date().toISOString()
                  };
                  saveToLocal(data);
                  
                  alert('모임 정보가 초기화되었습니다.');
                }
              }}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              모임정보 초기화
            </button>
          )}
        </div>
        <div className="space-y-6">
          {/* 장소 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              모임 장소
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="장소를 검색하거나 지도에서 선택하세요"
                value={selectedLocation?.name || ''}
                readOnly
              />
              {selectedMember === HOST_NAME ? (
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                    onClick={() => {
                      setCurrentMapType('kakao');
                      setMapModalOpen(true);
                    }}
                  >
                    카카오맵
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                    onClick={() => {
                      setCurrentMapType('naver');
                      setMapModalOpen(true);
                    }}
                  >
                    네이버맵
                  </button>
                </div>
              ) : selectedLocation && (
                <div className="flex gap-2">
                  {selectedLocation.kakaoLink && (
                    <a
                      href={selectedLocation.kakaoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-center text-sm"
                    >
                      카카오맵으로 보기
                    </a>
                  )}
                  {selectedLocation.naverLink && (
                    <a
                      href={selectedLocation.naverLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-center text-sm"
                    >
                      네이버맵으로 보기
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
                  <div className="relative w-48">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none cursor-pointer"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                    >
                      <option value="">시간 선택</option>
                      {Array.from({ length: 24 }, (_, hour) => (
                        [0, 30].map(minute => {
                          const formattedHour = hour.toString().padStart(2, '0');
                          const formattedMinute = minute.toString().padStart(2, '0');
                          const formattedTime = `${formattedHour}:${formattedMinute}`;
                          return (
                            <option key={formattedTime} value={formattedTime}>
                              {formattedTime}
                            </option>
                          );
                        })
                      )).flat()}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
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
          <div id="vote-section" className="space-y-4 p-4 sm:p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">날짜 투표</h3>
              
              {/* 이름 선택 콤보박스 추가 */}
              <div className="max-w-xs">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="text-sm px-2 py-1 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">이름 선택</option>
                  {MEMBERS.map((member) => (
                    <option key={member} value={member}>
                      {member}{member === HOST_NAME ? ' (호스트)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 미투표자 목록 표시 (투표 완료에서 변경) */}
            {MEMBERS.length > 0 && (
              <div className="relative flex items-center mb-4">
                <span className="text-sm text-gray-600 mr-2">미투표자:</span>
                <div className="flex flex-wrap items-center gap-1">
                  {/* 미투표자 목록 구하기 */}
                  {(() => {
                    // 모든 투표자 계산 (중복 제거)
                    const allVoters = Array.from(new Set(
                      Object.values(votes)
                        .flatMap(voters => voters || [])
                        .filter(voter => voter !== undefined)
                    ));
                    
                    // 미투표자 = 전체 멤버 - 투표자
                    const nonVoters = MEMBERS.filter(member => !allVoters.includes(member));
                    
                    // 미투표자가 없을 경우 "없음" 표시
                    if (nonVoters.length === 0) {
                      return (
                        <span className="text-sm text-green-600 font-medium">
                          모두 투표 완료
                        </span>
                      );
                    }
                    
                    return (
                      <>
                        {/* 모든 미투표자 표시 */}
                        {nonVoters.map(member => (
                          <span 
                            key={`nonvoter-${member}`}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-white"
                            title={member}
                          >
                            {member}
                          </span>
                        ))}
                        
                        {/* 미투표자에게 카카오톡 알림 보내기 버튼 (호스트만 볼 수 있음) */}
                        {selectedMember === HOST_NAME && nonVoters.length > 0 && (
                          <div className="ml-2">
                            <KakaoShareButton
                              templateType="vote"
                              params={{ memberNames: nonVoters }}
                              buttonText="투표 독촉하기"
                              className="text-xs py-1 px-2"
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
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
          
          {/* 모든 날짜 불가능 옵션 추가 */}
          {(dateOptions.length > 0 && timeOptions.length > 0) && (
            <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-red-600 rounded"
                  checked={selectedMember ? Object.keys(votes).some(key => key === 'all-dates-unavailable' && votes[key]?.includes(selectedMember)) : false}
                  onChange={() => {
                    if (!selectedMember) return;
                    
                    setVotes((prevVotes) => {
                      const newVotes = { ...prevVotes };
                      const key = 'all-dates-unavailable';
                      
                      if (!newVotes[key]) {
                        newVotes[key] = [];
                      }
                      
                      const memberIndex = newVotes[key].indexOf(selectedMember);
                      
                      if (memberIndex > -1) {
                        // 이미 체크했다면 체크 취소
                        newVotes[key] = newVotes[key].filter((name: string) => name !== selectedMember);
                      } else {
                        // 체크 추가
                        newVotes[key] = [...newVotes[key], selectedMember];
                      }
                      
                      return newVotes;
                    });
                  }}
                  disabled={!selectedMember}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">모든 날짜 불가능</span>
                
                {/* 모든 날짜 불가능 투표자 표시 */}
                {votes['all-dates-unavailable'] && votes['all-dates-unavailable'].length > 0 && (
                  <div className="ml-auto flex items-center">
                    <span className="text-xs text-gray-500 mr-2">{votes['all-dates-unavailable'].length}명</span>
                    <div className="flex -space-x-1">
                      {votes['all-dates-unavailable'].map((voter, index) => (
                        <span 
                          key={`unavailable-${voter}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-white"
                          title={voter}
                        >
                          {index < 3 ? voter : index === 3 ? `+${votes['all-dates-unavailable'].length - 3}` : null}
                        </span>
                      )).slice(0, 4)}
                    </div>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* 저장 버튼 추가 */}
          {selectedMember && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  // 현재 상태를 로컬 스토리지에 저장
                  const data = {
                    selectedLocation,
                    dateOptions,
                    timeOptions,
                    votes,
                    duesPayments,
                    expenses,
                    _saveTime: new Date().toISOString()
                  };
                  
                  saveToLocal(data);
                  
                  // 저장 성공 표시
                  setShowSaveSuccess(true);
                  
                  // 3초 후 메시지 숨기기
                  setTimeout(() => {
                    setShowSaveSuccess(false);
                  }, 3000);
                }}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                투표완료 및 저장
              </button>
            </div>
          )}
          
          {/* 저장 성공 메시지 */}
          {showSaveSuccess && (
            <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded-md text-center text-green-700 animate-pulse">
              투표 정보가 성공적으로 저장되었습니다!
            </div>
          )}

          {/* 최종 결정된 일정 표시 (가장 많은 투표를 받은 날짜) */}
          {getMostVotedOptions().length > 0 && (
            <div id="vote-results" className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-green-800">
                  현재 가장 많은 투표를 받은 날짜
                  {getMostVotedOptions().length > 1 ? ' (복수)' : ''}
                </h3>
                
                {/* 투표 결과 공유 버튼 */}
                {selectedMember && getMostVotedOptions().length > 0 && (
                  <div className="flex gap-2">
                    {confirmedDateOption ? (
                      isHost() && (
                        <KakaoShareButton
                          templateType="result"
                          params={{
                            date: formatDate(confirmedDateOption.date),
                            time: confirmedDateOption.time,
                            location: selectedLocation?.name || '미정',
                            participantCount: getVotesForDateAndTime(confirmedDateOption.dateId, confirmedDateOption.timeId).length
                          }}
                          buttonText="확정된 일정 공유하기"
                          className="text-xs"
                        />
                      )
                    ) : (
                      <KakaoShareButton
                        templateType="result"
                        params={{
                          date: formatDate(getMostVotedOptions()[0].date),
                          time: getMostVotedOptions()[0].time,
                          location: selectedLocation?.name || '미정',
                          participantCount: getMostVotedOptions()[0].votes
                        }}
                        buttonText="투표 결과 공유하기"
                        className="text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
              
              {getMostVotedOptions().map((option, index) => {
                const dateId = dateOptions.find(d => d.date === option.date)?.id || '';
                const timeId = timeOptions.find(t => t.time === option.time)?.id || '';
                const isConfirmed = confirmedDateOption && 
                  confirmedDateOption.date === option.date && 
                  confirmedDateOption.time === option.time;
                
                return (
                  <div key={`${option.date}-${option.time}`} className={`${index > 0 ? "mt-4 pt-4 border-t border-green-200" : "mt-2"} ${isConfirmed ? "bg-yellow-50 p-2 rounded-md" : ""}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xl">
                          {formatDate(option.date)} {option.time}
                          {isConfirmed && <span className="ml-2 text-yellow-600 font-bold">(확정됨)</span>}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {option.votes}명 참여 가능
                        </div>
                      </div>
                      
                      {/* 호스트만 볼 수 있는 확정 버튼 */}
                      {isHost() && !isConfirmed && dateId && timeId && (
                        <button
                          onClick={() => confirmDateOption(dateId, timeId)}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm"
                        >
                          이 날짜로 확정
                        </button>
                      )}
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
                );
              })}

              {/* 확정된 일정이 있으면 별도 섹션으로 표시 */}
              {confirmedDateOption && !getMostVotedOptions().some(option => 
                option.date === confirmedDateOption.date && option.time === confirmedDateOption.time
              ) && (
                <div className="mt-4 pt-4 border-t border-green-200 bg-yellow-50 p-2 rounded-md">
                  <div className="text-xl">
                    <span className="text-yellow-600 font-bold">[확정된 일정]</span> {formatDate(confirmedDateOption.date)} {confirmedDateOption.time}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {getVotesForDateAndTime(confirmedDateOption.dateId, confirmedDateOption.timeId).length}명 참여 가능
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getVotesForDateAndTime(confirmedDateOption.dateId, confirmedDateOption.timeId).map(voter => (
                      <span 
                        key={`confirmed-${voter}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        {voter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      
      {/* 계비 관리 섹션 */}
      <section id="dues-section" className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-yellow-500">
        <h2 className="text-xl font-semibold mb-4 text-yellow-700 flex items-center">
          <span className="mr-2">💰</span>
          계비 관리
        </h2>
        
        {/* 연도 선택 */}
        <div className="mb-4">
          <label className="block mb-2">연도 선택</label>
          <select
            className="w-48 p-2 border rounded"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2023, 2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
        
        {/* 계비 요약 정보 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{selectedYear}년 계비 현황</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm">납부 대상 총액:</p>
              <p className="font-semibold">{formatCurrency(calculateYearlyDues(selectedYear).baseDues)}</p>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm">납부된 총액:</p>
              <p className="font-semibold">{formatCurrency(calculateYearlyDues(selectedYear).paidDues)}</p>
            </div>
            
            <div className="bg-red-50 p-3 rounded">
              <p className="text-sm">미납된 총액:</p>
              <p className="font-semibold">{formatCurrency(calculateYearlyDues(selectedYear).unpaidDues)}</p>
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">월별 납부 현황</h3>
            
            {/* 계비 납부 독촉 카카오톡 공유 버튼 (호스트만 볼 수 있음) */}
            {selectedMember === HOST_NAME && (
              <KakaoShareButton
                templateType="dues"
                params={{
                  memberName: getCurrentMonthUnpaidMembers().map(member => member).join(', '),
                  amount: 20000
                }}
                buttonText="납부 독촉하기"
                className="text-xs"
              />
            )}
          </div>
          
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
      {mapModalOpen && (
        <MapModal 
          isOpen={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          onSelect={(location) => {
            setSelectedLocation(location);
            setMapModalOpen(false);
          }}
          mapType={currentMapType}
        />
      )}

      <div className="w-full p-2">
        <button onClick={resetState} className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          모든 데이터 초기화
        </button>
      </div>
      <div className="w-full p-2">
        <button onClick={saveDebugInfo} className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          디버깅 정보 저장
        </button>
      </div>
      <div className="w-full p-2">
        <button onClick={checkDataStatus} className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          데이터 상태 확인
        </button>
      </div>
    </main>
  );
}
