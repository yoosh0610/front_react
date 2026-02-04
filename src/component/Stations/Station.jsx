import { LeftSection, MainContainer, RightSection } from "./Station.style";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import SearchSection from "./SearchSection";
import MapSection from "./MapSection";
import ReviewSection from "./ReviewSection";
import { axiosPublic } from "../../api/reqService";

/**
 * unwrap: axios 응답 / 우리가 만든 wrapper(success,data,message) 둘 다 대응
 * - axiosPublic.getActual 이 axios 응답을 그대로 주는지, data만 주는지 섞여있을 수 있어서 통일
 */
const unwrap = (raw) => {
  const payload = raw?.data ?? raw; // axios 응답이면 raw.data
  return payload?.data ?? payload;  // wrapper면 payload.data
};

/**
 * 에러 메시지 뽑기(백엔드 응답 키가 message / error-message 등 섞일 때)
 */
const getErrMsg = (err) =>
  err?.response?.data?.message ||
  err?.response?.data?.["error-message"] ||
  err?.message ||
  "오류가 발생했습니다.";

/**
 * 카카오 SDK 로딩 대기(autoload=false일 때 특히 필요)
 */
const waitForKakao = (timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.kakao?.maps) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("KAKAO_TIMEOUT"));
      requestAnimationFrame(tick);
    };
    tick();
  });

