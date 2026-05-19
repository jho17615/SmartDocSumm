import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  BarChart3,
  Scale,
  Presentation,
  GraduationCap,
  FileCode,
  Newspaper,
  FolderOpen,
  Calendar,
  FileStack,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";
import "../../styles/transitions.css";

interface PDFDocument {
  id: string;
  fileName: string;
  category: string;
  date: string;
  summary: string;
  pageCount: number;
  content?: string;
  analysisResults?: {
    confidence: number;
    fullSummary: string;
    pageSummaries: { page: number; summary: string }[];
    sectionSummaries: { title: string; summary: string }[];
    percentSummaries: { percent: number; summary: string }[];
    keyInsights: string[];
  };
}

interface AnalysisResults {
  confidence: number;
  fullSummary: string;
  pageSummaries: { page: number; summary: string }[];
  sectionSummaries: { title: string; summary: string }[];
  percentSummaries: { percent: number; summary: string }[];
  keyInsights: string[];
}

interface PDFDetailViewProps {
  document: PDFDocument;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (document: PDFDocument) => void;
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

const categories = ["법안", "발표자료", "교육자료", "기술문서", "뉴스/기사", "일반문서", "기타"];

// 기본 AI 분석 결과
const defaultAnalysisResults: AnalysisResults = {
  confidence: 95,
  fullSummary: "",
  pageSummaries: [],
  sectionSummaries: [
    { title: "1. 서론", summary: "문서의 목적과 범위를 정의하고, 주요 내용을 개괄합니다." },
    { title: "2. 본론", summary: "핵심 내용을 체계적으로 전개하며, 구체적인 사례를 제시합니다." },
    { title: "3. 결론", summary: "주요 내용을 요약하고, 향후 방향을 제시합니다." }
  ],
  percentSummaries: [
    { percent: 25, summary: "문서 초반부에서 기본 개념과 배경 지식을 설명합니다." },
    { percent: 50, summary: "중반부에서 핵심 내용과 주요 논점을 상세히 다룹니다." },
    { percent: 75, summary: "후반부에서 실제 적용 방법과 사례를 제시합니다." },
    { percent: 100, summary: "마지막 부분에서 결론과 향후 발전 방향을 제시합니다." }
  ],
  keyInsights: [
    "문서의 주요 목적은 실무 적용 가능한 지식 전달입니다.",
    "체계적인 구조로 이해하기 쉽게 작성되었습니다.",
    "최신 트렌드와 실제 사례가 잘 반영되어 있습니다."
  ]
};

export function PDFDetailView({ document, onBack, onDelete, onUpdate }: PDFDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedDoc, setEditedDoc] = useState(document);
  
