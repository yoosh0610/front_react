import React, { useEffect } from "react";
import {
  ReviewContainer,
  ReviewHeader,
  ReviewList,
  ReviewItem,
  RecommendBadge,
  ReviewContent,
  ReviewForm,
  FormRow,
  VoteButton,
  CommentInput,
  SubmitButton,
  DeleteButton,
} from "./ReviewSection.style";
import { DetailButton } from "../Cars/CarsSearchList.style";
import { axiosAuth, axiosPublic } from "../../api/reqService";

/**
 * axios 응답 / wrapper 응답 둘 다 대응
 */
const unwrap = (raw) => {
  const payload = raw?.data ?? raw;
  return payload?.data ?? payload;
};

const ReviewSection = ({
  stationId,
  refresh,
  comment,
  isRecomend,
  auth,
  setRefresh,
  setComment,
  setIsRecomend,
}) => {
  const currentUserNo = auth?.userNo;
  const safeRefresh = Array.isArray(refresh) ? refresh : [];

  /**
   * 리뷰 전체 조회
   * - stationId가 없으면 호출하지 않음
   * - setRefresh에 항상 배열만 들어가게 방어
   */
  const findAll = () => {
    if (!stationId) return;

    axiosPublic
      .getList(`/api/station/findAll?stationId=${stationId}`)
      .then((raw) => {
        const data = unwrap(raw);
        setRefresh(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(err));
  };

  /**
   * stationId 바뀔 때마다 자동 새로고침
   * -> 마커 클릭하면 stationId가 바뀌고 리뷰가 자동 갱신되어야 정상
   */
  useEffect(() => {
    if (stationId) findAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  /**
   * 리뷰 등록
   */
  const register = () => {
    if (!stationId) {
      alert("충전소를 먼저 선택해주세요.");
      return;
    }
    if (!auth) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }
    if (isRecomend !== "Y" && isRecomend !== "N") {
      alert("추천/비추천을 선택해주세요.");
      return;
    }

    const content = (comment || "").trim();
    if (!content) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }

    axiosAuth
      .createJson(
        "/api/station/insert",
        {
          stationId,
          commentContent: comment,
          recommend: isRecomend,
        })
      .then(() => {
        findAll();
        setIsRecomend("");
        setComment("");
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          error.response?.data?.["error-message"] ||
          "오류가 발생했습니다.";
        alert(msg);
        console.error(error);
      });
  };

  /**
   * 리뷰 삭제
   */
  const elision = (reviewId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    axiosAuth
      .deleteReview("/api/station", { data: { reviewId } })
      .then((res) => {
        alert(res?.data ?? "삭제되었습니다.");
        findAll();
      })
      .catch((error) => alert(error.response?.data?.message ?? "삭제 실패"));
  };

  return (
    <ReviewContainer>
      <ReviewHeader>
        <h3>이용자 리뷰 ({safeRefresh.length})</h3>
        <DetailButton
          type="button"
          onClick={findAll}
          style={{ margin: 0, padding: "5px 15px" }}
        >
          새로고침
        </DetailButton>
      </ReviewHeader>

      <ReviewList>
        {safeRefresh.length > 0 ? (
          safeRefresh.map((e) => (
            <ReviewItem key={e.reviewId}>
              <RecommendBadge
                type={e.recommend === "Y" || e.recommend === "추천" ? "Y" : "N"}
              >
                {e.recommend === "Y" || e.recommend === "추천" ? "추천" : "비추천"}
              </RecommendBadge>

              <ReviewContent>
                <p className="content">{e.commentContent}</p>
                <p className="date">
                  {e.createdAt}
                  {currentUserNo &&
                    String(e.userNo) === String(currentUserNo) && (
                      <DeleteButton
                        type="button"
                        onClick={() => elision(e.reviewId)}
                        style={{ marginLeft: "10px" }}
                      >
                        삭제
                      </DeleteButton>
                    )}
                </p>
              </ReviewContent>
            </ReviewItem>
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#adb5bd",
              padding: "40px 0",
              fontSize: "14px",
            }}
          >
            등록된 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
          </div>
        )}
      </ReviewList>

      {/* 리뷰 작성 폼 */}
      <ReviewForm>
        <FormRow>
          <VoteButton
            type="button"
            className={isRecomend === "Y" ? "active-up" : ""}
            onClick={() => setIsRecomend("Y")}
          >
            👍 추천해요
          </VoteButton>
          <VoteButton
            type="button"
            className={isRecomend === "N" ? "active-down" : ""}
            onClick={() => setIsRecomend("N")}
          >
            👎 아쉬워요
          </VoteButton>
        </FormRow>

        <FormRow>
          <CommentInput
            value={comment}
            placeholder={
              auth ? "리뷰 내용을 입력하세요 (최대 80자)" : "로그인 후 이용 가능합니다."
            }
            maxLength={80}
            disabled={!auth}
            onChange={(e) => setComment(e.target.value)}
          />
          <SubmitButton
            type="button"
            onClick={register}
            disabled={!auth || !comment.trim()}
          >
            등록
          </SubmitButton>
        </FormRow>
      </ReviewForm>
    </ReviewContainer>
  );
};

export default ReviewSection;
