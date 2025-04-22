import { MEMBERS } from './members';

// 멤버별 생일 정보 (MM-DD 형식)
export const MEMBER_BIRTHDAYS: { [key: string]: string } = {
  '삼임': '12-08',
  '나영': '07-03',
  '도은': '11-25',
  '유미': '02-09',
  '택부': '12-19',
  '성지': '04-01',
  '민석': '08-07',
  '은지': '05-18',
  '성철': '07-29',
  '소희': '12-26',
  '재원': '11-24',
  '수현': '08-21',
  '은혜': '10-26',
};

// 오늘 생일인 멤버 찾기
export const getTodaysBirthdayMembers = (): string[] => {
  const today = new Date();
  const todayFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  return MEMBERS.filter(member => MEMBER_BIRTHDAYS[member] === todayFormatted);
};

// 다가오는 생일 멤버 찾기 (30일 이내)
export const getUpcomingBirthdayMembers = (daysAhead: number = 30): Array<{name: string, date: string}> => {
  const today = new Date();
  const upcomingMembers: Array<{name: string, date: string}> = [];
  
  MEMBERS.forEach(member => {
    const birthday = MEMBER_BIRTHDAYS[member];
    if (!birthday) return;
    
    const [month, day] = birthday.split('-').map(Number);
    const birthdayDate = new Date(today.getFullYear(), month - 1, day);
    
    // 이미 지난 경우 내년으로 설정
    if (birthdayDate < today) {
      birthdayDate.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birthdayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= daysAhead) {
      upcomingMembers.push({
        name: member,
        date: `${month}월 ${day}일 (${diffDays}일 후)`
      });
    }
  });
  
  // 날짜순 정렬 (수정: 문자열 파싱 오류 수정)
  return upcomingMembers.sort((a, b) => {
    const aMonthStr = a.date.split('월')[0].trim();
    const aDayStr = a.date.split('월')[1].split('일')[0].trim();
    const bMonthStr = b.date.split('월')[0].trim();
    const bDayStr = b.date.split('월')[1].split('일')[0].trim();
    
    const aMonth = parseInt(aMonthStr);
    const aDay = parseInt(aDayStr);
    const bMonth = parseInt(bMonthStr);
    const bDay = parseInt(bDayStr);
    
    const aDate = new Date(today.getFullYear(), aMonth - 1, aDay);
    const bDate = new Date(today.getFullYear(), bMonth - 1, bDay);
    
    return aDate.getTime() - bDate.getTime();
  });
}; 