# Manta Diagrams

[English](README.md) · 한국어

노트의 Mermaid 도해를 Manta 배치로 읽습니다. 긴 라벨을 확인하고, 전체 뷰어에서 이동·확대하거나 SVG로 저장할 수 있습니다. 원본 노트는 그대로 둡니다.

**[사용 안내](docs/user-guide.md) · [개선 계획](ROADMAP.md)**

**0.1.0 배포 후보** · Obsidian **1.13.0 이상** · 데스크톱. Obsidian 실행 검증과 Community 등록을 준비 중입니다.

1. [개발 안내](README.md#development)에 따라 빌드한 `main.js`, `manifest.json`, `styles.css`를 시험 Vault의 `.obsidian/plugins/manta-diagrams/`에 넣고 Manta Diagrams를 활성화합니다.
2. 일반 `mermaid` 블록을 사용합니다. 읽기 화면과 Live Preview에서 원문을 바꾸지 않고 Manta 도해를 표시합니다.
3. 도해의 **Open diagram**을 누르거나, 블록 안에 커서를 두고 **Manta Diagrams: Open diagram under cursor**를 실행합니다. **Fit**, **Reading size**, 이동·확대와 **Save SVG**를 사용할 수 있습니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/manta-diagrams-intro-dark.gif">
  <img src="docs/assets/manta-diagrams-intro.gif" alt="같은 Mermaid 원문을 흐름도와 순환도로 바꾸는 Manta Diagrams" width="1200">
</picture>

실제 렌더러가 만든 흐름도와 순환도를 6초 루프로 보여줍니다. 노드와 연결은 유지하며 배치만 바뀝니다.

지원되는 일반 Mermaid 입력에는 Manta 배치를 적용합니다. **Original view**로 같은 원문의 표준 Mermaid 보기를 비교할 수 있습니다. 순환 배치는 `%% layout: loop` 주석으로 선택합니다. 작성자가 지정한 스타일과 링크는 표준 Mermaid로 처리하고, 입력을 Manta로 표현할 수 없으면 이유와 함께 표준 화면을 시도합니다. 문법 오류가 있으면 이전 그림을 지우고 원문과 오류를 보여줍니다.

Mindmap의 `::icon(fa fa-book)`은 현재 책 아이콘이 표시되지 않습니다. 원문과 노드의 글자·관계는 유지하며, 외부 아이콘 파일을 가져오지는 않습니다.

플러그인은 노트를 수정하거나 AI를 호출하지 않습니다. 필요한 라이브러리를 함께 배포하므로 렌더링에 네트워크 연결이 필요하지 않습니다. [호환 범위](docs/user-guide.md#compatibility)와 [검증 기록](docs/validation.md)을 확인할 수 있습니다.

[Manta Graph](https://github.com/woonyong-choi/manta-graph)로 근거 문서를 따라가고, [Manta Code Blocks](https://github.com/woonyong-choi/manta-code-blocks)로 예제를 실행하고, [Manta Calendar](https://github.com/woonyong-choi/manta-calendar)로 날짜가 있는 기록을 다시 찾아보세요. 각각 단독으로 쓸 수 있고, 현재는 일반 노트와 링크가 작업을 이어줍니다.

**중심 제품 Manta는 개발 중이며 아직 공개하지 않았습니다.** 자료를 추가하면서 개인 Wiki를 계속 다듬어 가는 제품을 만들고 있습니다. 네 플러그인의 자동 연결과 AI용 도구는 계획 단계입니다. [개선 계획](ROADMAP.md)
