import {
  MapContainer,
  MapContent,
  StationInfoBar,
  MapOverlayText,
} from "./MapSection.style";
import { useEffect, useRef } from "react";

const MapSection = ({
  location,
  positions,
  stationName,
  mapRef,
  setStationId,
  setStationName,
}) => {
  // 생성한 마커들/원/내위치마커를 ref로 들고 있어야 "다시 그릴 때" 제거 가능
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const myMarkerRef = useRef(null);

  useEffect(() => {
    // location이 없으면 그릴 수 없음
    if (!location) return;

    // autoload=false면 load가 있어야 함
    if (!window.kakao?.maps?.load) return;

    const { latitude: lat, longitude: lng } = location;

    window.kakao.maps.load(() => {
      const container = document.getElementById("map");
      if (!container) return;

      const myLatLng = new window.kakao.maps.LatLng(lat, lng);

      // 지도 생성/재사용
      let map = mapRef.current;
      if (!map) {
        map = new window.kakao.maps.Map(container, {
          center: myLatLng,
          level: 5,
        });
        mapRef.current = map;

        // 컨트롤은 최초 1회만
        const mapTypeControl = new window.kakao.maps.MapTypeControl();
        map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      }

      /**
       * "현재 위치 중심"이 적용 안되던 주 원인:
       * 이전 코드에서 map.setBounds(bounds)를 해버려서 중심/줌이 마커들 기준으로 강제 이동됨.
       * -> 그래서 여기선 bounds를 쓰지 않고 "항상 내 위치로 center 고정"
       */
      map.setCenter(myLatLng);
      map.setLevel(5);

      // 내 위치 마커 갱신
      if (myMarkerRef.current) myMarkerRef.current.setMap(null);
      myMarkerRef.current = new window.kakao.maps.Marker({
        position: myLatLng,
      });
      myMarkerRef.current.setMap(map);

      // 기존 충전소 마커 제거
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // 반경 원 갱신
      if (circleRef.current) circleRef.current.setMap(null);
      circleRef.current = new window.kakao.maps.Circle({
        center: myLatLng,
        radius: 5000,
        strokeWeight: 2,
        strokeColor: "#4dabf7",
        strokeOpacity: 0.6,
        strokeStyle: "dashed",
        fillColor: "#e7f5ff",
        fillOpacity: 0.2,
      });
      circleRef.current.setMap(map);

      // 마커 이미지 (이미지 없어도 마커는 찍히지만, 스타일 위해 유지)
      const imageSrc =
        "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
      const markerImage = new window.kakao.maps.MarkerImage(
        imageSrc,
        new window.kakao.maps.Size(24, 35)
      );

      // positions 방어
      const list = Array.isArray(positions) ? positions : [];

      /**
       * 마커 찍기
       * - item.latlng 같은 객체를 믿지 말고 숫자 lat/lng로 찍는 게 제일 안전
       */
      list.forEach((item) => {
        const pLat = parseFloat(item.lat);
        const pLng = parseFloat(item.lng);
        if (Number.isNaN(pLat) || Number.isNaN(pLng)) return;

        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(pLat, pLng),
          title: item.title,
          image: markerImage,
        });
        marker.setMap(map);

        // 마커 클릭 시 충전소 선택
        window.kakao.maps.event.addListener(marker, "click", () => {
          // console.log("MARKER CLICK:", item.stationId, item.title);
          setStationId(item.stationId);
          setStationName(item.title);
        });

        markersRef.current.push(marker);
      });

      /**
       * (선택) 디버깅: 마커가 안 뜰 때 원인 확인용
       * - positions가 0개인지
       * - stationId가 undefined인지
       */
      // console.log("positions len:", list.length);
      // console.log("first:", list[0]);
    });
  }, [location, positions, mapRef, setStationId, setStationName]);

  return (
    <MapContainer>
      <MapOverlayText>📍 현재 위치 중심 검색 결과</MapOverlayText>

      {/* 지도 영역 */}
      <MapContent id="map" />

      {/* 선택된 충전소 정보 표시 영역 */}
      <StationInfoBar>
        {stationName ? (
          <>
            선택된 충전소: <strong>{stationName}</strong>
          </>
        ) : (
          <span style={{ color: "#adb5bd" }}>
            지도에서 충전소 마커를 클릭해주세요.
          </span>
        )}
      </StationInfoBar>
    </MapContainer>
  );
};

export default MapSection;
