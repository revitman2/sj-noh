import React, { useEffect, useState } from 'react';
import { getTodaysBirthdayMembers, getUpcomingBirthdayMembers } from '@/constants/birthdays';
import KakaoShareButton from './KakaoShare';

interface BirthdayReminderProps {
  hostOnly?: boolean;
  currentMember?: string;
  hostName?: string;
}

const BirthdayReminder: React.FC<BirthdayReminderProps> = ({ 
  hostOnly = false, 
  currentMember = '', 
  hostName = '' 
}) => {
  const [todayBirthdays, setTodayBirthdays] = useState<string[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{name: string, date: string}>>([]);
  const [showBirthdays, setShowBirthdays] = useState<boolean>(false);
  
  useEffect(() => {
    // 오늘 생일인 멤버 확인
    setTodayBirthdays(getTodaysBirthdayMembers());
    
    // 다가오는 생일 멤버 확인 (30일 이내)
    setUpcomingBirthdays(getUpcomingBirthdayMembers(30));
  }, []);
  
  // 렌더링 조건 확인
  const shouldRender = hostOnly ? currentMember === hostName : true;
  
  // 표시할 내용이 없는 경우 렌더링하지 않음
  if (!shouldRender || (todayBirthdays.length === 0 && upcomingBirthdays.length === 0)) {
    return null;
  }
  
  return (
    <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-pink-800 flex items-center">
          <span className="mr-2">🎂</span>
          생일 알림
        </h3>
        <button
          onClick={() => setShowBirthdays(!showBirthdays)}
          className="text-sm text-pink-600 hover:text-pink-800"
        >
          {showBirthdays ? '접기' : '펼치기'}
        </button>
      </div>
      
      {showBirthdays && (
        <div className="mt-2 space-y-3">
          {/* 오늘 생일인 멤버 */}
          {todayBirthdays.length > 0 && (
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-pink-700">오늘의 생일</h4>
                {todayBirthdays.map(member => (
                  <KakaoShareButton
                    key={member}
                    templateType="birthday"
                    params={{
                      memberName: member,
                      birthDate: new Date().toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric'
                      })
                    }}
                    buttonText="축하 메시지 보내기"
                    className="text-xs"
                  />
                ))}
              </div>
              <div className="mt-2 flex">
                {todayBirthdays.map(member => (
                  <div 
                    key={member}
                    className="flex items-center bg-pink-100 text-pink-800 px-3 py-1 rounded-full"
                  >
                    <span className="text-lg mr-1">🎂</span>
                    <span>{member}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 다가오는 생일 멤버 */}
          {upcomingBirthdays.length > 0 && (
            <div className="bg-white p-3 rounded-md shadow-sm">
              <h4 className="font-medium text-pink-700 mb-2">다가오는 생일</h4>
              <div className="space-y-1">
                {upcomingBirthdays.map(member => (
                  <div 
                    key={member.name}
                    className="flex justify-between items-center py-1 px-2 hover:bg-pink-50 rounded"
                  >
                    <span>{member.name}</span>
                    <span className="text-sm text-gray-500">{member.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BirthdayReminder; 