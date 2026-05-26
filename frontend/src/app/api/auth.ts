export interface LoginRequest {
    email: string;
    password: string;
}

export async function signupAPI(email: string, password: string, name: string) {
    const response = await fetch("/api/auth/register", {
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
        const detail = error.detail;
        if (Array.isArray(detail)) {
            const emailError = detail.find((d: any) =>
                d.loc?.includes("email") || d.type?.includes("email")
            );
            throw new Error(emailError ? "이메일 형식이 올바르지 않습니다." : "회원가입 실패");
        }
        throw new Error(typeof detail === "string" ? detail : "회원가입 실패");
    }

    return response.json();
}

export async function getMeAPI() {
    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) return null;
        const data = await response.json();
        if (!data.authenticated) return null;
        return data;
    } catch {
        return null;
    }
}



export async function loginAPI(data: LoginRequest): Promise<void> {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // 쿠키 수신을 위해 필수
    });

    const result = await response.json();

    if (!response.ok) {
        const detail = result.detail;
        if (Array.isArray(detail)) {
            const emailError = detail.find((d: any) =>
                d.loc?.includes("email") || d.type?.includes("email")
            );
            throw new Error(emailError ? "이메일 형식이 올바르지 않습니다." : "로그인에 실패했습니다.");
        }
        throw new Error(typeof detail === "string" ? detail : "로그인에 실패했습니다.");
    }

}

export async function logoutAPI(): Promise<void> {
    await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 전송을 위해 필수
    });
}