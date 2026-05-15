import { useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { getMeAPI, logoutApi } from "./api/auth";  // ✅ logoutAPI 추가
import "../styles/transitions.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  const handleLogin = async () => {
    try {
      const userData = await getMeAPI();  // ✅ 쿠키로 자동 인증
      setCurrentUser({ email: userData.email, name: userData.name });
      setIsAuthenticated(true);
      toast.success(`${userData.name}님, 환영합니다!`, {
        style: {
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#ffffff",
          border: "1px solid #d4af37"
        }
      });
    } catch (error) {
      toast.error("사용자 정보를 불러오는데 실패했습니다.");
      console.error(error);
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    toast.success("회원가입이 완료되었습니다!", {
      style: {
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        color: "#ffffff",
        border: "1px solid #d4af37"
      }
    });
    // ✅ 회원가입 후 상태만 저장 (로그인은 사용자가 직접)
    setCurrentUser({ email, name });
  };

  const handleLogout = async () => {
    try {
      await logoutAPI();  // ✅ 서버에서 쿠키 제거
    } catch (error) {
      console.error(error);
    } finally {
      toast.info("로그아웃 되었습니다");
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
      ) : (
        currentUser && (
          <div className="page-transition-enter">
            <Dashboard userName={currentUser.name} onLogout={handleLogout} />
          </div>
        )
      )}
      <Toaster />
    </>
  );
}