export async function getDocumentListAPI() {
    const response = await fetch("/api/documents/list", {
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
        console.error("documentModifyAPI 오류:", error);
        throw error;
    }
}
