# Manta Diagrams

[English](README.md) · 한국어

Mermaid 도해를 넓은 화면에서 읽고, 연결선을 따라 이동하고, SVG로 저장합니다. 원본 노트는 그대로 둡니다.

**[직접 써보기](https://woonyong-choi.github.io/manta-diagrams/try/) · [사용 안내](docs/user-guide.md)**

**0.1.0 배포 후보** · Obsidian **1.13.0 이상** · 데스크톱. 브라우저 데모를 먼저 공개하며, Obsidian 실행 검증과 Community 등록을 준비 중입니다.

1. [개발 안내](README.md#development)에 따라 빌드한 `main.js`, `manifest.json`, `styles.css`를 시험 Vault의 `.obsidian/plugins/manta-diagrams/`에 넣고 Manta Diagrams를 활성화합니다.
2. 노트의 Mermaid 블록 안에 커서를 둡니다.
3. 명령 팔레트에서 **Manta Diagrams: Open diagram under cursor**를 실행합니다. 전체 보기, 읽기 크기, 이동·확대와 SVG 저장을 사용할 수 있습니다.

![Manta Diagrams 소개](docs/assets/manta-diagrams-intro.gif)

[60fps 소개 영상](docs/assets/manta-diagrams-intro.mp4). 실제 렌더러 출력에 화면 이동과 설명을 더한 영상이며, 마우스 조작을 녹화한 영상은 아닙니다.

일반 Mermaid는 표준 렌더러로 읽습니다. 순환처럼 별도 배치가 필요할 때 `%% layout: loop` 주석을 넣어 Manta 레이아웃을 선택합니다. 작성자가 지정한 스타일과 링크는 표준 Mermaid로 처리하고, 특수 레이아웃을 적용할 수 없으면 이유와 함께 표준 화면을 시도합니다. 문법 오류가 있으면 이전 그림을 지우고 원문과 오류를 보여줍니다.

플러그인은 노트를 수정하거나 AI를 호출하지 않습니다. 필요한 라이브러리를 함께 배포하므로 렌더링에 네트워크 연결이 필요하지 않습니다. [호환 범위](docs/user-guide.md#compatibility)와 [검증 기록](docs/validation.md)을 확인할 수 있습니다.

[Manta Graph](https://github.com/woonyong-choi/manta-graph)로 근거 문서를 따라가고, [Manta Code Blocks](https://github.com/woonyong-choi/manta-code-blocks)로 예제를 실행하고, [Manta Calendar](https://github.com/woonyong-choi/manta-calendar)로 날짜가 있는 기록을 다시 찾아보세요. 각각 단독으로 쓸 수 있고, 현재는 일반 노트와 링크가 작업을 이어줍니다.

**중심 제품 Manta는 개발 중이며 아직 공개하지 않았습니다.** 자료를 추가하면서 개인 Wiki를 계속 다듬어 가는 제품을 만들고 있습니다. 네 플러그인의 자동 연결과 AI용 도구는 계획 단계입니다. [제품군 소개](https://woonyong-choi.github.io/manta-diagrams/manta/) · [개선 계획](ROADMAP.md)
