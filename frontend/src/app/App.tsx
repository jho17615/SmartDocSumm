import { useState, useEffect } from "react";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { getMeAPI } from "./api/auth";
import "../styles/transitions.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMeAPI()
      .then((userData) => {
        setCurrentUser({ email: userData.email, name: userData.name });
        setIsAuthenticated(true);
      })
      .catch(() => {
        // 쿠키 없거나 만료 — 로그인 페이지 유지
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = async () => {
    try {
      const userData = await getMeAPI();
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

  const handleSignup = (email: string, password: string, name: string) => {
    toast.success("회원가입이 완료되었습니다!", {
      style: {
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        color: "#ffffff",
        border: "1px solid #d4af37"
      }
    });
    setTimeout(() => {
      setCurrentUser({ email, name });
      setIsAuthenticated(true);
    }, 400);
  };

  const handleLogout = () => {
    toast.info("로그아웃 되었습니다");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) return null;

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