const Station = () => {
  // ===========================
  // State 정의
  // ===========================
  const { auth } = useContext(AuthContext);

  const [positions, setPositions] = useState([]);   // 지도 마커용 데이터
  const [location, setLocation] = useState(null);   // { latitude, longitude }

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isRecomend, setIsRecomend] = useState("");
  const [searchStation, setSearchStation] = useState("");
  const [searchResult, setSearchResult] = useState([]);

  const [stationId, setStationId] = useState(null); // 선택된 충전소 ID (리뷰 조회에 핵심)
  const [stationName, setStationName] = useState(""); // 선택된 충전소 이름

  const [comment, setComment] = useState("");
  const [refresh, setRefresh] = useState([]);

  const mapRef = useRef(null);

  // ===========================
  // 주변 충전소 리스트 불러오기(현재위치 기준)
  // ===========================
  const fetchStations = useCallback(async (lat, lng) => {
    /**
     * /api/station?lat=..&lng=.. 의 응답이
     * - axios 응답일 수도 있고
     * - {success, data, message} wrapper 일 수도 있어서 unwrap 사용
     */
    const raw = await axiosPublic.getActual(`/api/station?lat=${lat}&lng=${lng}`);
    const data = unwrap(raw);

    const list = Array.isArray(data) ? data : [];

    /**
     * 여기서 제일 중요
     * stationId 필드명이 백엔드에서 다를 수 있음.
     * 예: stationId / id / station_id / STATION_ID / stationNo ...
     * -> stationId가 undefined면 마커 클릭해도 리뷰/상세가 안 뜨는 현상 발생
     */
    const mapping = list
      .map((e) => {
        const parsedLat = parseFloat(e.lat ?? e.latitude);
        const parsedLng = parseFloat(e.lng ?? e.longitude);

        return {
          title: e.stationName ?? e.title ?? e.name ?? "충전소",
          subtitle: e.address ?? "",
          lat: parsedLat,
          lng: parsedLng,

          // stationId 필드명 보강
          stationId:
            e.stationId ??
            e.id ??
            e.station_id ??
            e.STATION_ID ??
            e.stationNo ??
            e.station_no,
        };
      })
      // lat/lng 값이 진짜 숫자인 것만 남김 (NaN이면 마커 못 찍음)
      .filter((x) => !Number.isNaN(x.lat) && !Number.isNaN(x.lng));

    setPositions(mapping);
    console.log("positions[0]:", mapping[0]);
  }, []);

  // ===========================
  // 충전소 상세정보 alert (검색 클릭/마커 클릭 둘 다에서 재사용)
  // ===========================
  const showStationDetailAlert = useCallback(async (id) => {
    if (!id) return;

    try {
      const raw = await axiosPublic.getActual(`/api/station/searchDetail/${id}`);
      const data = unwrap(raw);
      const stationDetail = Array.isArray(data) ? data[0] : data;

      if (!stationDetail) {
        alert("상세정보가 없습니다.");
        return;
      }

      const {
        address,
        detailAddress,
        regDate,
        stationName: sname,
        tel,
        useTime,
      } = stationDetail;

      alert(
        `[${sname ?? "충전소"}]\n` +
        `주소: ${(address ?? "")} ${(detailAddress ?? "")}\n` +
        `연락처: ${tel ?? "-"}\n` +
        `이용시간: ${useTime ?? "-"}\n` +
        `등록일: ${regDate ?? "-"}`
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ===========================
  // 검색 관련 함수
  // ===========================
  const handleSearch = useCallback(() => {
    const keyword = (searchStation || "").trim();
    if (!keyword) {
      alert("검색어를 입력하세요!");
      return;
    }

    axiosPublic
      .getActual(`/api/station/search?keyword=${encodeURIComponent(keyword)}`)
      .then((raw) => {
        const data = unwrap(raw);
        setSearchResult(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        alert(getErrMsg(err));
      });
  }, [searchStation]);

  /**
   * 검색 결과 클릭:
   * 1) 지도 이동
   * 2) (선택) 그 좌표를 location으로 바꿔서 주변 충전소도 다시 로드
   *    -> "현재 위치가 엉뚱하게 찍힘" 이슈가 있을 때 개발 체감 개선
   * 3) 상세 alert
   */
  const handleResultClick = useCallback(
    async (stationIdParam) => {
      const list = Array.isArray(searchResult) ? searchResult : [];
      const station = list.find((s) => String(s.stationId) === String(stationIdParam));
      if (!station) return;

      const lat = parseFloat(station.lat);
      const lng = parseFloat(station.lng);

      // 지도 이동(카카오맵이 있고 mapRef가 만들어진 상태일 때)
      if (mapRef.current && !Number.isNaN(lat) && !Number.isNaN(lng) && window.kakao?.maps) {
        const move = new window.kakao.maps.LatLng(lat, lng);
        if (typeof mapRef.current.panTo === "function") mapRef.current.panTo(move);
        else mapRef.current.setCenter(move);
      }

      // 개발 편의: 검색한 위치로 location을 바꾸고, 그 기준으로 주변 충전소도 다시 로드
      // 필요 없으면 이 블록 통째로 지워도 됨.
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setLocation({ latitude: lat, longitude: lng });
        try {
          await fetchStations(lat, lng);
        } catch (e) {
          console.error(e);
        }
      }

      // 상세 alert
      showStationDetailAlert(stationIdParam);
    },
    [searchResult, fetchStations, showStationDetailAlert]
  );

  // ===========================
  // 최초 로드(카카오 SDK + 위치 + 주변 충전소 로드)
  // ===========================
  useEffect(() => {
    (async () => {
      try {
        await waitForKakao(); // autoload=false일 때 준비될 때까지 기다림
      } catch {
        setError("카카오 맵 API를 로드할 수 없습니다.");
        setLoading(false);
        return;
      }

      if (!navigator.geolocation) {
        setError("Geolocation을 지원하지 않는 브라우저입니다.");
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // 현재 위치 state
          setLocation({ latitude: lat, longitude: lng });

          try {
            // 현재 위치 기준 주변 충전소 로드
            await fetchStations(lat, lng);
          } catch (e) {
            setError(getErrMsg(e));
          } finally {
            setLoading(false);
          }
        },
        () => {
          setError("위치 정보를 가져올 수 없습니다.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    })();
  }, [fetchStations]);

  // ===========================
  // 로딩/에러 UI
  // ===========================
  if (loading) {
    return (
      <MainContainer style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: "1.2rem", color: "#666" }}>
          🧭 주변 충전소를 찾는 중입니다...
        </div>
      </MainContainer>
    );
  }

  if (error) {
    return (
      <MainContainer style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "#e74c3c" }}>
          <h3>오류 발생</h3>
          <p>{error}</p>
        </div>
      </MainContainer>
    );
  }

  // ===========================
  // 렌더
  // ===========================
  return (
    <MainContainer>
      {/* 왼쪽 : 검색 영역 */}
      <LeftSection>
        <SearchSection
          searchStation={searchStation}
          searchResult={searchResult}
          setSearchStation={setSearchStation}
          handleSearch={handleSearch}
          handleResultClick={handleResultClick}
        />
      </LeftSection>

      {/* 오른쪽 : 지도 + 리뷰 */}
      <RightSection>
        <MapSection
          location={location}
          positions={positions}
          stationName={stationName}
          mapRef={mapRef}
          /**
           * 마커 클릭했을 때 선택된 충전소를 세팅
           * - stationId가 undefined면 ReviewSection이 항상 빈값 -> 여기서 바로 확인 가능
           */
          setStationId={(id) => {
            setStationId(id);
            // 마커 클릭해도 상세 정보를 보고 싶으면 아래 줄 유지
            // showStationDetailAlert(id);
          }}
          setStationName={setStationName}
        />

        <ReviewSection
          stationId={stationId}
          refresh={refresh}
          comment={comment}
          isRecomend={isRecomend}
          auth={auth}
          setRefresh={setRefresh}
          setComment={setComment}
          setIsRecomend={setIsRecomend}
        />
      </RightSection>
    </MainContainer>
  );
};

export default Station;
