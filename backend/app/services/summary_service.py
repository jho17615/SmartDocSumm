from concurrent.futures import ThreadPoolExecutor

import ollama
import re


class SummaryService:
    def __init__(self):
        self.model = "qwen2.5:3b-instruct-q4_K_S"
        self.chunk_size = 5
        self.max_chars = 2000

        self.format_guide = {
            "법안":      "각 핵심 조항을 1. 2. 3. 번호 형식으로 정리해줘. 각 항목은 한 문장으로 작성해.",
            "기술문서":  "각 핵심 내용을 • 기호로 시작하는 bullet 형식으로 정리해줘. 각 항목은 한 문장으로 작성해.",
            "뉴스/기사": "사건의 흐름과 핵심 내용을 2~3개의 문단으로 나눠서 작성해줘. 문단 사이는 빈 줄로 구분해.",
            "발표자료":  "발표 흐름대로 1. 2. 3. 번호 형식으로 정리해줘. 각 항목은 한 문장으로 작성해.",
            "교육자료":  "학습 내용을 단계별로 1. 2. 3. 번호 형식으로 정리해줘. 각 항목은 한 문장으로 작성해.",
            "일반문서":  "전체 내용을 2~3개의 문단으로 나눠서 작성해줘. 문단 사이는 빈 줄로 구분해.",
            "기타":      "전체 내용을 2~3개의 문단으로 나눠서 작성해줘. 문단 사이는 빈 줄로 구분해.",
        }

    def _chunk_text(self, text: str) -> list[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s for s in sentences if s.strip()]

        size = max(1, len(sentences) // self.chunk_size)
        chunks = []
        for i in range(0, len(sentences), size):
            chunks.append(" ".join(sentences[i:i + size]))

        return chunks[:self.chunk_size]

    def _summarize_chunk(self, text: str) -> str:
        response = ollama.chat(
            model=self.model,
            messages=[{
                'role': 'user',
                'content': f"""당신은 문서 요약 전문가입니다.
아래 텍스트를 분석하고 핵심 내용을 빠짐없이 정리해주세요.

[규칙]
- 반드시 자연스러운 한국어 문장으로 작성
- 오탈자 없이 정확하게 작성
- 목차, 페이지 번호, 장/절 구조 설명 금지
- 실제 내용(주장, 분석, 결론)만 요약
- 불필요한 인사말이나 설명 금지
- 원문에 없는 내용 추가 금지

[텍스트]
{text[:self.max_chars]}

[요약]"""
            }],
            options={
                "temperature": 0.05,
                "num_predict": 150,
                "top_k": 20,
                "top_p": 0.9
            }
        )
        return response['message']['content'].strip()

    def _clean_result(self, text: str) -> str:
        """모델 출력에서 불필요한 태그, 마크다운만 제거. 구조는 건드리지 않음."""
        for tag in ["[최종 요약]", "[요약]", "[내용]", "[형식]", "출력:"]:
            text = text.replace(tag, "")

        # 각주 번호 [1] [2] 제거
        text = re.sub(r'\[\d+\]', '', text)

        # 마크다운 bold 제거
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*\*', '', text)

        # 앞뒤 공백 정리
        return text.strip()

    def summarize(self, text: str, category: str = None) -> str:

        if len(text) < 500:
            combined = text
        else:
            chunks = self._chunk_text(text)
            print(f"청크 수: {len(chunks)}개")

            with ThreadPoolExecutor(max_workers=3) as executor:
                chunk_summaries = list(executor.map(self._summarize_chunk, chunks))

            combined = "\n".join(chunk_summaries) if len(chunk_summaries) > 1 else chunk_summaries[0]

        combined = combined[:2000]

        format_instruction = self.format_guide.get(category, self.format_guide["일반문서"])
        print(f"최종 요약 생성 중... (카테고리: {category})")

        final_response = ollama.chat(
            model=self.model,
            messages=[{
                'role': 'user',
                'content': f"""다음은 문서의 요약 내용이야. 아래 규칙에 따라 최종 요약을 작성해줘.

[규칙]
- 반드시 한국어로 작성
- {format_instruction}
- 불필요한 인사말 금지
- 원문에 없는 내용 추가 금지
- 마크다운(**) 사용 금지

[내용]
{combined}

출력:"""
            }],
            options={
                "temperature": 0.1,
                "num_predict": 1000,
                "top_k": 40,
                "top_p": 0.9
            }
        )

        result = final_response['message']['content'].strip()
        return self._clean_result(result)


summary_service = SummaryService()