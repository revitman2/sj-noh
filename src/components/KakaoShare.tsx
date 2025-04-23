import { useEffect } from 'react';

// 카카오 SDK 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}

// 카카오 JavaScript 키 (실제 키로 교체 필요)
const KAKAO_KEY = '5c570f884f3a76405f4611fc64d4fc4f';

// 카카오 SDK 초기화 함수
const initKakao = () => {
  try {
    // 이미 초기화된 경우 중복 초기화 방지
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_KEY);
      console.log('Kakao SDK initialized');
    }
  } catch (error) {
    console.error('Failed to initialize Kakao SDK:', error);
  }
};

// 메시지 템플릿 생성 함수 (계비 독촉)
const createDuesReminderTemplate = (memberName: string, amount: number, dueDate: string) => {
  const baseUrl = window.location.origin;
  return {
    objectType: 'feed',
    content: {
      title: '🔔 계비 납부 안내',
      description: `${memberName}님, ${amount.toLocaleString()}원 납부를 부탁드립니다.\n납부 기한: 오늘`,
      imageUrl: 'https://i.ibb.co/FbHj0zjF/money.png',
      link: {
        mobileWebUrl: `${baseUrl}?section=dues`,
        webUrl: `${baseUrl}?section=dues`,
      },
    },
    buttons: [
      {
        title: '자세히 보기',
        link: {
          mobileWebUrl: `${baseUrl}?section=dues`,
          webUrl: `${baseUrl}?section=dues`,
        },
      },
    ],
  };
};

// 메시지 템플릿 생성 함수 (투표 독촉)
const createVoteReminderTemplate = (memberNames: string[]) => {
  const membersList = memberNames.join(', ');
  const baseUrl = window.location.origin;
  return {
    objectType: 'feed',
    content: {
      title: '투표해주세요!!',
      description: `${membersList}님, 투표에 참여해주세요!`,
      imageUrl: 'https://i.ibb.co/yFDKfSb4/vote.png',
      link: {
        mobileWebUrl: `${baseUrl}?section=vote`,
        webUrl: `${baseUrl}?section=vote`,
      },
    },
    buttons: [
      {
        title: '투표하러 가기',
        link: {
          mobileWebUrl: `${baseUrl}?section=vote`,
          webUrl: `${baseUrl}?section=vote`,
        },
      },
    ],
  };
};

// 메시지 템플릿 생성 함수 (투표 결과)
const createVoteResultTemplate = (date: string, time: string, location: string, participantCount: number) => {
  const baseUrl = window.location.origin;
  return {
    objectType: 'feed',
    content: {
      title: '모임 일정이 확정되었습니다',
      description: `일시: ${date} ${time}\n장소: ${location}`,
      imageUrl: 'https://i.ibb.co/5xKbwKKH/food.png',
      link: {
        mobileWebUrl: `${baseUrl}?section=schedule`,
        webUrl: `${baseUrl}?section=schedule`,
      },
    },
    buttons: [
      {
        title: '모임 정보 보기',
        link: {
          mobileWebUrl: `${baseUrl}?section=schedule`,
          webUrl: `${baseUrl}?section=schedule`,
        },
      },
    ],
  };
};

// 메시지 템플릿 생성 함수 (생일 알림)
const createBirthdayTemplate = (memberName: string, birthDate: string) => {
  // ImgBB에 업로드된, 이미지 직접 링크로 변경
  const imageUrl = 'https://i.ibb.co/dwCNBs2S/14per.png';
  const baseUrl = window.location.origin;
  
  return {
    objectType: 'feed',
    content: {
      title: '🎉 [삶의질 동기모임] 생일 축하 알림🎉',
      description: `오늘은 우리 ${memberName}의 생일입니다! 🥳
다 같이 축하해요! 👏👏👏`,
      imageUrl: imageUrl,
      link: {
        mobileWebUrl: `${baseUrl}?section=birthday`,
        webUrl: `${baseUrl}?section=birthday`,
      },
    },
    buttons: [
      {
        title: '🎉🎉🎉🎉🎉',
        link: {
          mobileWebUrl: `${baseUrl}?section=birthday`,
          webUrl: `${baseUrl}?section=birthday`,
        },
      },
    ],
  };
};

