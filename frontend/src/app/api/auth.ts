export interface LoginRequest {
    email: string;
    password: string;
}

export async function signupAPI(email: string, password: string, name: string) {
    const response = await fetch("api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,  // ← 백엔드 필드명과 일치 확인
            password,     // ← 백엔드 UserCreate 스키마의 password
            name    // ← 백엔드 필드명과 일치 확인
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "회원가입 실패");
    }

    return response.json();
}

export async function getMeAPI() {
    const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("사용자 정보를 가져올 수 없습니다.");
    return response.json();
}



export async function loginApi(email: string, password: string) {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",  // ✅ 쿠키로 토큰 저장
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error("로그인에 실패했습니다.");
    return response.json();
}

export async function logoutAPI() {
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",  // ✅ 쿠키 전송
    });
    if (!response.ok) throw new Error("로그아웃에 실패했습니다.");
    return response.json();
}