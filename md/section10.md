# 로그 남기기

## 로그에 대해서

- 에러가 발생한 위치와 문제를 빠르고 정확하게 파악하기 위해서 사용하는 게 중요

- 개발하면서 로그를 작성

- 로그의 종류

  - Log: 중요한 정보의 범용 로깅

  - Warning: 치명적이거나 파괴적이지 않은 처리되지 않은 문제

  - error: 치명적이거나 파괴적이며 처리되지 않은 문제

  - Debug: 오류 발생 시 로직을 디버그하는데 도움이 되는 유용한 정보, 개발자용

  - Verbose: 응용 프로그램의 동작에 대한 통찰력을 제공하는 정보, 운영자용

<br />

- 로그 레벨

  |             | Log(info) | Error | Warning | Debug | Verbose |
  | ----------- | --------- | ----- | ------- | ----- | ------- |
  | Development | O         | O     | O       | O     | O       |
  | Staging     | O         | O     | O       | X     | X       |
  | Production  | O         | O     | X       | X     | X       |

<br />

- 로그 남기는 기준(실무 요약)

  | 로그 레벨 | 언제 남기나?                  | 예시                                       |
  | --------- | ----------------------------- | ------------------------------------------ |
  | error     | 장애, 예외, 복구 불가 상황    | DB 장애, 예외 발생                         |
  | warn      | 잠재적 문제, 주의 필요한 상황 | 리소스 부족, 느린 응답, 반복된 잘못된 입력 |
  | info      | 정상 이벤트, 주요 상태 변화   | 로그인, 주문 생성, 서비스 시작/종료        |
  | debug     | 개발/디버깅용 상세 정보       | 함수 진입, 변수 값, 쿼리문                 |

<br />

- 로그를 처리하기 위해서 사용하는 모듈

  - ExpressJS를 사용할 때는 Winston이라는 모듈을 주로 사용

  - NestJS에는 built-in된 logger 클래스 사용

  ```ts
  import { NestFactory } from "@nestjs/core";
  import { AppModule } from "./app.module";
  import { Logger } from "@nestjs/common";

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const port = 3000;
    await app.listen(process.env.PORT ?? port);
    Logger.log(`Application running on port ${port}`);
  }
  bootstrap();
  ```