  // ✅ 문서에 저장된 분석 결과 불러오기 (없으면 기본값)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>(
    document.analysisResults || {
      ...defaultAnalysisResults,
      fullSummary: document.summary ?? "",
      pageSummaries: Array.from({ length: Math.min(document.pageCount, 10) }, (_, i) => ({
        page: i + 1,
        summary: `${i + 1}페이지: 문서의 주요 내용을 분석한 결과입니다.`
      }))
    }
  );

  const Icon = categoryIcons[document.category] || FileText;
  const colorClass = categoryColors[document.category] || categoryColors["기타"];

  // ✅ 저장 시 분석 결과도 함께 저장
  const handleSaveEdit = () => {
    const updatedDoc: PDFDocument = {
      ...editedDoc,
      analysisResults: analysisResults  // 분석 결과 포함
    };
    onUpdate(updatedDoc);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedDoc(document);
    // ✅ 분석 결과도 원래대로 복원
    setAnalysisResults(document.analysisResults || defaultAnalysisResults);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(document.id);
    setShowDeleteDialog(false);
  };

  // 페이지별 요약 수정
  const updatePageSummary = (page: number, summary: string) => {
    setAnalysisResults(prev => ({
      ...prev,
      pageSummaries: prev.pageSummaries.map(p => 
        p.page === page ? { ...p, summary } : p
      )
    }));
  };

  // 소제목별 요약 수정
  const updateSectionSummary = (index: number, summary: string) => {
    setAnalysisResults(prev => ({
      ...prev,
      sectionSummaries: prev.sectionSummaries.map((s, i) => 
        i === index ? { ...s, summary } : s
      )
    }));
  };

  // 구간별 요약 수정
  const updatePercentSummary = (percent: number, summary: string) => {
    setAnalysisResults(prev => ({
      ...prev,
      percentSummaries: prev.percentSummaries.map(p => 
        p.percent === percent ? { ...p, summary } : p
      )
    }));
  };

  // 주요 인사이트 수정
  const updateKeyInsight = (index: number, insight: string) => {
    setAnalysisResults(prev => ({
      ...prev,
      keyInsights: prev.keyInsights.map((k, i) => i === index ? insight : k)
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-lg border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            <div className="flex items-center gap-2 text-white">
              <Icon className="w-6 h-6 text-amber-400" />
              <h1 className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">문서 상세 보기</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 문서 정보 카드 */}
        <Card className="mb-6 fade-in-scale shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <CardTitle className="flex items-center gap-2 mb-3 text-blue-900">
                      <Icon className="w-6 h-6" />
                      {document.fileName}
                    </CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {document.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileStack className="w-4 h-4" />
                        {document.pageCount} 페이지
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fileName" className="text-blue-900">파일명</Label>
                      <Input
                        id="fileName"
                        value={editedDoc.fileName}
                        onChange={(e) => setEditedDoc({ ...editedDoc, fileName: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-blue-900">카테고리</Label>
                      <Select
                        value={editedDoc.category}
                        onValueChange={(value) => setEditedDoc({ ...editedDoc, category: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pageCount" className="text-blue-900">페이지 수</Label>
                      <Input
                        id="pageCount"
                        type="number"
                        value={editedDoc.pageCount}
                        onChange={(e) => setEditedDoc({ ...editedDoc, pageCount: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
              {!isEditing && (
                <Badge className={colorClass + " border text-base px-4 py-2"}>
                  {document.category}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* 문서 요약 */}
        <Card className="mb-6 slide-in-bottom stagger-1 shadow-lg border-amber-500/30 bg-gradient-to-br from-white to-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              문서 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="leading-relaxed">{document.summary}</p>
            ) : (
              <div>
                <Label htmlFor="summary" className="text-blue-900">요약 내용</Label>
                <Textarea
                  id="summary"
                  value={editedDoc.summary}
                  onChange={(e) => setEditedDoc({ ...editedDoc, summary: e.target.value })}
                  rows={6}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 분석 결과 - 주요 인사이트 */}
        <Card className="mb-6 slide-in-bottom stagger-1 shadow-lg border-amber-500/30 bg-gradient-to-br from-white to-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              AI 분석 결과
            </CardTitle>
            <CardDescription>
              AI가 분석한 문서 카테고리 신뢰도: <span className="font-semibold text-amber-700">{analysisResults.confidence}%</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-blue-900">주요 인사이트</h4>
                {!isEditing ? (
                  <ul className="space-y-2">
                    {analysisResults.keyInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-3">
                    {analysisResults.keyInsights.map((insight, index) => (
                      <Input
                        key={index}
                        value={insight}
                        onChange={(e) => updateKeyInsight(index, e.target.value)}
                        className="text-sm"
                        placeholder={`인사이트 ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 영역 */}
        <Tabs defaultValue="full" className="w-full slide-in-bottom stagger-2">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-900/20">
            <TabsTrigger value="full">전체 요약</TabsTrigger>
            <TabsTrigger value="pages">페이지별</TabsTrigger>
            <TabsTrigger value="sections">소제목별</TabsTrigger>
            <TabsTrigger value="percent">구간별</TabsTrigger>
          </TabsList>

          {/* 전체 요약 */}
          <TabsContent value="full">
            <Card className="shadow-lg border-blue-900/10 bg-white/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  전체 문서 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <p className="leading-relaxed">{analysisResults.fullSummary}</p>
                ) : (
                  <Textarea
                    value={analysisResults.fullSummary}
                    onChange={(e) => setAnalysisResults(prev => ({ ...prev, fullSummary: e.target.value }))}
                    rows={8}
                    className="w-full"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 페이지별 요약 */}
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
                      {!isEditing ? (
                        <p className="text-sm leading-relaxed">{page.summary}</p>
                      ) : (
                        <Textarea
                          value={page.summary}
                          onChange={(e) => updatePageSummary(page.page, e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 소제목별 요약 */}
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
                      {!isEditing ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {section.summary}
                        </p>
                      ) : (
                        <Textarea
                          value={section.summary}
                          onChange={(e) => updateSectionSummary(index, e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 구간별 요약 */}
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
                      {!isEditing ? (
                        <p className="text-sm leading-relaxed">
                          {item.summary}
                        </p>
                      ) : (
                        <Textarea
                          value={item.summary}
                          onChange={(e) => updatePercentSummary(item.percent, e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}