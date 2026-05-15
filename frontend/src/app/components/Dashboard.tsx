import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
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
  FolderOpen
} from "lucide-react";
import { PDFAnalyzer } from "./PDFAnalyzer";
import { PDFDetailView } from "./PDFDetailView";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import "../../styles/transitions.css";

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
}

const categoryIcons: Record<string, any> = {
  "법안": Scale,
  "발표자료": Presentation,
  "교육자료": GraduationCap,
  "기술문서": FileCode,
  "뉴스/기사": Newspaper,
  "일반문서": FileText,
  "기타": FolderOpen
};

const categoryColors: Record<string, string> = {
  "법안": "bg-red-100 text-red-800 border-red-300",
  "발표자료": "bg-blue-100 text-blue-800 border-blue-300",
  "교육자료": "bg-green-100 text-green-800 border-green-300",
  "기술문서": "bg-purple-100 text-purple-800 border-purple-300",
  "뉴스/기사": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "일반문서": "bg-gray-100 text-gray-800 border-gray-300",
  "기타": "bg-orange-100 text-orange-800 border-orange-300"
};

export function Dashboard({ userName, onLogout }: DashboardProps) {
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "name-asc" | "name-desc" | "date-asc" | "date-desc">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [documents, setDocuments] = useState<PDFDocument[]>([
    {
      id: "1",
      fileName: "정보통신망법_개정안.pdf",
      category: "법안",
      date: "2026-05-10",
      summary: "개인정보 보호 강화를 위한 정보통신망법 개정안",
      pageCount: 15
    },
    {
      id: "2",
      fileName: "2026_마케팅_전략_발표.pdf",
      category: "발표자료",
      date: "2026-05-12",
      summary: "2026년 상반기 마케팅 전략 및 실행 계획",
      pageCount: 24
    },
    {
      id: "3",
      fileName: "React_심화_과정.pdf",
      category: "교육자료",
      date: "2026-05-13",
      summary: "React Hooks와 상태 관리 심화 학습 자료",
      pageCount: 45
    },
    {
      id: "4",
      fileName: "API_설계_가이드.pdf",
      category: "기술문서",
      date: "2026-05-11",
      summary: "RESTful API 설계 원칙과 베스트 프랙티스",
      pageCount: 32
    },
    {
      id: "5",
      fileName: "AI_산업_동향.pdf",
      category: "뉴스/기사",
      date: "2026-05-09",
      summary: "2026년 AI 산업 동향 및 전망 분석",
      pageCount: 8
    },
    {
      id: "6",
      fileName: "기타문서_샘플.pdf",
      category: "기타",
      date: "2026-05-08",
      summary: "분류되지 않은 일반 문서",
      pageCount: 10
    }
  ]);

  // 검색 필터링
  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 정렬
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case "latest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "name-asc":
        return a.fileName.localeCompare(b.fileName);
      case "name-desc":
        return b.fileName.localeCompare(a.fileName);
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "date-desc":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      default:
        return 0;
    }
  });

  // 페이징
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);
  const paginatedDocuments = sortedDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedDocuments.map(doc => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectDocument = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error("삭제할 문서를 선택해주세요");
      return;
    }

    if (confirm(`선택한 ${selectedIds.length}개의 문서를 삭제하시겠습니까?`)) {
      setDocuments(documents.filter(doc => !selectedIds.includes(doc.id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length}개의 문서가 삭제되었습니다`);

      // 페이지 조정
      if (paginatedDocuments.length === selectedIds.length && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
    toast.success("문서가 삭제되었습니다");
    setSelectedDocument(null);
  };

  const handleUpdateDocument = (updatedDoc: PDFDocument) => {
    setDocuments(documents.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    toast.success("문서가 수정되었습니다");
    setSelectedDocument(null);
  };

  const handlePDFAnalyzed = (newDoc: PDFDocument) => {
    setDocuments([newDoc, ...documents]);
    setShowAnalyzer(false);
    toast.success("PDF 분석이 완료되었습니다");
  };

  if (showAnalyzer) {
    return <PDFAnalyzer onBack={() => setShowAnalyzer(false)} onAnalyzed={handlePDFAnalyzed} />;
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-6 h-6 text-amber-400" />
            <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">PDF AI 분석</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-amber-200">
              환영합니다, <span className="font-semibold text-white">{userName}</span>님
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 업로드 카드 */}
        <div className="mb-8 slide-in-bottom">
          <Card className="border-2 border-dashed border-blue-900/30 bg-gradient-to-br from-blue-900/5 to-amber-500/5 hover:from-blue-900/10 hover:to-amber-500/10 transition-all cursor-pointer shadow-lg hover:shadow-xl gold-shimmer">
            <CardContent className="pt-6">
              <button
                onClick={() => setShowAnalyzer(true)}
                className="w-full flex flex-col items-center justify-center py-8 gap-4"
              >
                <Upload className="w-12 h-12 text-blue-900" />
                <div className="text-center">
                  <h3 className="mb-2 text-blue-900">새 PDF 분석하기</h3>
                  <CardDescription className="text-slate-600">
                    PDF 파일을 업로드하거나 드래그하여 AI로 분석하세요
                  </CardDescription>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 slide-in-bottom stagger-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-900/50" />
            <Input
              placeholder="파일명, 카테고리, 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제 ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* 문서 목록 */}
        <div className="slide-in-bottom stagger-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-blue-900">내 문서 ({sortedDocuments.length})</h2>
            {paginatedDocuments.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.length === paginatedDocuments.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">전체 선택</span>
              </div>
            )}
          </div>

          {paginatedDocuments.length === 0 ? (
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardContent className="py-12 text-center text-slate-600">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-900" />
                <p>검색 결과가 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {paginatedDocuments.map((doc) => {
                const Icon = categoryIcons[doc.category] || FileText;
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
                          onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
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
                            <CardDescription className="mt-2">
                              {doc.summary}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Badge className={colorClass + " border"}>
                              {doc.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {doc.date}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {doc.pageCount} 페이지
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-blue-900/20 hover:bg-blue-900/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-blue-900">
                <span className="text-amber-600">{currentPage}</span> / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
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
