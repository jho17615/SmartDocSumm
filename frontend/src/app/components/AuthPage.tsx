import { useState, useEffect } from "react";
import { User, Mail, Lock } from "lucide-react";
import "../../styles/auth.css";
import { signupAPI, loginApi } from "../api/auth";

interface AuthPageProps {
  onLogin: () => Promise<void>;
  onSignup: (email: string, password: string, name: string) => void;
}

export function AuthPage({ onLogin, onSignup }: AuthPageProps) {
  const [isSignIn, setIsSignIn] = useState(true); // ✅ 처음에 Sign In 모드 (true)
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);  // 로딩 상태
  const [error, setError] = useState("");          // 에러 메시지

  useEffect(() => {
    setTimeout(() => setIsSignIn(true), 200);
  }, []);

  const toggle = () => setIsSignIn(!isSignIn);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginApi({ email: signInEmail, password: signInPassword });
      await onLogin();
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (signUpPassword !== signUpConfirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      // signupAPI(email, password, name) 순서 맞는지 확인
      await signupAPI(signUpEmail, signUpPassword, signUpName);
      alert("회원가입 성공! 로그인해주세요.");
      setIsSignIn(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container ${isSignIn ? "sign-in" : "sign-up"}`}>



      {/* FORM SECTION */}
      <div className="auth-row">
        {/* SIGN UP */}
        <div className="auth-col auth-align-items-center auth-flex-col sign-up">
          <div className="auth-form-wrapper auth-align-items-center">
            <form className="auth-form sign-up" onSubmit={handleSignUp}>
              <div className="auth-input-group">
                <User />
                <input
                  type="text"
                  placeholder="Username"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <Mail />
                <input
                  type="email"
                  placeholder="Email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <Lock />
                <input
                  type="password"
                  placeholder="Password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <Lock />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "처리중..." : "Sign up"}
              </button>
              <p>
                <span>Already have an account? </span>
                <b onClick={toggle} className="auth-pointer">Sign in here</b>
              </p>
            </form>
          </div>
        </div>
        {/* END SIGN UP */}
        {/* SIGN IN */}
        <div className="auth-col auth-align-items-center auth-flex-col sign-in">
          <div className="auth-form-wrapper auth-align-items-center">
            <form className="auth-form sign-in" onSubmit={handleSignIn}>
              <div className="auth-input-group">
                <User />
                <input
                  type="text"
                  placeholder="Username or Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <Lock />
                <input
                  type="password"
                  placeholder="Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                />
              </div>
              {/* 에러 메시지 */}
              {error && (
                <div style={{ color: "red", textAlign: "center", padding: "8px" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}>
                {loading ? "처리중..." : "Sign in"}
              </button>
              <p>
                <b className="auth-pointer">Forgot password?</b>
              </p>
              <p>
                <span>Don't have an account? </span>
                <b onClick={toggle} className="auth-pointer">
                  Sign up here
                </b>
              </p>
            </form>
          </div>
        </div>
        {/* END SIGN IN */}
      </div>
      {/* END FORM SECTION */}

      {/* CONTENT SECTION - isSignIn일 때만 Welcome 표시 */}
      <div className="auth-row auth-content-row">
        <div className="auth-col auth-align-items-center auth-flex-col">
          {isSignIn && (
            <div className="auth-text">
              <h2>Welcome</h2>
              <p>Please sign in to continue</p>
            </div>
          )}
        </div>
      </div>
      {/* END CONTENT SECTION */}
    </div >
  );
}