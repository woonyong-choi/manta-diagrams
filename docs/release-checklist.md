# Community Plugin submission checklist

Verified 2026-09-23 against:
- https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions
- `obsidianmd/obsidian-releases` `community-plugins.json` (fetched 2026-09-23, 7928 entries)

## manifest.json

| Field | Value | Status |
| --- | --- | --- |
| `id` | `manta-diagrams` | PASS — unique, does not contain "obsidian" or "plugin" |
| `name` | `Manta Diagrams` | PASS — does not contain "Obsidian" or "Plugin" |
| `version` | `0.1.0` | PASS — matches `package.json` (`node tools/verify-release.mjs` asserts this) |
| `minAppVersion` | `1.13.0` | PASS — matches `versions.json` (`{"0.1.0":"1.13.0"}`) |
| `description` | present, one sentence | PASS |
| `author` | `Woonyong Choi` | PASS |
| `authorUrl` | `https://github.com/woonyong-choi` | PASS |
| `isDesktopOnly` | `true` | Present; unchanged (design decision owned by another agent, not verified further here) |
| `fundingUrl` | not set | Optional field per docs; left unset, no action needed |

## Name/id collision check

`community-plugins.json`을 다운로드해 `id == "manta-diagrams"` 및 name에 "manta diagrams"가 포함된 항목을 검색:
결과 — 충돌 없음 (기존 7928개 항목 중 일치 없음).

## Build and test

```
$ npm run build
main.js  5.4mb ⚠️
⚡ Done in 287ms
```
- `main.js` 5,746,985 bytes, `styles.css` 3,562 bytes 생성 확인 (2026-09-23).

```
$ npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
```
- 별도 렌더러 스위트(`tests/renderer.test.mjs`)의 커버리지 카운터: types 31/31, complex 31/31, boundary 31/31, aliases 10/10, corpus 0/0, failures: [] — 전부 pass.

```
$ node tools/verify-release.mjs
Release metadata and assets verified: 0.1.0
```
- 이 스크립트가 확인하는 항목: `manifest.id`/`name` 고정값, `manifest.version == package.json version`(semver 형식), `versions[version] == manifest.minAppVersion`, `main.js`/`styles.css`/`docs/third-party-notices.txt` 크기 > 100바이트, 번들에 `require("fs"|"child_process"|"electron"|"node:...")` 없음, 번들에 로컬 절대경로(`/Users/`) 누출 없음.

## Release tag format

공식 문서: "Create a tag that matches the version in the `manifest.json` file." — 예시(`git tag -a 1.0.1 -m "1.0.1"`)는 `v` 접두사를 쓰지 않는다.

**결정**: 이 WP 지시문 예시(`gh release create v<version> ...`)의 `v` 접두사는 공식 요건과 어긋나므로 따르지 않는다. draft 릴리스 태그는 `0.1.0`으로 생성한다 (아래 `handoff.md`의 Decisions 참고).

## README

- 설치: 로컬 개발 빌드 절차 명시 (공식 Community 승인 전이므로 "Install in Obsidian" 링크는 아직 없음 — 정상, 승인 후 추가 대상).
- 사용법: 명령어·플로우 설명 있음.
- 스크린샷: `docs/assets/manta-diagrams-intro(-dark).gif`를 절대 GitHub raw URL로 교체함 (아래 curl 검증 참고).
- 라이선스: `[MIT](LICENSE)` 링크 있음, `LICENSE` 파일 MIT 확인.

### 이미지 URL 200 검증 (2026-09-23)

```
200  https://raw.githubusercontent.com/woonyong-choi/manta-diagrams/main/docs/assets/manta-diagrams-intro-dark.gif
200  https://raw.githubusercontent.com/woonyong-choi/manta-diagrams/main/docs/assets/manta-diagrams-intro.gif
```

## 결과

전 항목 PASS. `isDesktopOnly` 값 자체의 타당성(정말 데스크톱 전용이어야 하는지)은 src 변경 권한이 없는 이 WP 범위 밖이라 재판단하지 않았다.

## 재검증 (2026-09-23, manta-tokens 반영 후)

디자인 토큰 통일(`style: manta-tokens 로 디자인 토큰 통일`)이 `src/` 를 바꿨으므로 최신 소스로 다시 빌드·검증하고
draft 릴리스 자산을 교체했다.

```
$ npm run build          # main.js 5,755,552 B, styles.css 11,083 B
$ npm test               # ℹ tests 28 / ℹ pass 28 / ℹ fail 0
$ node tools/verify-release.mjs
Release metadata and assets verified: 0.1.0
```

### 자산 교체

draft 릴리스는 두 개가 같은 태그 `0.1.0` 을 쓴다(신규 id 394069500 / 구 id 388456529). `gh release upload 0.1.0` 은
어느 쪽을 고를지 모호하므로 릴리스 id 를 지정해 REST API 로 기존 자산 3개를 지우고 새로 올렸다.
구 draft(id 388456529)는 그대로 둔다.

| 자산 | 크기(B) | sha256 |
| --- | --- | --- |
| `main.js` | 5,755,552 | `16071d844b1fd68b7883186e590a9a90c95d4e6f652f77177d583a55cc8204e7` |
| `manifest.json` | 333 | `b70b95aeab70cc57bf8ae3080c8ecf1bdc1629a28d774cfc678adaddc43405b3` |
| `styles.css` | 11,083 | `102b534226337d3f2e03b3c0c4dd944947ebabf8b592d2350ef6cde1bfc47cde` |

업로드된 자산을 다시 내려받아 계산한 sha256 이 로컬 빌드 산출물과 모두 일치함을 확인했다.

### 토큰 일관성

```
$ node ../manta-tokens/scripts/sync.mjs --check
0 file(s) drifted
$ node ../manta-tokens/scripts/check-usage.mjs styles.css
styles.css: ok (0건)
```

### 남은 일

- draft → publish 전환은 사람이 한다(지시대로).
- 구 draft(id 388456529) 삭제 여부는 여전히 미결.
