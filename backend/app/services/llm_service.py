import ollama

class LLMService:
    def __init__(self):
      self.model = "qwen2.5:3b-instruct-q4_K_S"

    asycn def chat(self, messages):
        response = await ollama.chat(self.model, messages)
        return responseresponse