export interface DocumentListItem {
    id: number;
    title: string;
    category: string;
    created_at: string;
}

export interface DocumentListResponse {
    items: DocumentListItem[];
    total: number;
    page: number;
    size: number;
    total_pages: number;
}

// ✅ 페이징 파라미터 추가 (기본값: 1페이지, 5개)
export async function getDocumentListAPI(
    page: number = 1,
    size: number = 5
): Promise<DocumentListResponse> {
    const response = await fetch(`/api/documents/list?page=${page}&size=${size}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("문서를 불러올 수 없습니다.");
    return response.json();
}


export async function getDocumentDetailAPI(documentId: number) {
    const response = await fetch(`/api/documents/${documentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("문서를 불러올 수 없습니다.");
    return response.json();
}

export async function documentModifyAPI(documentId: number, content: string, title: string, category: string) {
    try {
        const response = await fetch(`/api/documents/modify/${documentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title, summary: content, content, category }),
        });
        if (!response.ok) throw new Error("문서 수정 실패");
        return await response.json();
    } catch (error) {
        console.error("documentModifyAPI 오류:", error);
        throw error;
    }
}


export async function documentdeleteAPI(documentId: number) {
    try {
        const response = await fetch(`/api/documents/delete/${documentId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!response.ok) throw new Error("문서 삭제 실패");
        return await response.json();
    } catch (error) {
        console.error("documentdeleteAPI 오류:", error);
        throw error;
    }
}

export async function documentListSortAPI(sort: string): Promise<DocumentListResponse> {
    try {
        const response = await fetch(`/api/documents/list/sort?sort=${sort}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!response.ok) throw new Error("문서 목록을 불러오지 못했습니다.");
        return response.json();
    } catch (error) {
        console.error("documentListSortAPI 오류:", error);
        throw error;
    }
}

export async function documentSearchAPI(query: string) {
    try {
        const response = await fetch(`/api/documents/search?query=${query}&size=5`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!response.ok) throw new Error("문서 검색 실패");
        return await response.json();
    } catch (error) {
        console.error("documentSearchAPI 오류:", error);
        throw error;
    }
}


export async function getCategoryCountsAPI(): Promise<Record<string, number>> {
    const response = await fetch(`/api/documents/category-counts`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("카테고리 수량 조회 실패");
    return response.json();
}

export async function documentCategoryAPI(
    category: string,
    page: number = 1,
    size: number = 5
): Promise<DocumentListResponse> {
    try {
        const response = await fetch(
            `/api/documents/category?category=${encodeURIComponent(category)}&page=${page}&size=${size}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            }
        );
        if (!response.ok) throw new Error("문서 카테고리 조회 실패");
        return await response.json();
    } catch (error) {
        console.error("documentCategoryAPI 오류:", error);
        throw error;
    }
}