// 카카오톡 공유 함수
export const shareToKakao = (templateType: 'dues' | 'vote' | 'result' | 'birthday', params: any) => {
  if (!window.Kakao) {
    console.error('Kakao SDK not loaded');
    return;
  }

  let template;
  switch (templateType) {
    case 'dues':
      template = createDuesReminderTemplate(params.memberName, params.amount, params.dueDate);
      break;
    case 'vote':
      template = createVoteReminderTemplate(params.memberNames);
      break;
    case 'result':
      template = createVoteResultTemplate(params.date, params.time, params.location, params.participantCount);
      break;
    case 'birthday':
      template = createBirthdayTemplate(params.memberName, params.birthDate);
      break;
    default:
      console.error('Invalid template type');
      return;
  }

  window.Kakao.Share.sendDefault(template);
};

// 카카오 공유 버튼 컴포넌트
interface KakaoShareButtonProps {
  templateType: 'dues' | 'vote' | 'result' | 'birthday';
  params: any;
  buttonText: string;
  className?: string;
}

const KakaoShareButton = ({ templateType, params, buttonText, className = '' }: KakaoShareButtonProps) => {
  useEffect(() => {
    // 스크립트가 이미 로드되어 있는지 확인
    const existingScript = document.querySelector('script[src*="kakao_js_sdk"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.4.0/kakao.min.js';
      script.integrity = 'sha384-mXVrIX2T/Kszp6Z0aEWaA8Nm7J6/ZeWXbL8UpGRjKwWe56Srd/iyNmWMBhcItAjH';
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      script.onload = () => {
        console.log('Kakao SDK script loaded');
        initKakao();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Kakao SDK:', error);
      };
      
      document.head.appendChild(script);
    } else {
      // 스크립트가 이미 있다면 초기화만 진행
      initKakao();
    }
    
    return () => {
      // cleanup은 스크립트가 새로 추가된 경우에만 수행
      const addedScript = document.querySelector('script[src*="kakao_js_sdk"]:not([data-loaded])');
      if (addedScript) {
        document.head.removeChild(addedScript);
      }
    };
  }, []);

  const handleShare = () => {
    try {
      if (!window.Kakao) {
        console.error('Kakao SDK not loaded');
        alert('카카오톡 공유 기능을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      
      if (!window.Kakao.isInitialized()) {
        console.error('Kakao SDK not initialized');
        initKakao();
      }
      
      shareToKakao(templateType, params);
    } catch (error) {
      console.error('Failed to share:', error);
      alert('카카오톡 공유 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <button 
      onClick={handleShare} 
      className={`flex items-center px-4 py-2 bg-yellow-300 text-yellow-800 rounded-md hover:bg-yellow-400 transition-colors ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C5.373 3 0 7.373 0 12.795C0 16.37 2.355 19.465 5.88 21.172C6.302 21.337 6.114 21.066 6.086 20.816L5.976 19.266C5.95 19.135 5.872 19.019 5.759 18.947C3.695 17.767 2.35 15.357 2.35 12.795C2.35 8.734 6.248 5.446 12 5.446C17.752 5.446 21.65 8.734 21.65 12.795C21.65 15.357 20.305 17.767 18.241 18.947C18.128 19.019 18.05 19.135 18.024 19.266L17.914 20.816C17.886 21.066 17.698 21.337 18.12 21.172C21.645 19.465 24 16.37 24 12.795C24 7.373 18.627 3 12 3Z"/>
        <path d="M5.82 14.116H7.203V16.442C7.203 16.706 7.439 16.868 7.668 16.751L10.616 15.138C10.639 15.126 10.665 15.12 10.692 15.12H14.197C14.224 15.12 14.25 15.126 14.273 15.138L17.22 16.751C17.45 16.868 17.686 16.706 17.686 16.442V14.116H19.069C19.354 14.116 19.586 13.885 19.586 13.599V7.552C19.586 7.266 19.354 7.035 19.069 7.035H5.82C5.535 7.035 5.303 7.266 5.303 7.552V13.599C5.303 13.885 5.535 14.116 5.82 14.116Z"/>
      </svg>
      {buttonText}
    </button>
  );
};

export default KakaoShareButton; 