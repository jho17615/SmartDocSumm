import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  FileText,
  LogOut,
  Upload,
  Search,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Scale,
  Presentation,
  GraduationCap,
  FileCode,
  Newspaper,
  FolderOpen,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  File,
} from "lucide-react";
import { PDFDetailView } from "./PDFDetailView";
import { toast } from "sonner";
import "../../styles/transitions.css";
import { logoutApi } from "../api/auth";
import {
  getDocumentListAPI,
  getDocumentDetailAPI,
  documentdeleteAPI,
  documentListSortAPI,
  documentSearchAPI,
  documentCategoryAPI,
  getCategoryCountsAPI,
  DocumentListResponse,
} from "../api/document";

interface DashboardProps {
  userName: string;
  onLogout: () => void;
}

interface PDFDocument {
  id: string;
  fileName: string;
  category: string;
  date: string;
  summary: string;
  pageCount: number;
  fileType?: string;
}

const categoryIcons: Record<string, any> = {
  "법안": Scale,
  "발표자료": Presentation,
  "교육자료": GraduationCap,
  "기술문서": FileCode,
  "뉴스/기사": Newspaper,
  "일반문서": FileText,
  "기타": FolderOpen,
};

const categoryColors: Record<string, string> = {
  "법안": "bg-red-100 text-red-800 border-red-300",
  "발표자료": "bg-blue-100 text-blue-800 border-blue-300",
  "교육자료": "bg-green-100 text-green-800 border-green-300",
  "기술문서": "bg-purple-100 text-purple-800 border-purple-300",
  "뉴스/기사": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "일반문서": "bg-gray-100 text-gray-800 border-gray-300",
  "기타": "bg-orange-100 text-orange-800 border-orange-300",
};

const SUPPORTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".hwp", ".ppt", ".pptx"];
const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.hancom.hwp",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const ITEMS_PER_PAGE = 5;
const categories = ["전체", "법안", "발표자료", "교육자료", "기술문서", "뉴스/기사", "일반문서", "기타"];

