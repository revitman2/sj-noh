import { useEffect, useState } from 'react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { name: string; kakaoLink: string; naverLink: string }) => void;
  mapType: 'kakao' | 'naver';
}

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

// API 키 설정
// 실제 사용 시 아래 값들을 발급받은 키로 변경해야 합니다
const KAKAO_MAP_API_KEY = '5c570f884f3a76405f4611fc64d4fc4f'; // JavaScript 키로 업데이트
const NAVER_MAP_CLIENT_ID = 'n0ba0eo19p'; // 네이버 클라우드 플랫폼에서 발급받은 키

export default function MapModal({ isOpen, onClose, onSelect, mapType }: MapModalProps) {
  const [map, setMap] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{name: string, address: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // 검색 결과 목록을 저장할 상태 추가
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    name: string;
    address: string;
    position: {lat: number, lng: number};
  }>>([]);

  // 페이지네이션을 위한 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resultsPerPage = 15; // 카카오 API가 페이지당 최대 15개 결과 반환

  // 지역 필터링
  const [regionFilter, setRegionFilter] = useState('전국');
  const regions = ['전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

  // 현재 위치 정보
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // 지도 API 없이도 위치 선택 가능하도록 수동 위치 입력 상태 추가
  const [manualLocationName, setManualLocationName] = useState('');
  const [manualLocationAddress, setManualLocationAddress] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setMapError(null);

    if (mapType === 'kakao') {
      // 카카오맵 초기화
      try {
        // 이미 로드된 스크립트가 있는지 확인
        let hasKakaoMapsScript = document.getElementById('kakao-maps-script');
        
        if (!hasKakaoMapsScript) {
          console.log("카카오맵 스크립트 로드 시작");
      const script = document.createElement('script');
          script.id = 'kakao-maps-script';
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services&autoload=false`;

      script.onload = () => {
            console.log("카카오맵 스크립트 로드 완료");
            try {
              window.kakao.maps.load(() => {
                console.log("카카오맵 초기화 시작");
                initializeKakaoMap();
              });
            } catch (error) {
              console.error("카카오맵 로드 오류:", error);
              setMapError("카카오맵을 초기화할 수 없습니다. 직접 위치를 입력해주세요.");
              setIsLoading(false);
            }
          };

          script.onerror = (e) => {
            console.error("카카오맵 스크립트 로딩 실패:", e);
            setIsLoading(false);
            setMapError("카카오맵을 로드할 수 없습니다. 직접 위치를 입력해주세요.");
          };
          
          document.head.appendChild(script);
        } else {
          // 이미 스크립트가 로드된 경우 바로 초기화
          console.log("카카오맵 스크립트 이미 로드됨, 직접 초기화");
          if (window.kakao && window.kakao.maps) {
            initializeKakaoMap();
          } else {
            console.log("카카오맵 객체가 없음, 다시 로드 시도");
        window.kakao.maps.load(() => {
              initializeKakaoMap();
            });
          }
        }
      } catch (error) {
        console.error("카카오맵 설정 오류:", error);
        setMapError("카카오맵을 설정할 수 없습니다. 직접 위치를 입력해주세요.");
        setIsLoading(false);
      }
    } else {
      // 네이버맵은 직접 입력 모드로 대체
      console.log("네이버맵 대신 직접 입력 모드 사용");
      setIsLoading(false);
      setMapError("네이버맵 대신 직접 입력 기능을 사용합니다.");
    }

    return () => {
      setMap(null);
      setSelectedPlace(null);
      setSearchKeyword('');
      setMapError(null);
    };
  }, [isOpen, mapType]);

  // 카카오맵 초기화 함수
  const initializeKakaoMap = () => {
    try {
      console.log("카카오맵 초기화 시작");
          const container = document.getElementById('map');
      if (!container) {
        console.error("지도 컨테이너를 찾을 수 없음");
        setIsLoading(false);
        setMapError("지도 컨테이너를 찾을 수 없습니다.");
        return;
      }
      
      if (typeof window.kakao === 'undefined' || !window.kakao.maps) {
        console.error("카카오맵 API가 로드되지 않음");
        setMapError("카카오맵 API가 로드되지 않았습니다. 직접 위치를 입력해주세요.");
        setIsLoading(false);
        return;
      }
      
          const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780),
            level: 3,
          };
      console.log("카카오맵 객체 생성 시도");
          const newMap = new window.kakao.maps.Map(container, options);
      console.log("카카오맵 객체 생성 성공");
      
      // 기본 마커 추가
      const marker = new window.kakao.maps.Marker({
        position: options.center
      });
      marker.setMap(newMap);
      
          setMap(newMap);
      setIsLoading(false);
      console.log("카카오맵 초기화 완료");
    } catch (error) {
      console.error("카카오맵 초기화 오류:", error);
      setIsLoading(false);
      setMapError("카카오맵을 초기화할 수 없습니다. 직접 위치를 입력해주세요.");
    }
  };

  // 네이버맵 초기화 함수 수정
  const initializeNaverMap = () => {
    const container = document.getElementById('map');
    if (!container) {
      setMapError("지도 컨테이너를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }
    
    if (typeof window.naver === 'undefined' || !window.naver.maps) {
      setMapError("네이버맵 API가 로드되지 않았습니다. 직접 위치를 입력해주세요.");
      setIsLoading(false);
      return;
    }
    
    try {
      const position = new window.naver.maps.LatLng(37.5665, 126.9780);
      const mapOptions = {
        center: position,
        zoom: 13
      };
      const newMap = new window.naver.maps.Map('map', mapOptions);
      
      // 기본 마커 추가
      new window.naver.maps.Marker({
        position: position,
        map: newMap
      });
      
      setMap(newMap);
      setIsLoading(false);
    } catch (error) {
      console.error("네이버맵 초기화 오류:", error);
      setMapError("네이버맵을 초기화할 수 없습니다. 직접 위치를 입력해주세요.");
      setIsLoading(false);
    }
  };

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 기능이 지원되지 않습니다.');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // 위치를 기반으로 지도 중심 이동
        if (map && window.kakao && window.kakao.maps) {
          const moveLatLon = new window.kakao.maps.LatLng(latitude, longitude);
          map.setCenter(moveLatLon);
          
          // 현재 위치 마커 표시
          const marker = new window.kakao.maps.Marker({
            position: moveLatLon,
            map: map
          });
          
          // 마커에 현재 위치 표시 정보창 추가
          const infowindow = new window.kakao.maps.InfoWindow({
            content: '<div style="padding:5px;font-size:12px;">현재 위치</div>'
          });
          infowindow.open(map, marker);
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('위치 정보를 가져오는데 실패했습니다:', error);
        alert('위치 정보를 가져오는데 실패했습니다. 수동으로 검색해주세요.');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSearch = () => {
    if (!searchKeyword) return;
    
    setIsLoading(true);
    // 검색 시작할 때 이전 결과 초기화
    setSearchResults([]);
    setSelectedPlace(null);
    setCurrentPage(1);

    if (mapType === 'kakao' && map && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      try {
        console.log("카카오맵 검색 시작:", searchKeyword);
        const places = new window.kakao.maps.services.Places();
        
        // 검색 옵션 설정
        const searchOptions: any = {
          page: currentPage
        };
        
        // 지역 필터 적용 (전국 외에는 지역명 키워드 포함)
        const searchQuery = regionFilter !== '전국' 
          ? `${regionFilter} ${searchKeyword}` 
          : searchKeyword;
        
        // 현재 위치 기반 검색 (좌표 기반 검색)
        if (currentLocation) {
          searchOptions.location = new window.kakao.maps.LatLng(
            currentLocation.lat, 
            currentLocation.lng
          );
          searchOptions.radius = 20000; // 20km 반경 내 검색
          console.log("위치 기반 검색 사용:", currentLocation);
        }
        
        places.keywordSearch(searchQuery, (result: any, status: any, pagination: any) => {
          console.log("카카오맵 검색 결과:", status, result);
          console.log("페이지네이션 정보:", pagination);
          
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            // 검색 결과를 모두 저장
            const searchData = result.map((place: any) => ({
              id: place.id,
              name: place.place_name,
              address: place.address_name,
              position: {lat: parseFloat(place.y), lng: parseFloat(place.x)}
            }));
            
            // 검색 결과 저장
            setSearchResults(searchData);
            
            // 페이지네이션 정보 업데이트
            if (pagination) {
              setTotalPages(pagination.last);
            }
            
            // 첫 번째 결과를 지도에 표시 (기본 선택)
            const firstPlace = result[0];
            const moveLatLon = new window.kakao.maps.LatLng(firstPlace.y, firstPlace.x);
            map.setCenter(moveLatLon);
            
            // 모든 결과에 마커 표시
            // 기존 마커 제거 (맵 초기화)
            map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
            
            // 각 검색 결과에 마커 추가
            result.forEach((place: any) => {
              const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
              const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                map: map
              });
              
              // 마커 클릭 시 해당 장소 선택
              window.kakao.maps.event.addListener(marker, 'click', function() {
                // 해당 장소 센터로 이동
                map.setCenter(markerPosition);
                
                // 선택한 장소 정보 설정
                setSelectedPlace({
                  name: place.place_name,
                  address: place.address_name
                });
              });
            });
            
            console.log("검색 결과 " + result.length + "개 표시됨");
          } else {
            console.log("검색 결과 없음");
            setMapError("검색 결과가 없습니다. 다른 키워드로 검색해보세요.");
            // 검색 결과가 없더라도 직접 입력할 수 있게 추가
            setManualLocationName(searchKeyword);
          }
          setIsLoading(false);
        }, searchOptions);
      } catch (error) {
        console.error("검색 오류:", error);
        setIsLoading(false);
        setMapError("검색 중 오류가 발생했습니다. 직접 위치를 입력해주세요.");
        setManualLocationName(searchKeyword);
      }
    } else {
      // 카카오맵이 로드되지 않았거나 네이버맵인 경우 직접 입력
      console.log("지도 API를 사용할 수 없어 직접 입력 모드로 전환");
      setManualLocationName(searchKeyword);
      setManualLocationAddress('');
      setMapError("지도 API를 사용할 수 없습니다. 직접 위치를 입력해주세요.");
      setIsLoading(false);
    }
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 다시 검색
    if (mapType === 'kakao' && map && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setIsLoading(true);
      
      const places = new window.kakao.maps.services.Places();
      
      // 검색 옵션 설정
      const searchOptions: any = {
        page: page
      };
      
      // 지역 필터 적용
      const searchQuery = regionFilter !== '전국' 
        ? `${regionFilter} ${searchKeyword}` 
        : searchKeyword;
      
      // 현재 위치 기반 검색
      if (currentLocation) {
        searchOptions.location = new window.kakao.maps.LatLng(
          currentLocation.lat, 
          currentLocation.lng
        );
        searchOptions.radius = 20000; // 20km 반경 내 검색
      }
      
      places.keywordSearch(searchQuery, (result: any, status: any, pagination: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          // 검색 결과를 모두 저장
          const searchData = result.map((place: any) => ({
            id: place.id,
            name: place.place_name,
            address: place.address_name,
            position: {lat: parseFloat(place.y), lng: parseFloat(place.x)}
          }));
          
          // 검색 결과 저장
          setSearchResults(searchData);
          
          // 첫 번째 결과를 지도에 표시
          const firstPlace = result[0];
          const moveLatLon = new window.kakao.maps.LatLng(firstPlace.y, firstPlace.x);
          map.setCenter(moveLatLon);
          
          // 모든 결과에 마커 표시
          // 기존 마커 제거
          map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
          
          // 각 검색 결과에 마커 추가
          result.forEach((place: any) => {
            const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
            const marker = new window.kakao.maps.Marker({
              position: markerPosition,
              map: map
            });
            
            // 마커 클릭 시 해당 장소 선택
            window.kakao.maps.event.addListener(marker, 'click', function() {
              map.setCenter(markerPosition);
              setSelectedPlace({
                name: place.place_name,
                address: place.address_name
              });
            });
          });
        }
        setIsLoading(false);
      }, searchOptions);
    }
  };

  // 검색 결과 목록에서 장소 선택 시 처리 함수
  const handleSelectSearchResult = (place: {id: string, name: string, address: string, position: {lat: number, lng: number}}) => {
    if (map && window.kakao && window.kakao.maps) {
      // 선택한 위치로 지도 이동
      const position = new window.kakao.maps.LatLng(place.position.lat, place.position.lng);
      map.setCenter(position);
      
      // 선택한 장소 정보 설정
      setSelectedPlace({
        name: place.name,
        address: place.address
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleManualSelect = () => {
    if (!manualLocationName) return;
    
    // 만약 주소가 입력되지 않았지만 장소 이름이 있다면 '주소 정보 없음'으로 표시
    const address = manualLocationAddress || '주소 정보 없음';
    
    // 직접 입력으로 선택된 장소 설정
    setSelectedPlace({
      name: manualLocationName,
      address: address
    });
    
    // 바로 선택하지 않고 사용자가 미리보기를 볼 수 있게 함
    setMapError(null);
  };

  // 직접 입력 확정 및 닫기
  const confirmManualLocation = () => {
    if (!manualLocationName) return;
    
    onSelect({
      name: manualLocationName,
      kakaoLink: `https://map.kakao.com/link/search/${encodeURIComponent(manualLocationName)}`,
      naverLink: `https://map.naver.com/p/search/${encodeURIComponent(manualLocationName)}`
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">
            {mapType === 'kakao' ? '카카오맵' : '네이버맵'}에서 장소 선택
            {mapError && ' (직접 입력 모드)'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="장소 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? '검색 중...' : '검색'}
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <label htmlFor="region-filter" className="text-sm mr-2">지역:</label>
                <select 
                  id="region-filter"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1"
                >
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
              >
                {isLoadingLocation ? 
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    위치 확인 중
                  </span> :
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    내 위치 기준 검색
                  </span>
                }
              </button>
            </div>
          </div>
        </div>
        
        {mapError ? (
          <div className="p-4 border-b bg-yellow-50">
            <div className="text-yellow-800 mb-4">{mapError}</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  장소 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualLocationName}
                  onChange={(e) => setManualLocationName(e.target.value)}
                  placeholder="장소 이름을 입력하세요 (예: 강남역 CGV)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소 (선택사항)
                </label>
                <input
                  type="text"
                  value={manualLocationAddress}
                  onChange={(e) => setManualLocationAddress(e.target.value)}
                  placeholder="주소를 입력하세요 (예: 서울시 강남구 강남대로 123)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleManualSelect}
                  disabled={!manualLocationName}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  미리보기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-[400px]">
            {/* 검색 결과 목록 */}
            {searchResults.length > 0 && (
              <div className="w-full md:w-1/3 border-r overflow-y-auto flex flex-col">
                <div className="p-2 bg-gray-100 text-sm font-medium">
                  검색 결과 ({searchResults.length}개)
                </div>
                <ul className="divide-y divide-gray-200 flex-1 overflow-y-auto">
                  {searchResults.map((place) => (
                    <li 
                      key={place.id}
                      className={`p-2 hover:bg-gray-100 cursor-pointer ${
                        selectedPlace?.name === place.name ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectSearchResult(place)}
                    >
                      <p className="font-medium">{place.name}</p>
                      <p className="text-xs text-gray-600 truncate">{place.address}</p>
                    </li>
                  ))}
                </ul>
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center p-2 border-t">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border rounded text-sm mr-1 disabled:opacity-50"
                    >
                      이전
                    </button>
                    
                    <span className="text-sm mx-1">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border rounded text-sm ml-1 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* 지도 영역 */}
            <div className={`relative flex-1 ${searchResults.length > 0 ? 'md:w-2/3' : 'w-full'}`}>
              <div id="map" className="w-full h-full"></div>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {selectedPlace && (
          <div className="p-4 border-t">
            <div className="mb-3">
              <p className="font-semibold">{selectedPlace.name}</p>
              <p className="text-sm text-gray-600">{selectedPlace.address}</p>
            </div>
            
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
          >
            취소
          </button>
          <button
            onClick={() => {
                  if (mapError) {
                    confirmManualLocation();
                  } else {
              onSelect({
                      name: selectedPlace.name,
                      kakaoLink: `https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.name)}`,
                      naverLink: `https://map.naver.com/p/search/${encodeURIComponent(selectedPlace.name)}`
              });
              onClose();
                  }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            선택
          </button>
        </div>
          </div>
        )}
      </div>
    </div>
  );
} 