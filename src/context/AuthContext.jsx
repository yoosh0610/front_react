import { useState, createContext, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    userNo: null,
    userName: null,
    userId: null,
    phone: null,
    email: null,
    birthDay: null,
    licenseUrl: null,
    accessToken: null,
    refreshToken: null,
    role: null,
    provider: null,
    isAuthenticated: false,
  });

  // ✅ "undefined" / "null" 문자열 방어
  const clean = (v) => {
    if (v === undefined || v === null) return null;
    if (v === "undefined" || v === "null" || v === "") return null;
    return v;
  };

  const getLS = (k) => clean(localStorage.getItem(k));

  const setLS = (k, v) => {
    const cv = clean(v);
    if (cv === null) localStorage.removeItem(k);
    else localStorage.setItem(k, cv);
  };

  // 앱 최초 실행 시 localStorage → 상태 복구
  useEffect(() => {
    const userNo = getLS("userNo");
    const userName = getLS("userName");
    const userId = getLS("userId");
    const role = getLS("role");
    const phone = getLS("phone");
    const email = getLS("email");
    const birthDay = getLS("birthDay");
    const licenseUrl = getLS("licenseUrl");
    const refreshToken = getLS("refreshToken");
    const provider = getLS("provider");
    const accessToken = getLS("accessToken");

    // ✅ 최소 기준: 토큰 + userId만 있어도 로그인 상태로 복구 (나머지는 서버에서 다시 가져와도 됨)
    if (accessToken && refreshToken && userId) {
      setAuth({
        userNo,
        userName,
        userId,
        role,
        phone,
        email,
        birthDay,
        licenseUrl,
        accessToken,
        provider: provider || null,
        refreshToken,
        isAuthenticated: true,
      });
    } else {
      // 혹시라도 찌꺼기 "undefined"가 남아있으면 정리
      [
        "userNo","userName","userId","role","phone","email","birthDay","licenseUrl",
        "refreshToken","accessToken","authToken","provider"
      ].forEach((k) => {
        const v = localStorage.getItem(k);
        if (v === "undefined" || v === "null") localStorage.removeItem(k);
      });
    }
  }, []);

  // 로그인 성공 시 실행되는 함수
  const login = (
    accessToken,
    refreshToken,
    userNo,
    userName,
    userId,
    role,
    phone,
    email,
    birthDay,
    licenseUrl,
    provider
  ) => {
    // ✅ 토큰 없으면 로그인 처리 자체를 막아버림
    if (!clean(accessToken) || !clean(refreshToken) || !clean(userId)) {
      console.log("login() 인자 확인:", {
        accessToken,
        refreshToken,
        userNo,
        userName,
        userId,
        role,
        phone,
        email,
        birthDay,
        licenseUrl,
        provider,
      });
      alert("로그인 정보가 올바르지 않습니다. (토큰/아이디 누락)");
      return;
    }

    setAuth({
      userNo,
      userName,
      userId,
      role,
      phone,
      email,
      birthDay,
      licenseUrl,
      accessToken,
      refreshToken,
      provider: provider || null,
      isAuthenticated: true,
    });

    setLS("userNo", userNo);
    setLS("userName", userName);
    setLS("userId", userId);
    setLS("role", role);
    setLS("phone", phone);
    setLS("email", email);
    setLS("birthDay", birthDay);
    setLS("licenseUrl", licenseUrl);
    setLS("refreshToken", refreshToken);
    setLS("accessToken", accessToken);

    // 과거 키 잔재 제거(있으면)
    localStorage.removeItem("authToken");

    if (provider) setLS("provider", provider);
  };

  // 로그아웃 함수
  const logout = () => {
    setAuth({
      userNo: null,
      userName: null,
      userId: null,
      phone: null,
      email: null,
      birthDay: null,
      licenseUrl: null,
      accessToken: null,
      refreshToken: null,
      provider: null,
      role: null,
      isAuthenticated: false,
    });

    [
      "provider",
      "userNo",
      "userName",
      "userId",
      "role",
      "phone",
      "email",
      "birthDay",
      "licenseUrl",
      "refreshToken",
      "accessToken",
      "authToken",
    ].forEach((k) => localStorage.removeItem(k));

    alert("로그아웃 되었습니다.");
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
