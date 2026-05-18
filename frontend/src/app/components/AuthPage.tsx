import { useState, useEffect } from "react";
import { User, Mail, Lock } from "lucide-react";
import "../../styles/auth.css";

interface AuthPageProps {
  onLogin: (email: string, password: string) => void;
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

  const toggle = () => {
    setIsSignIn(!isSignIn);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(signInEmail, signInPassword);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpPassword !== signUpConfirmPassword) {
      alert("비밀번호가 일치하지 않습니다");
      return;
    }
    onSignup(signUpEmail, signUpPassword, signUpName);
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
              <button type="submit">Sign up</button>
              <p>
                <span>Already have an account? </span>
                <b onClick={toggle} className="auth-pointer">
                  Sign in here
                </b>
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
              <button type="submit">Sign in</button>
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
    </div>
  );
}