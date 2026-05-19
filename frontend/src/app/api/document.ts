export async function getDocumentListAPI() {
    const response = await fetch("/api/documents/list", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!response.ok) throw new Error("문서를 불러올 수 없습니다.");
    return response.json();
}