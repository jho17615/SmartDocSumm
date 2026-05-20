import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PDFDocument {
  id: string;
  fileName: string;
  category: string;
  date: string;
  summary: string;
  pageCount: number;
}

// PDFAnalyzerProps 인터페이스 수정
interface PDFAnalyzerProps {
  onBack: () => void;
  onAnalyzed: (doc: PDFDocument) => void;  // ✅ 이대로 유지
  // onAnalyzed가 문서를 받아서 상세 페이지로 바로 이동하게 할 것임
}

interface LogEntry {
  time: string;
  level: "info" | "success" | "error";
  message: string;
}

const FASTAPI_URL = "http://127.0.0.1:8000";

export function PDFAnalyzer({ onBack, onAnalyzed }: PDFAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addLog = (level: LogEntry["level"], message: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setLogs((prev) => [...prev, { time, level, message }]);
    console.log(`[${time}] [${level.toUpperCase()}] ${message}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🟡 handleFileChange 호출됨");
    console.log("🟡 e.target.files:", e.target.files);
    const selected = e.target.files?.[0];
    if (selected) {
      console.log("🟢 파일 선택됨:", selected.name, selected.type, selected.size);
      setFile(selected);
      setLogs([]);
      addLog("info", `파일 선택됨: ${selected.name} (${(selected.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log("🔴 selected 파일 없음");
    }
  };

  // ✅ 수정: 강제 click() 제거 (htmlFor가 자동으로 처리)
  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    console.log("🟡 label 클릭됨");
    if (loading) {
      console.log("🔴 loading 중이라 무시");
      e.preventDefault();
      return;
    }
    // 아무것도 하지 않음 - label의 htmlFor가 자동으로 input을 연결함
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    console.log("🟡 드롭 이벤트:", e.dataTransfer.files);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setLogs([]);
      addLog("info", `파일 드롭됨: ${dropped.name} (${(dropped.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log("🔴 드롭 파일 타입:", dropped?.type);
      toast.error("PDF 파일만 업로드 가능합니다.");
      addLog("error", "PDF가 아닌 파일이 드롭됨");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setLogs([]);

    try {
      addLog("info", `업로드 시작: ${file.name}`);
      addLog("info", `파일 크기: ${(file.size / 1024).toFixed(1)} KB`);
      addLog("info", `요청 URL: POST ${FASTAPI_URL}/analyze-pdf`);

      const formData = new FormData();
      formData.append("file", file);

      addLog("info", "FormData 생성 완료, fetch 요청 전송 중...");

      const startTime = performance.now();

      const response = await fetch(`${FASTAPI_URL}/analyze-pdf`, {
        method: "POST",
        body: formData,
      });

      const elapsed = (performance.now() - startTime).toFixed(0);
      addLog("info", `서버 응답 수신: HTTP ${response.status} (${elapsed}ms)`);

      if (!response.ok) {
        const errText = await response.text();
        addLog("error", `서버 오류 응답: ${errText}`);
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      addLog("success", "JSON 파싱 성공");
      addLog("success", `파일명: ${data.filename}`);
      addLog("success", `페이지 수: ${data.pages}`);
      addLog("success", `추출 텍스트 길이: ${data.text?.length ?? 0}자`);
      addLog("info", `텍스트 미리보기: "${data.text?.slice(0, 80)}..."`);

      toast.success("FastAPI 업로드 성공!");

      const newDoc: PDFDocument = {
        id: Date.now().toString(),
        fileName: data.filename,
        category: "일반문서",
        date: new Date().toISOString().split("T")[0],
        summary: data.text?.slice(0, 100) + "..." || "텍스트 없음",
        pageCount: data.pages,
      };

      setTimeout(() => onAnalyzed(newDoc), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `업로드 실패: ${msg}`);
      console.error("🔴 업로드 에러 상세:", err);

      if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
        addLog("error", "FastAPI 서버에 연결할 수 없습니다.");
        addLog("error", `서버가 ${FASTAPI_URL} 에서 실행 중인지 확인하세요.`);
        addLog("error", "실행 명령: uvicorn main:app --reload");
        toast.error("서버 연결 실패 — 로그를 확인하세요");
      } else {
        toast.error(`업로드 실패: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={loading}
            className="text-amber-200 hover:text-white hover:bg-amber-500/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <div className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-amber-400" />
            <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
              새 PDF 분석
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* 숨겨진 input */}
        <input
          ref={fileInputRef}
          id="pdf-file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* 드래그 드롭 영역 - onClick 핸들러는 유지하되 내부 로직은 비움 */}
        <label
          htmlFor="pdf-file-input"
          onClick={handleLabelClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center transition-all select-none ${
            loading
              ? "border-blue-900/20 bg-white/50 cursor-not-allowed pointer-events-none"
              : isDragging
              ? "border-amber-500 bg-amber-50 scale-[1.01] cursor-copy"
              : file
              ? "border-blue-500 bg-blue-50/50 cursor-pointer"
              : "border-blue-900/30 hover:border-amber-500 hover:bg-amber-50/60 cursor-pointer"
          }`}
        >
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            {loading ? (
              <Loader2 className="w-12 h-12 text-blue-700 animate-spin" />
            ) : file ? (
              <FileText className="w-12 h-12 text-blue-600" />
            ) : (
              <Upload className="w-12 h-12 text-blue-900/30" />
            )}

            {loading ? (
              <p className="text-blue-900 font-semibold">업로드 중...</p>
            ) : file ? (
              <>
                <p className="text-blue-900 font-semibold">{file.name}</p>
                <p className="text-slate-500 text-sm">
                  {(file.size / 1024).toFixed(1)} KB · 클릭하면 다른 파일 선택
                </p>
              </>
            ) : (
              <>
                <p className="text-blue-900 font-semibold">PDF 파일을 선택하세요</p>
                <p className="text-slate-500 text-sm">클릭하거나 파일을 여기에 드래그</p>
              </>
            )}
          </div>
        </label>

        {/* 업로드 버튼 */}
        {file && !loading && (
          <Button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white h-11"
          >
            <Upload className="w-4 h-4 mr-2" />
            FastAPI로 업로드 시작
          </Button>
        )}

        {/* 로그 패널 */}
        {logs.length > 0 && (
          <Card className="shadow-lg border-blue-900/10 bg-gray-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-xs tracking-widest font-mono">
                ▶ UPLOAD LOG
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs font-mono">
                {FASTAPI_URL}/analyze-pdf
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono">
                  <span className="text-gray-600 shrink-0 w-20">{log.time}</span>
                  {log.level === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  ) : log.level === "error" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <span className="text-blue-400 shrink-0">›</span>
                  )}
                  <span
                    className={
                      log.level === "success"
                        ? "text-green-400"
                        : log.level === "error"
                        ? "text-red-400"
                        : "text-gray-300"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>응답 대기 중...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}