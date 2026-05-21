import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
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
  Scale,
  Presentation,
  GraduationCap,
  FileCode,
  Newspaper,
  FolderOpen,
  Calendar,
  Edit,
  Trash2,
  Save,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import "../../styles/transitions.css";
import { documentModifyAPI } from "../api/document";

interface PDFDocument {
  id: string;
  fileName: string;
  category: string;
  date: string;
  summary: string;
  pageCount: number;
  content?: string;
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

export function PDFDetailView({ document, onBack, onDelete, onUpdate }: PDFDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedDoc, setEditedDoc] = useState(document);

  const Icon = categoryIcons[document.category] || FileText;
  const colorClass = categoryColors[document.category] || categoryColors["기타"];

  // ✅ 요약 다운로드 함수 (수정됨 - window.document 사용)
  const handleDownloadSummary = () => {
    if (!document.summary) {
      toast.error("다운로드할 요약 내용이 없습니다.");
      return;
    }

    const blob = new Blob([document.summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.fileName}_요약.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("요약이 다운로드되었습니다!");
  };

  const handleSaveEdit = async () => {
    try {
      await documentModifyAPI(
        Number(document.id),
        editedDoc.summary ?? "",
        editedDoc.fileName,
        editedDoc.category
      );
      const updatedDoc: PDFDocument = {
        ...editedDoc,
      };
      onUpdate(updatedDoc);
      setIsEditing(false);
      toast.success("문서가 수정되었습니다.");
    } catch (error) {
      console.error("문서 수정 실패:", error);
      toast.error("문서 수정에 실패했습니다.");
    }
  };

  const handleCancelEdit = () => {
    setEditedDoc(document);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(document.id);
    setShowDeleteDialog(false);
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
                  onClick={handleDownloadSummary}
                  className="border-green-300 text-green-600 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  요약 다운로드
                </Button>
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

        {/* 문서 요약 카드 */}
        <Card className="mb-6 slide-in-bottom stagger-1 shadow-lg border-amber-500/30 bg-gradient-to-br from-white to-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
               문서 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="leading-relaxed whitespace-pre-wrap">{document.summary}</p>
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