import ollama

class SummaryService:
    def __init__(self):
      self.model = "qwen2.5:3b-instruct-q4_K_S"
  
    def summarize(self, text: str) -> str:
        prompt = f"""다음 텍스트를 한국어로 요약해줘:

          {text}

        요약:"""
        
        response = ollama.generate( 
          model=self.model,
          prompt=prompt,
          stream=False
        )
        
        return response["response"]

summary_service = SummaryService()  