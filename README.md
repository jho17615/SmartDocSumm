
  # 생성형 AI기반 문서요약시스템개발

  This is a code bundle for 생성형 AI기반 문서요약시스템개발. The original project is available at 
  
  ### [화면 설계서](https://www.figma.com/design/6GUeva3m6eSG9OW0tm2VjV/%EC%83%9D%EC%84%B1%ED%98%95-AI%EA%B8%B0%EB%B0%98-%EB%AC%B8%EC%84%9C%EC%9A%94%EC%95%BD%EC%8B%9C%EC%8A%A4%ED%85%9C%EA%B0%9C%EB%B0%9C)

>>>>>>> 6a8ac57 ([Fix] readme update)

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  


#### back
&nbsp;&nbsp; pip install -r requirements.txt

&nbsp;&nbsp; uvicorn app.main:app --reload


#### db
docker run --name postgres-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=qwer1234 -e POSTGRES_DB=test -p 5432:5432 -d postgres:17
>>>>>>> 6a8ac57 ([Fix] readme update)
