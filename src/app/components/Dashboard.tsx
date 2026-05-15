import { useState, useRef } from "react";
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
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";
import { PDFDetailView } from "./PDFDetailView";
import { toast } from "sonner";
import "../../styles/transitions.css";

const FASTAPI_URL = "http://127.0.0.1:8000";

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
  fileType?: string; // 파일 타입 추가
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

// 지원하는 파일 확장자
const SUPPORTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".hwp", ".ppt", ".pptx"];
const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.hancom.hwp",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

// 파일 확장자에 따른 아이콘
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return FileText;
    case 'doc':
    case 'docx': return FileText;
    case 'hwp': return FileText;
    case 'ppt':
    case 'pptx': return Presentation;
    default: return File;
  }
};

export function Dashboard({ userName, onLogout }: DashboardProps) {
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  
  // 업로드 관련 상태
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing" | "complete" | "error">("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "name-asc" | "name-desc" | "date-asc" | "date-desc">("latest");
  
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({
    "전체": 1,
  });
  const [activeTab, setActiveTab] = useState("전체");
  
  const itemsPerPage = 5;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  let progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [documents, setDocuments] = useState<PDFDocument[]>([
    { id: "1", fileName: "정보통신망법_개정안.pdf", category: "법안", date: "2026-05-10", summary: "개인정보 보호 강화를 위한 정보통신망법 개정안", pageCount: 15 },
    { id: "2", fileName: "2026_마케팅_전략_발표.pptx", category: "발표자료", date: "2026-05-12", summary: "2026년 상반기 마케팅 전략 및 실행 계획", pageCount: 24 },
    { id: "3", fileName: "React_심화_과정.docx", category: "교육자료", date: "2026-05-13", summary: "React Hooks와 상태 관리 심화 학습 자료", pageCount: 45 },
    { id: "4", fileName: "API_설계_가이드.hwp", category: "기술문서", date: "2026-05-11", summary: "RESTful API 설계 원칙과 베스트 프랙티스", pageCount: 32 },
    { id: "5", fileName: "AI_산업_동향.pdf", category: "뉴스/기사", date: "2026-05-09", summary: "2026년 AI 산업 동향 및 전망 분석", pageCount: 8 },
    { id: "6", fileName: "기타문서_샘플.doc", category: "기타", date: "2026-05-08", summary: "분류되지 않은 일반 문서", pageCount: 10 },
  ]);

  // 파일 유효성 검사
  const isValidFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExt = SUPPORTED_EXTENSIONS.includes(ext);
    const isValidMime = SUPPORTED_MIME_TYPES.includes(file.type);
    
    if (!isValidExt && !isValidMime) {
      toast.error(`지원하지 않는 파일 형식입니다. 지원 형식: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return false;
    }
    return true;
  };

  // ── 업로드 시작 (버튼 클릭 시) ─────────────────────
  const startUpload = async () => {
    if (!uploadedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");
    setUploadMessage("파일 업로드 중...");
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return 90;
        }
        return prev + 2;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch(`${FASTAPI_URL}/analyze-file`, {  // 엔드포인트 변경
        method: "POST",
        body: formData,
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      setUploadProgress(95);
      setUploadStatus("analyzing");
      setUploadMessage("AI 분석 중...");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUploadProgress(100);
      setUploadStatus("complete");
      setUploadMessage("분석 완료! 상세 페이지로 이동합니다...");

      toast.success(`${data.filename} 업로드 완료!`);

      const fileExt = uploadedFile.name.split('.').pop()?.toLowerCase() || '';
      const newDoc: PDFDocument = {
        id: Date.now().toString(),
        fileName: data.filename,
        category: "일반문서",
        date: new Date().toISOString().split("T")[0],
        summary: data.text?.slice(0, 100) + "..." || "텍스트 없음",
        pageCount: data.pages || data.pageCount || 0,
        fileType: fileExt,
      };
      
      setDocuments((prev) => [newDoc, ...prev]);
      
      setTimeout(() => {
        setSelectedDocument(newDoc);
        resetUploadState();
      }, 1000);
      
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setUploadStatus("error");
      setUploadMessage("업로드 실패. 서버를 확인하세요.");
      toast.error("업로드 실패");
      
      setTimeout(() => {
        resetUploadState();
      }, 2000);
    }
  };

  const resetUploadState = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus("idle");
    setUploadedFile(null);
    setUploadMessage("");
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isValidFile(file)) return;
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
    if (!file) return;
    if (!isValidFile(file)) return;
    setUploadedFile(file);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage("");
  };

  // ── 문서 CRUD ────────────────────────────────────
  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    toast.success("문서가 삭제되었습니다");
    setSelectedDocument(null);
  };

  const handleUpdateDocument = (updatedDoc: PDFDocument) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc)));
    toast.success("문서가 수정되었습니다");
    setSelectedDocument(null);
  };

  // ── 정렬·필터 ─────────────────────────────────────
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case "latest":   return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":   return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "name-asc": return a.fileName.localeCompare(b.fileName);
      case "name-desc":return b.fileName.localeCompare(a.fileName);
      case "date-asc": return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "date-desc":return new Date(b.date).getTime() - new Date(a.date).getTime();
      default:         return 0;
    }
  });

  const categories = ["전체", ...Array.from(new Set(documents.map((d) => d.category)))];

  const getCategoryDocuments = (category: string) =>
    category === "전체" ? sortedDocuments : sortedDocuments.filter((d) => d.category === category);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (!categoryPage[value]) {
      setCategoryPage(prev => ({ ...prev, [value]: 1 }));
    }
  };

  const setPageForCategory = (category: string, page: number) => {
    setCategoryPage(prev => ({ ...prev, [category]: page }));
  };

  const getCurrentTabDocuments = () => {
    const currentCategoryDocs = getCategoryDocuments(activeTab);
    const currentPage = categoryPage[activeTab] || 1;
    return currentCategoryDocs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  };

  const handleSelectAllInCurrentTab = (checked: boolean) => {
    const currentDocs = getCurrentTabDocuments();
    if (checked) {
      setSelectedIds(currentDocs.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) { toast.error("삭제할 문서를 선택해주세요"); return; }
    if (confirm(`선택한 ${selectedIds.length}개의 문서를 삭제하시겠습니까?`)) {
      setDocuments((prev) => prev.filter((doc) => !selectedIds.includes(doc.id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length}개의 문서가 삭제되었습니다`);
    }
  };

  // 상세 보기 화면
  if (selectedDocument) {
    return (
      <PDFDetailView
        document={selectedDocument}
        onBack={() => setSelectedDocument(null)}
        onDelete={handleDeleteDocument}
        onUpdate={handleUpdateDocument}
      />
    );
  }

  // ── 문서 카드 렌더러 ──────────────────────────────
  const renderDocCard = (doc: PDFDocument) => {
    const Icon = categoryIcons[doc.category] || getFileIcon(doc.fileName);
    const colorClass = categoryColors[doc.category] || categoryColors["기타"];
    return (
      <Card
        key={doc.id}
        className="hover:shadow-xl transition-all cursor-pointer hover:border-amber-500/50 bg-white/80 backdrop-blur border-blue-900/10"
      >
        <CardHeader>
          <div className="flex items-start gap-4">
            <Checkbox
              checked={selectedIds.includes(doc.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedIds(prev => [...prev, doc.id]);
                } else {
                  setSelectedIds(prev => prev.filter(id => id !== doc.id));
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div
              className="flex-1 flex justify-between items-start"
              onClick={() => setSelectedDocument(doc)}
            >
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5" />
                  {doc.fileName}
                </CardTitle>
                <CardDescription className="mt-2">{doc.summary}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <Badge className={colorClass + " border"}>{doc.category}</Badge>
                <span className="text-xs text-muted-foreground">{doc.date}</span>
                <span className="text-xs text-muted-foreground">{doc.pageCount} 페이지</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  // ── 현재 탭의 페이지네이션 정보 ────────────────────
  const currentTabDocs = getCurrentTabDocuments();
  const currentTabTotal = getCategoryDocuments(activeTab).length;
  const currentTabTotalPages = Math.ceil(currentTabTotal / itemsPerPage);
  const currentTabPage = categoryPage[activeTab] || 1;

  // 업로드 진행 중일 때 표시할 컴포넌트
  const UploadProgressCard = () => (
    <Card className="mb-6 border-amber-500 shadow-lg bg-gradient-to-br from-blue-50 to-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          {uploadStatus === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-amber-600" />}
          {uploadStatus === "analyzing" && <Loader2 className="w-5 h-5 animate-spin text-amber-600" />}
          {uploadStatus === "complete" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {uploadStatus === "error" && <XCircle className="w-5 h-5 text-red-600" />}
          파일 업로드 진행 상황
        </CardTitle>
        <CardDescription>
          {uploadedFile?.name} ({(uploadedFile?.size || 0) / 1024 / 1024} MB)
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
        {uploadMessage && (
          <p className="text-sm text-slate-500">{uploadMessage}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ── 헤더 ── */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-6 h-6 text-amber-400" />
            <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">문서 AI 분석</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-amber-200">
              환영합니다, <span className="font-semibold text-white">{userName}</span>님
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="border-black/50 text-black hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* 숨겨진 file input - 다양한 파일 형식 지원 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* ── 업로드 진행률 표시 (활성화 시) ── */}
        {(uploadStatus !== "idle" || uploadedFile) && <UploadProgressCard />}

        {/* ── 파일 선택 카드 (진행 중이 아닐 때만 표시) ── */}
        {uploadStatus === "idle" && !uploading && !uploadedFile && (
          <div className="mb-6 slide-in-bottom">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50 cursor-copy"
                  : "border-blue-900/30 bg-gradient-to-br from-blue-900/5 to-amber-500/5 hover:from-blue-900/10 hover:to-amber-500/10 hover:shadow-xl cursor-pointer"
              } shadow-lg`}
            >
              <div className="flex flex-col items-center justify-center py-8 gap-3 pointer-events-none">
                <Upload className="w-10 h-10 text-blue-900/50" />
                <div className="text-center">
                  <p className="font-semibold text-blue-900">문서 파일 선택</p>
                  <p className="text-sm text-slate-500 mt-1">
                    클릭하거나 파일을 드래그하세요
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    지원 형식: PDF, DOC, DOCX, HWP, PPT, PPTX
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 선택된 파일 정보 + 분석 시작 버튼 ── */}
        {uploadedFile && uploadStatus === "idle" && !uploading && (
          <Card className="mb-6 border-amber-500 bg-gradient-to-br from-amber-50/30 to-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <FileText className="w-5 h-5 text-amber-600" />
                선택된 파일
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                <div>
                  <p className="font-semibold">{uploadedFile.name}</p>
                  <p className="text-sm text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadStatus("idle");
                  }}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  취소
                </Button>
              </div>
              <Button
                onClick={startUpload}
                className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white h-11"
              >
                <Upload className="w-4 h-4 mr-2" />
                분석 시작
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── 카테고리 통계 카드 ── */}
        <div className="mb-6 slide-in-bottom stagger-1">
          <Card className="bg-white/90 backdrop-blur shadow-lg border-blue-900/10 p-4">
            <div className="overflow-x-auto">
              <div className="flex gap-3">
                {categories.map((category) => {
                  const count = category === "전체"
                    ? documents.length
                    : documents.filter((d) => d.category === category).length;
                  const Icon = categoryIcons[category] || BookOpen;
                  const isActive = activeTab === category;
                  return (
                    <div
                      key={category}
                      onClick={() => handleTabChange(category)}
                      className={`text-center p-3 rounded-lg transition-all cursor-pointer flex-1 min-w-[90px] ${
                        isActive
                          ? "bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-500 shadow-md"
                          : "bg-gradient-to-br from-white to-slate-50 border border-blue-900/10 hover:shadow-md hover:border-amber-500/30"
                      }`}
                    >
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

        {/* ── 검색 및 필터 ── */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 slide-in-bottom stagger-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-900/50" />
            <Input
              placeholder="파일명, 카테고리, 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => { 
                setSearchQuery(e.target.value); 
                setCategoryPage({ "전체": 1 });
                setActiveTab("전체");
              }}
              className="pl-10 border-blue-900/20 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full md:w-[200px] border-blue-900/20">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="name-asc">이름 (가나다순)</SelectItem>
              <SelectItem value="name-desc">이름 (역순)</SelectItem>
              <SelectItem value="date-asc">날짜 (오름차순)</SelectItem>
              <SelectItem value="date-desc">날짜 (내림차순)</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />삭제 ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* ── 카테고리 탭 + 문서 목록 ── */}
        <div className="slide-in-bottom stagger-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-blue-900 font-semibold">내 문서 ({sortedDocuments.length})</h2>
            {currentTabDocs.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === currentTabDocs.length && currentTabDocs.length > 0}
                  onCheckedChange={handleSelectAllInCurrentTab}
                />
                <span className="text-sm text-slate-600">전체 선택</span>
              </div>
            )}
          </div>

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
              <TabsContent key={category} value={category}>
              </TabsContent>
            ))}
          </Tabs>

          {currentTabDocs.length === 0 ? (
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center text-slate-600">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-900" />
                <p>{searchQuery ? "검색 결과가 없습니다" : `아직 ${activeTab === "전체" ? "" : activeTab + " "}문서가 없습니다`}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentTabDocs.map(renderDocCard)}
            </div>
          )}

          {currentTabTotalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageForCategory(activeTab, currentTabPage - 1)}
                disabled={currentTabPage === 1} 
                className="border-blue-900/20 hover:bg-blue-900/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-blue-900">
                <span className="text-amber-600">{currentTabPage}</span> / {currentTabTotalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPageForCategory(activeTab, currentTabPage + 1)}
                disabled={currentTabPage === currentTabTotalPages} 
                className="border-blue-900/20 hover:bg-blue-900/10 disabled:opacity-50"
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