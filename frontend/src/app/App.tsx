import { useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import "../styles/transitions.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  const handleLogin = (email: string, password: string) => {
    toast.success("로그인 성공!", {
      style: {
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        color: "#ffffff",
        border: "1px solid #d4af37"
      }
    });
    setTimeout(() => {
      setCurrentUser({ email, name: email.split("@")[0] });
      setIsAuthenticated(true);
    }, 400);
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