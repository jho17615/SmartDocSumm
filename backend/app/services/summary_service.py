from concurrent.futures import ThreadPoolExecutor
from email.mime import text

import ollama
import re

class SummaryService:
    def __init__(self):
        self.model = "qwen2.5:3b-instruct-q4_K_S"
        self.chunk_size = 5
        self.max_chars = 2000

        self.format_guide = {
            "법안":     "• bullet point 3~5개로 핵심 조항을 정리해줘",
            "기술문서": "• bullet point 3~5개로 핵심 기술 내용을 정리해줘",
            "뉴스/기사": "2~3문단으로 사건의 흐름과 핵심 내용을 정리해줘",
            "발표자료": "1. 번호 형식으로 주요 내용을 순서대로 정리해줘",
            "교육자료": "1. 번호 형식으로 학습 내용을 단계별로 정리해줘",
            "일반문서": "2~3문단으로 전체 내용을 정리해줘",
            "기타":     "2~3문단으로 전체 내용을 정리해줘",
        }

    def _chunk_text(self, text: str) -> list[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s for s in sentences if s.strip()]

        size = max(1, len(sentences) // self.chunk_size)
        chunks = []
        for i in range(0, len(sentences), size):
            chunks.append(" ".join(sentences[i:i+size]))

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

    def summarize(self, text: str, category: str = None) -> str:
        

        if len(text) < 500:
            combined = text
        else:
            chunks = self._chunk_text(text)
            print(f"청크 수: {len(chunks)}개")


            with ThreadPoolExecutor(max_workers =3) as executor:
                chunk_summaries = list(executor.map(self._summarize_chunk, chunks))
    
            if len(chunk_summaries) == 1:
                combined = chunk_summaries[0]
            else:
                combined = "\n".join(chunk_summaries)

        combined = combined[:2000]  # 최종 요약 입력 길이 제한 추가

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

        for tag in ["[최종 요약]", "[요약]", "[내용]", "[형식]", "출력:"]:
            result = result.replace(tag, "").strip()

        result = re.sub(r'\[\d+\]', '', result)  # [1] [2] 등 제거 ← 이 줄 추가

        if category in ["법안", "기술문서"]:
            result = re.sub(r'\*\*(.*?)\*\*', r'\1', result)  # 마크다운 제거
            result = re.sub(r'^[•\-\*]\s*', '', result, flags=re.MULTILINE)  # 기존 bullet 제거
            result = re.sub(r'^\d+\.\s*', '', result, flags=re.MULTILINE)    # 기존 번호 제거

            # 줄바꿈 또는 문장 부호 기준으로 분리
            parts = re.split(r'\n+|(?<=\.)\s+', result)
            cleaned = []
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                if not part.endswith('.'):
                    part += '.'
                cleaned.append("• " + part)

            return "\n\n".join(cleaned).strip()

        elif category in ["발표자료", "교육자료"]:
          # ** 마크다운 제거
            result = re.sub(r'\*\*(.*?)\*\*', r'\1', result)  # **bold** 제거
            result = re.sub(r'\*\*', '', result)               # 남은 ** 제거
            result = re.sub(r'^-\s+[^:：]+[：:]\s*', '', result, flags=re.MULTILINE)  # "- 소제목:" 제거
            result = re.sub(r'^\d+\.\s*', '', result, flags=re.MULTILINE)             # 기존 번호 제거
            result = re.sub(r'^\s*[\-\•]\s*', '', result, flags=re.MULTILINE)         # 앞 공백 포함해서 제거            # bullet 제거
    

            parts = [p.strip() for p in re.split(r'\n+', result) if p.strip()]
            cleaned = []
            for i, part in enumerate(parts, 1):
                if not part.endswith('.'):
                    part += '.'
                cleaned.append(f"{i}. {part}")

            return "\n\n".join(cleaned).strip()

        else:
            if "- " in result:
                if ": -" in result or ":\n-" in result:
                    intro, rest = re.split(r':\s*-\s*', result, maxsplit=1)
                    parts = [intro.strip()] + rest.split("- ")
                else:
                    parts = result.split("- ")
                cleaned = []
                for i, part in enumerate(parts):
                    part = part.strip()
                    if not part:
                        continue
                    if i == 0 and "- " not in result[:result.index("- ")]:
                        cleaned.append(part)
                    else:
                        cleaned.append("• " + part)
                return "\n\n".join(cleaned).strip()

            result = re.sub(r'(다\.)\s*', r'\1\n\n', result)
            paragraphs = [p.strip() for p in result.split("\n") if p.strip()]
            return "\n\n".join(paragraphs).strip()


summary_service = SummaryService()