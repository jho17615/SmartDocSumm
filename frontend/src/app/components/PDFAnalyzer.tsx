import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  BookOpen,
  BarChart3,
  FileSearch,
  Loader2,
  Upload,
  X,
  Scale,
  Presentation,
  GraduationCap,
  FileCode,
  Newspaper,
  FolderOpen
} from "lucide-react";
import "../../styles/transitions.css";

interface PDFDocument {
  id: string;
  fileName: string;
  category: string;
  date: string;
  summary: string;
  pageCount: number;
}

interface PDFAnalyzerProps {
  onBack: () => void;
  onAnalyzed?: (document: PDFDocument) => void;
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

export function PDFAnalyzer({ onBack, onAnalyzed }: PDFAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [analysisResults, setAnalysisResults] = useState({
    category: "기술문서",
    confidence: 95,
    fullSummary: "이 문서는 소프트웨어 개발 방법론에 대한 기술 문서입니다. 애자일 개발, 테스트 주도 개발(TDD), 지속적 통합(CI/CD) 등의 주제를 다루고 있습니다.",
    pageSummaries: [
      { page: 1, summary: "소프트웨어 개발 방법론 소개 및 전통적 방법론과 현대적 방법론의 비교" },
      { page: 2, summary: "애자일 개발 방법론의 원칙과 스크럼, 칸반 등의 프레임워크 설명" },
      { page: 3, summary: "테스트 주도 개발(TDD)의 개념과 실제 적용 사례" }
    ],
    sectionSummaries: [
      { title: "1. 개발 방법론 개요", summary: "전통적 폭포수 모델부터 현대 애자일 방법론까지의 발전 과정" },
      { title: "2. 애자일 실천 방법", summary: "스프린트 계획, 일일 스탠드업, 회고 등의 실천 방법" },
      { title: "3. 품질 관리", summary: "코드 리뷰, 자동화 테스트, CI/CD 파이프라인 구축" }
    ],
    percentSummaries: [
      { percent: 25, summary: "문서 초반부에서 개발 방법론의 역사와 필요성을 설명" },
      { percent: 50, summary: "중반부에서 애자일 방법론의 핵심 개념과 실천 방법을 상세히 다룸" },
      { percent: 75, summary: "테스트와 품질 관리에 대한 구체적인 기법과 도구 소개" },
      { percent: 100, summary: "실제 프로젝트에 적용한 사례와 효과, 향후 발전 방향 제시" }
    ]
  });

  const detectCategory = (fileName: string): string => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes("법") || lowerName.includes("법률") || lowerName.includes("법안") || lowerName.includes("개정")) {
      return "법안";
    } else if (lowerName.includes("발표") || lowerName.includes("프레젠") || lowerName.includes("ppt") || lowerName.includes("슬라이드")) {
      return "발표자료";
    } else if (lowerName.includes("교육") || lowerName.includes("학습") || lowerName.includes("강의") || lowerName.includes("튜토리얼")) {
      return "교육자료";
    } else if (lowerName.includes("api") || lowerName.includes("기술") || lowerName.includes("개발") || lowerName.includes("코드")) {
      return "기술문서";
    } else if (lowerName.includes("뉴스") || lowerName.includes("기사") || lowerName.includes("동향") || lowerName.includes("트렌드")) {
      return "뉴스/기사";
    } else if (lowerName.includes("보고서") || lowerName.includes("문서")) {
      return "일반문서";
    }
    return "기타";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysisComplete(false);
    }
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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setAnalysisComplete(false);
    } else {
      alert("PDF 파일만 업로드 가능합니다.");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    const category = detectCategory(file.name);

    setAnalyzing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      setAnalyzing(false);
      setAnalysisComplete(true);

      setAnalysisResults({
        ...analysisResults,
        category: category
      });
    }, 2500);
  };

  const handleSaveDocument = () => {
    if (file && onAnalyzed) {
      const newDocument: PDFDocument = {
        id: Date.now().toString(),
        fileName: file.name,
        category: analysisResults.category,
        date: new Date().toISOString().split('T')[0],
        summary: analysisResults.fullSummary,
        pageCount: Math.floor(Math.random() * 50) + 5
      };
      onAnalyzed(newDocument);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-amber-200 hover:text-white hover:bg-amber-500/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로 가기
          </Button>
          <div className="flex items-center gap-2 text-white">
            <FileSearch className="w-6 h-6 text-amber-400" />
            <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">PDF 분석</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card className="mb-6 fade-in-scale shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-blue-900">PDF 파일 업로드</CardTitle>
            <CardDescription>
              분석할 PDF 파일을 선택하거나 드래그하여 업로드하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 드래그 앤 드롭 영역 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging
                  ? "border-blue-900 bg-blue-900/10"
                  : "border-blue-900/25 hover:border-amber-500/50 hover:bg-amber-50/30"
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-blue-900" : "text-blue-900/50"}`} />
              <p className="text-sm mb-2 text-slate-600">
                PDF 파일을 여기에 드래그하거나
              </p>
              <Label
                htmlFor="pdf-file"
                className="inline-block px-4 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-md cursor-pointer hover:from-blue-800 hover:to-indigo-800 transition-all shadow-md"
              >
                파일 선택
              </Label>
              <input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-900/20">
                <FileText className="w-5 h-5 text-blue-900" />
                <span className="text-sm flex-1 text-blue-900 font-medium">{file.name}</span>
                <span className="text-sm text-amber-700 font-semibold">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="hover:bg-red-100 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {analyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-900 font-medium">분석 중...</span>
                  <span className="text-amber-700 font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white shadow-lg"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 분석 시작
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {analysisComplete && (
          <div className="space-y-6 fade-in-scale">
            <Card className="shadow-lg border-amber-500/30 bg-gradient-to-br from-white to-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  문서 카테고리
                </CardTitle>
                <CardDescription>
                  AI가 자동으로 감지한 문서 유형입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const Icon = categoryIcons[analysisResults.category] || FileText;
                      const colorClass = categoryColors[analysisResults.category] || categoryColors["기타"];
                      return (
                        <>
                          <Icon className="w-8 h-8 text-blue-900" />
                          <div>
                            <Badge className={colorClass + " border text-lg px-4 py-2"}>
                              {analysisResults.category}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-2">
                              신뢰도: <span className="text-amber-700 font-semibold">{analysisResults.confidence}%</span>
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <Button
                    onClick={handleSaveDocument}
                    size="lg"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
                  >
                    대시보드에 저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="full" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-900/20">
                <TabsTrigger value="full">전체 요약</TabsTrigger>
                <TabsTrigger value="pages">페이지별</TabsTrigger>
                <TabsTrigger value="sections">소제목별</TabsTrigger>
                <TabsTrigger value="percent">구간별</TabsTrigger>
              </TabsList>

              <TabsContent value="full">
                <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                      전체 문서 요약
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed">
                      {analysisResults.fullSummary}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pages">
                <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-blue-900">페이지별 요약</CardTitle>
                    <CardDescription>
                      각 페이지의 주요 내용을 확인하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResults.pageSummaries.map((page, index) => (
                      <div key={page.page}>
                        {index > 0 && <Separator className="my-4" />}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="border-blue-900/30 text-blue-900">페이지 {page.page}</Badge>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {page.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sections">
                <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-blue-900">소제목별 요약</CardTitle>
                    <CardDescription>
                      문서의 각 섹션을 주제별로 정리했습니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResults.sectionSummaries.map((section, index) => (
                      <div key={index}>
                        {index > 0 && <Separator className="my-4" />}
                        <div>
                          <h4 className="mb-2 text-blue-900">{section.title}</h4>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {section.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="percent">
                <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-blue-900">구간별 요약 (25% 단위)</CardTitle>
                    <CardDescription>
                      문서를 4등분하여 각 구간의 내용을 요약했습니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResults.percentSummaries.map((item, index) => (
                      <div key={item.percent}>
                        {index > 0 && <Separator className="my-4" />}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">0-{item.percent}%</Badge>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
