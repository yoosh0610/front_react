import { useContext, useState } from "react";
import {
  Button,
  Container,
  Form,
  Input,
  KakaoButton,
  LogoBox,
  LogoImage,
  NaverButton,
  SignUpText,
} from "../styles/Styles";
import logo from "../../../assets/HeaderLogo.png";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { axiosPublic } from "../../../api/reqService";

const Login = () => {
  const CLIENT_API = window.ENV?.CLIENT_URL || "http://yoosh.store";
  const NAVER_REDIRECT_URI = `${CLIENT_API}/members/naver/callback`;
  const navi = useNavigate();
  const NAVER_CLIENT_ID = window.ENV?.NAVER_CLIENT_ID;

  const [memberId, setUserId] = useState("");
  const [memberPwd, setUserPwd] = useState("");
  const [msg, setMsg] = useState("");

  const { login } = useContext(AuthContext);

  const kakaoLogin = () => {
    location.href = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=9ab6eed4ca0b2e40761693da623540b9&redirect_uri=${CLIENT_API}/members/kakao/callback`;
  };

  const naverLogin = () => {
    location.href =
      "https://nid.naver.com/oauth2.0/authorize" +
      "?response_type=code" +
      `&client_id=${NAVER_CLIENT_ID}` +
      "&redirect_uri=" +
      encodeURIComponent(NAVER_REDIRECT_URI) +
      "&state=state_1763619065972_14825";
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const regexpPwd = /^[a-zA-Z0-9]*$/;

    if (!regexpPwd.test(memberId) || !regexpPwd.test(memberPwd)) {
      setMsg("아이디나 비밀번호를 확인해주세요");
      return;
    }
    setMsg("");

    axiosPublic
      .post("/api/members/login", { memberId, memberPwd })
      .then((data) => {
        // ✅ axiosPublic.post는 { ...res.data } 형태로 반환함
        // 서버 응답이 { message, data: {...} } 구조면 실제 payload는 data.data에 있음
        const payload = data?.data ?? data;

        const {
          userNo,
          userName,
          userId,
          role,
          phone,
          email,
          birthDay,
          licenseUrl,
          refreshToken,
          accessToken,
        } = payload;

        // ✅ undefined 저장 방지: 토큰 없으면 바로 중단하고 원본 찍기
        if (!accessToken || accessToken === "undefined" || accessToken === "null") {
          console.log("로그인 응답 원본(data):", data);
          console.log("payload:", payload);
          throw new Error("로그인 응답에서 accessToken을 찾지 못했습니다. (data.data 구조 확인)");
        }

        login(
          accessToken,
          refreshToken,
          userNo,
          userName,
          userId,
          role,
          phone,
          email,
          birthDay,
          licenseUrl
        );

        alert(data?.message ?? "로그인 성공");
        navi("/");
      })
      .catch((error) => {
        alert(
          error?.response?.data?.message ??
            error?.message ??
            "오류가 발생했습니다."
        );
      });
  };

  return (
    <Container>
      <LogoBox>
        <a onClick={() => navi("/")}>
          <LogoImage src={logo} alt="logo" />
        </a>
        <SignUpText>Sign Up</SignUpText>
      </LogoBox>

      <Form onSubmit={handleLogin}>
        <Input
          type="text"
          placeholder="ID"
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <label style={{ fontSize: "13px", color: "red", padding: "4px" }}>
          {msg}
        </label>
        <Input
          type="password"
          placeholder="Password"
          onChange={(e) => setUserPwd(e.target.value)}
          maxLength={"15"}
          minLength={"4"}
          required
        />

        <Button type="submit">Login</Button>
        <KakaoButton onClick={kakaoLogin} type="button"></KakaoButton>
        <NaverButton onClick={naverLogin} type="button"></NaverButton>
      </Form>
    </Container>
  );
};

export default Login;
