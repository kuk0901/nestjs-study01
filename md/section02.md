# NestJS 소개

## NestJS?

- Node.js 서버 측 애플리케이션을 구축하기 위한 프레임워크

- 프로그레시브 JavaScript를 사용하고 TypeScript로 빌드됨

  > 순수 JavaScript로 코딩 가능

- OOP, PF, FRP 요소를 사용할 수 있게 해 줌

<br />

## NestJS 내부 구성

- Express(기본값)와 같은 HTTP 서버 프레임워크를 사용하며 선택적으로 Fastify를 사용하도록 구성 가능

- 공통 Node.js 프레임워크(Express, Fastify) 위에 추상화 수준을 제공하지만 API를 개발자에게 직접 노출

> 기본 플랫폼에서 사용할 수 있는 타사 모듈 사용 가능

<br />

## Nest JS CLI로 시작하기

- 설치

```shell
$ npm i -g @nestjs/cli
```

<br />

- 프로젝트 생성

  ```shell
  $ npm new project-name
  ```

<br />

- 버전 확인

  ```shell
  $ nest --version
  ```