export function Dashboard({ userName, onLogout }: DashboardProps) {
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing" | "complete" | "error">("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "name-asc" | "name-desc">("latest");
  const [activeTab, setActiveTab] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null); // ✅ 백엔드 취소용 task_id
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [overallTotal, setOverallTotal] = useState(0); // "전체" 카드용 고정 수량

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── 카테고리별 전체 수량 fetch ────────────────────────
  const fetchCategoryCounts = async () => {
    try {
      const counts = await getCategoryCountsAPI();
      setCategoryCounts(counts);
    } catch {
      // 카운트 실패 시 무시 (목록 로딩에 영향 없음)
    }
  };

  const fetchDocuments = async (targetPage: number = 1) => {
    setIsLoadingDocs(true);
    setSelectedIds([]);
    try {
      const [data] = await Promise.all([
        getDocumentListAPI(targetPage, ITEMS_PER_PAGE),
        fetchCategoryCounts(),
      ]);
      const mapped: PDFDocument[] = data.items.map((doc) => ({
        id: String(doc.id),
        fileName: doc.title,
        category: doc.category ?? "기타",
        date: doc.created_at?.split("T")[0] ?? "",
        summary: "",
        pageCount: 0,
      }));
      setDocuments(mapped);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setOverallTotal(data.total);
    } catch {
      toast.error("문서 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // ── 카테고리 문서 fetch ────────────────────────────────
  const fetchCategoryDocuments = async (category: string, targetPage: number = 1) => {
    setIsLoadingDocs(true);
    setSelectedIds([]);
    try {
      const [data] = await Promise.all([
        documentCategoryAPI(category, targetPage, ITEMS_PER_PAGE),
        fetchCategoryCounts(),
        new Promise<void>((resolve) => setTimeout(resolve, 300)),
      ]);
      const mapped: PDFDocument[] = data.items.map((doc) => ({
        id: String(doc.id),
        fileName: doc.title,
        category: doc.category ?? "기타",
        date: doc.created_at?.split("T")[0] ?? "",
        summary: "",
        pageCount: 0,
      }));
      setDocuments(mapped);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch {
      toast.error("카테고리 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // ── 페이지·탭 변경 시 문서 fetch (검색 모드 제외) ──────
  useEffect(() => {
    if (searchQuery.trim() !== "") return;
    if (activeTab === "전체") {
      fetchDocuments(page);
    } else {
      fetchCategoryDocuments(activeTab, page);
    }
  }, [page, activeTab]);

  // ── 카테고리별 문서 수 (백엔드 전체 집계 기준) ──────────
  const getCategoryCount = (category: string) =>
    category === "전체"
      ? overallTotal
      : (categoryCounts[category] ?? 0);

  // ── 클라이언트 측 정렬 ────────────────────────────────
  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case "latest": return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest": return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "name-asc": return a.fileName.localeCompare(b.fileName);
      case "name-desc": return b.fileName.localeCompare(a.fileName);
      default: return 0;
    }
  });

  const displayedDocuments = sortedDocuments;

  // ── 탭 변경: state만 업데이트, useEffect가 fetch 담당 ──
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  const handleSortChange = async (value: "latest" | "oldest" | "name-asc" | "name-desc") => {
    setSortBy(value);
    setIsLoadingDocs(true);
    setSelectedIds([]);
    try {
      const data: DocumentListResponse = await documentListSortAPI(value);
      const mapped: PDFDocument[] = data.items.map((doc) => ({
        id: String(doc.id),
        fileName: doc.title,
        category: doc.category ?? "기타",
        date: doc.created_at?.split("T")[0] ?? "",
        summary: "",
        pageCount: 0,
      }));
      setDocuments(mapped);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch {
      toast.error("정렬에 실패했습니다.");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() === "") {
      setIsSearching(false);
      setPage(1);
      if (page === 1) fetchDocuments(1);
    } else {
      setIsSearching(true);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") return;

    const timer = setTimeout(async () => {
      setSelectedIds([]);
      try {
        const [data] = await Promise.all([
          documentSearchAPI(searchQuery.trim()),
          new Promise<void>((resolve) => setTimeout(resolve, 100)),
        ]);
        const items: DocumentListResponse["items"] = Array.isArray(data)
          ? data
          : (data.items ?? []);
        const mapped: PDFDocument[] = items.map((doc) => ({
          id: String(doc.id),
          fileName: doc.title,
          category: doc.category ?? "기타",
          date: doc.created_at?.split("T")[0] ?? "",
          summary: "",
          pageCount: 0,
        }));
        setDocuments(mapped);
        setTotalPages(1);
        setTotal(mapped.length);
      } catch {
        toast.error("검색에 실패했습니다.");
        setDocuments([]);
        setTotal(0);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isValidFile = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext) && !SUPPORTED_MIME_TYPES.includes(file.type)) {
      toast.error(`지원하지 않는 파일 형식입니다. 지원 형식: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      return false;
    }
    return true;
  };

  // ✅ 업로드 취소 함수 (프론트 + 백엔드 모두 취소)
  const cancelUpload = async () => {
    // 프론트 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 백엔드에도 취소 요청
    if (currentTaskId) {
      try {
        await fetch(`/api/upload/cancel/${currentTaskId}`, {
          method: "POST",
          credentials: "include",
        });
        console.log("✅ 백엔드 취소 요청 완료");
      } catch (error) {
        console.error("백엔드 취소 요청 실패:", error);
      }
    }

    resetUploadState();
    toast.info("업로드가 취소되었습니다.");
  };

  // ── 업로드 시작 (SSE 방식 + 취소 가능 + 백엔드 취소 연동) ─────────────────
  const startUpload = async () => {
    console.log("🚀 startUpload 실행됨!!!");
    if (!uploadedFile) return;

    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();
    setCurrentTaskId(null);

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");
    setUploadMessage("파일 업로드 중...");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await fetch("/api/upload/progress", {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      // ✅ 응답 헤더에서 task_id 추출
      const taskId = response.headers.get("X-Task-Id");
      if (taskId) {
        setCurrentTaskId(taskId);
        console.log("✅ Task ID:", taskId);
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              // ✅ 취소된 경우 처리
              if (data.stage === "cancelled") {
                setUploadStatus("error");
                setUploadMessage("❌ 분석이 취소되었습니다.");
                toast.error("분석이 취소되었습니다.");
                setTimeout(() => resetUploadState(), 2000);
                return;
              }

              setUploadProgress(data.progress);
              setUploadMessage(data.message);

              if (data.stage === "extract") setUploadStatus("analyzing");
              if (data.stage === "classify") setUploadStatus("analyzing");
              if (data.stage === "summarize") setUploadStatus("analyzing");
              if (data.stage === "save_db") setUploadStatus("analyzing");

              if (data.stage === "done") {
                setUploadStatus("complete");
                setUploadProgress(100);
                setUploadMessage("✅ 분석 완료! 문서 페이지로 이동합니다...");
                toast.success("파일 분석이 완료되었습니다!");

                const docData = await getDocumentDetailAPI(data.document_id);
                const newDoc: PDFDocument = {
                  id: String(docData.id),
                  fileName: docData.title,
                  category: docData.category ?? "일반문서",
                  date: docData.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
                  summary: docData.summary ?? "요약 없음",
                  pageCount: 0,
                  fileType: uploadedFile.name.split(".").pop()?.toLowerCase(),
                };

                setTimeout(() => {
                  setSelectedDocument(newDoc);
                  resetUploadState();
                  setPage(1);
                  fetchDocuments(1);
                }, 1000);
              }
            } catch (e) {
              console.error("진행률 데이터 파싱 오류:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("✅ 업로드 취소됨");
        setUploadStatus("error");
        setUploadMessage("❌ 업로드가 취소되었습니다.");
      } else {
        console.error("업로드 실패:", error);
        setUploadStatus("error");
        setUploadMessage("❌ 업로드 실패. 서버를 확인하세요.");
        toast.error("업로드 실패");
      }
      setTimeout(() => {
        if (uploadStatus !== "complete") {
          resetUploadState();
        }
      }, 2000);
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
      setCurrentTaskId(null);
    }
  };

  const resetUploadState = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus("idle");
    setUploadedFile(null);
    setUploadMessage("");
    setCurrentTaskId(null);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isValidFile(file)) return;
    setUploadedFile(file);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage("");
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !isValidFile(file)) return;
    setUploadedFile(file);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage("");
  };

  const handleDocumentClick = async (doc: PDFDocument) => {
    setLoadingDocId(doc.id);
    try {
      const detail = await getDocumentDetailAPI(Number(doc.id));
      setSelectedDocument({ ...doc, summary: detail.summary ?? "" });
    } catch {
      toast.error("문서 정보를 불러오지 못했습니다.");
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await documentdeleteAPI(Number(id));
      toast.success("문서가 삭제되었습니다");
      setSelectedDocument(null);
      const nextPage = documents.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      if (nextPage === page) fetchDocuments(page);
    } catch {
      toast.error("문서 삭제에 실패했습니다.");
    }
  };


  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) { toast.error("삭제할 문서를 선택해주세요"); return; }
    if (!confirm(`선택한 ${selectedIds.length}개의 문서를 삭제하시겠습니까?`)) return;

    const results = await Promise.allSettled(selectedIds.map((id) => documentdeleteAPI(Number(id))));
    const succeeded = selectedIds.filter((_, i) => results[i].status === "fulfilled");
    const failCount = results.length - succeeded.length;

    setSelectedIds([]);
    if (succeeded.length > 0) toast.success(`${succeeded.length}개의 문서가 삭제되었습니다`);
    if (failCount > 0) toast.error(`${failCount}개의 문서 삭제에 실패했습니다.`);

    const nextPage = succeeded.length >= documents.length && page > 1 ? page - 1 : page;
    setPage(nextPage);
    if (nextPage === page) fetchDocuments(page);
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch { }
    onLogout();
  };

  if (selectedDocument) {
    return (
      <PDFDetailView
        document={selectedDocument}
        onBack={() => setSelectedDocument(null)}
        onDelete={handleDeleteDocument}
      
      />
    );
  }

  const renderDocCard = (doc: PDFDocument) => {
    const Icon = categoryIcons[doc.category] || FileText;
    const colorClass = categoryColors[doc.category] || categoryColors["기타"];
    return (
      <Card key={doc.id} className="hover:shadow-xl transition-all cursor-pointer hover:border-amber-500/50 bg-white/80 backdrop-blur border-blue-900/10">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Checkbox
              checked={selectedIds.includes(doc.id)}
              onCheckedChange={(checked) => {
                setSelectedIds((prev) => checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id));
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 flex justify-between items-start" onClick={() => handleDocumentClick(doc)}>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-2">
                  {loadingDocId === doc.id ? <Loader2 className="w-5 h-5 animate-spin text-amber-600" /> : <Icon className="w-5 h-5" />}
                  {doc.fileName}
                </CardTitle>
                <CardDescription className="mt-2">{doc.summary}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <Badge className={colorClass + " border"}>{doc.category}</Badge>
                <span className="text-xs text-muted-foreground">{doc.date}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  const UploadProgressCard = () => (
    <Card className="mb-6 border-amber-500 shadow-lg bg-gradient-to-br from-blue-50 to-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          {(uploadStatus === "uploading" || uploadStatus === "analyzing") && <Loader2 className="w-5 h-5 animate-spin text-amber-600" />}
          {uploadStatus === "complete" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {uploadStatus === "error" && <XCircle className="w-5 h-5 text-red-600" />}
          파일 업로드 진행 상황
        </CardTitle>
        <CardDescription>
          {uploadedFile?.name} ({((uploadedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadStatus === "uploading" && "📤 업로드 중..."}
              {uploadStatus === "analyzing" && "🤖 AI 분석 중..."}
              {uploadStatus === "complete" && "✅ 분석 완료!"}
              {uploadStatus === "error" && "❌ 업로드 실패"}
            </span>
            <span className="font-semibold text-amber-600">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
        {uploadMessage && <p className="text-sm text-slate-500">{uploadMessage}</p>}

        {(uploadStatus === "uploading" || uploadStatus === "analyzing") && (
          <Button
            variant="outline"
            size="sm"
            onClick={cancelUpload}
            className="w-full mt-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            분석 취소
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-6 h-6 text-amber-400" />
            <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">문서 AI 분석</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-amber-200">환영합니다, <span className="font-semibold text-white">{userName}</span>님</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-black/50 text-black hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-2" />로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx" onChange={handleFileSelect} style={{ display: "none" }} />

        {(uploadStatus !== "idle" || uploadedFile) && <UploadProgressCard />}

        {uploadStatus === "idle" && !uploading && !uploadedFile && (
          <div className="mb-6 slide-in-bottom">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl transition-all ${isDragging ? "border-amber-500 bg-amber-50 cursor-copy" : "border-blue-900/30 bg-gradient-to-br from-blue-900/5 to-amber-500/5 hover:from-blue-900/10 hover:to-amber-500/10 hover:shadow-xl cursor-pointer"} shadow-lg`}
            >
              <div className="flex flex-col items-center justify-center py-8 gap-3 pointer-events-none">
                <Upload className="w-10 h-10 text-blue-900/50" />
                <div className="text-center">
                  <p className="font-semibold text-blue-900">문서 파일 선택</p>
                  <p className="text-sm text-slate-500 mt-1">클릭하거나 파일을 드래그하세요</p>
                  <p className="text-xs text-slate-400 mt-2">지원 형식: PDF, DOC, DOCX, HWP, PPT, PPTX</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadedFile && uploadStatus === "idle" && !uploading && (
          <Card className="mb-6 border-amber-500 bg-gradient-to-br from-amber-50/30 to-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <FileText className="w-5 h-5 text-amber-600" />선택된 파일
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                <div>
                  <p className="font-semibold">{uploadedFile.name}</p>
                  <p className="text-sm text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); setUploadStatus("idle"); }} className="border-red-300 text-red-600 hover:bg-red-50">
                  취소
                </Button>
              </div>
              <Button onClick={startUpload} className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white h-11">
                <Upload className="w-4 h-4 mr-2" />분석 시작
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 slide-in-bottom stagger-1">
          <Card className="bg-white/90 backdrop-blur shadow-lg border-blue-900/10 p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-3">
                {categories.map((category) => {
                  const count = getCategoryCount(category);
                  const Icon = categoryIcons[category] || BookOpen;
                  const isActive = activeTab === category;
                  return (
                    <div key={category} onClick={() => handleTabChange(category)} className={`text-center p-3 rounded-lg transition-all cursor-pointer flex-1 min-w-[90px] ${isActive ? "bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-500 shadow-md" : "bg-gradient-to-br from-white to-slate-50 border border-blue-900/10 hover:shadow-md hover:border-amber-500/30"}`}>
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? "text-amber-700" : "text-blue-900"}`} />
                      <div className={`text-sm font-medium ${isActive ? "text-amber-800" : "text-blue-900"}`}>{category}</div>
                      <div className={`text-xs mt-1 font-semibold ${isActive ? "text-amber-600" : "text-amber-700"}`}>{count}개</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4 slide-in-bottom stagger-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-900/50" />
            <Input
              placeholder="파일명으로 검색..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 border-blue-900/20 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full md:w-[200px] border-blue-900/20">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="name-asc">이름 (가나다순)</SelectItem>
              <SelectItem value="name-desc">이름 (역순)</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />삭제 ({selectedIds.length})
            </Button>
          )}
        </div>

        <div className="slide-in-bottom stagger-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-blue-900 font-semibold">
              내 문서 ({total}개)
              {totalPages > 1 && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  — {page}페이지 / {totalPages}페이지
                </span>
              )}
            </h2>
            {displayedDocuments.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox checked={selectedIds.length === displayedDocuments.length && displayedDocuments.length > 0} onCheckedChange={(checked) => setSelectedIds(checked ? displayedDocuments.map((d) => d.id) : [])} />
                <span className="text-sm text-slate-600">전체 선택</span>
              </div>
            )}
          </div>

          {/* 탭 (카테고리 필터 역할, 페이징은 백엔드 담당) */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList
              className="grid w-full mb-6 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-900/20 rounded-xl p-[3px]"
              style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}
            >
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((category) => (
              <TabsContent key={category} value={category} />
            ))}
          </Tabs>

          {isLoadingDocs ? (
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center text-slate-600">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-blue-900/50" />
                <p>문서 목록을 불러오는 중...</p>
              </CardContent>
            </Card>
          ) : isSearching ? (
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center text-slate-600">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-blue-900/50" />
                <p>검색 중...</p>
              </CardContent>
            </Card>
          ) : displayedDocuments.length === 0 ? (
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center text-slate-600">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-900" />
                <p>{searchQuery ? "검색 결과가 없습니다" : `아직 ${activeTab === "전체" ? "" : activeTab + " "}문서가 없습니다`}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">{displayedDocuments.map(renderDocCard)}</div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoadingDocs}
                className="border-blue-900/20 hover:bg-blue-900/10 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="text-slate-400 text-sm px-1">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={page === item ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(item as number)}
                      disabled={isLoadingDocs}
                      className={
                        page === item
                          ? "bg-blue-900 text-white border-blue-900 w-9"
                          : "border-blue-900/20 hover:bg-blue-900/10 w-9"
                      }
                    >
                      {item}
                    </Button>
                  )
                )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoadingDocs}
                className="border-blue-900/20 hover:bg-blue-900/10 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}