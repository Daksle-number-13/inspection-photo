# CloudikeUploader - 재사용 가능한 모듈

Cloudike 공유 폴더에 파일을 업로드하는 기능을 독립적인 JavaScript 모듈로 분리했습니다.
다른 프로젝트에서 쉽게 import해서 사용할 수 있습니다.

## 📦 파일

- **`cloudike-uploader.js`** - CloudikeUploader 클래스 정의
- **`app.js`** - inspection-photo 프로젝트에서 사용하는 예시

## 🚀 사용 방법

### 기본 사용법

```javascript
import CloudikeUploader from './cloudike-uploader.js';

// 1. 인스턴스 생성
const uploader = new CloudikeUploader({
  onProgress: (current, total) => console.log(`${current}/${total}`),
  onError: (index, error) => console.error(error)
});

// 2. 단일 파일 업로드
const file = document.getElementById('fileInput').files[0];
const shareUrl = 'https://app.cloudike.kr/public/QcO1RAb6o';
const folderPath = 'my_folder';
const fileName = 'photo.jpg';

try {
  await uploader.uploadFile(file, shareUrl, folderPath, fileName);
  console.log('✓ 업로드 완료!');
} catch (error) {
  console.error('✕ 업로드 실패:', error.message);
}
```

### 다중 파일 업로드

```javascript
// 여러 파일을 한 번에 업로드
const files = document.getElementById('fileInput').files;
const result = await uploader.uploadMultiple(files, shareUrl, folderPath);

console.log(`성공: ${result.succeeded}, 실패: ${result.failed}`);
if (result.errors.length > 0) {
  result.errors.forEach(e => {
    console.error(`파일 ${e.index + 1}: ${e.error.message}`);
  });
}
```

## ⚙️ 설정 옵션

```javascript
const uploader = new CloudikeUploader({
  // Cloudike GraphQL API 엔드포인트
  apolloUrl: 'https://apollo.cloudike.kr/graphql',

  // CORS 우회 프록시 URL (기본: corsproxy.io)
  proxyUrl: 'https://corsproxy.io/?',

  // 진행률 콜백 (현재 파일 수, 전체 파일 수)
  onProgress: (current, total) => {},

  // 에러 콜백 (파일 인덱스, 에러 객체)
  onError: (index, error) => {}
});
```

## 📋 API 레퍼런스

### `CloudikeUploader.uploadFile(file, shareUrl, folderPath, fileName)`

**매개변수:**
- `file` (File) - 업로드할 파일 객체
- `shareUrl` (string) - Cloudike 공유 폴더 URL
  - 예: `https://app.cloudike.kr/public/QcO1RAb6o`
- `folderPath` (string) - 저장할 폴더 경로 (슬래시로 시작하면 안됨)
  - 예: `2025-03-25_검사_P001_공정1_결함없음`
- `fileName` (string) - 저장할 파일명
  - 예: `1234567890_001.jpg`

**반환값:**
- (string) 저장된 파일의 전체 경로

**예외:**
- 업로드 URL 생성 실패
- 파일 전송 실패 (HTTP 에러)

### `CloudikeUploader.uploadMultiple(files, shareUrl, folderPath, onProgress)`

**매개변수:**
- `files` (File[]) - 업로드할 파일 배열
- `shareUrl` (string) - Cloudike 공유 폴더 URL
- `folderPath` (string) - 저장할 폴더 경로
- `onProgress` (Function, 선택) - 진행률 콜백 `(current, total) => {}`

**반환값:**
```javascript
{
  succeeded: 3,      // 성공한 파일 수
  failed: 1,         // 실패한 파일 수
  total: 4,          // 전체 파일 수
  errors: [
    {
      index: 2,      // 파일 인덱스
      error: Error   // 에러 객체
    }
  ]
}
```

## 🔧 inspection-photo 프로젝트에서의 사용

```javascript
// app.js에서 import
import CloudikeUploader from './cloudike-uploader.js';

const uploader = new CloudikeUploader();

// handleUpload() 함수에서 사용
async function handleUpload() {
  // ... 유효성 검사 ...

  const result = await uploader.uploadMultiple(
    selectedFiles,
    folder.url,
    folderName,
    (current, total) => {
      showStatus(`⏳ 업로드 중... (${current}/${total})`, 'loading');
    }
  );

  // 결과 처리
  if (result.errors.length === 0) {
    showStatus('✓ 업로드 완료!', 'success');
  } else {
    showStatus(`⚠️ ${result.succeeded}/${result.total}장 완료`, 'error');
  }
}
```

## 📝 주의사항

1. **CORS 프록시**
   - KT Cloud 오브젝트 스토리지는 브라우저 직접 요청을 차단합니다
   - corsproxy.io를 통해 CORS를 우회합니다
   - 개인/사내 용도의 임시 우회책입니다

2. **공유 URL 형식**
   - Cloudike 공유 폴더의 공개 URL을 사용해야 합니다
   - URL 끝에 trailing slash(/)가 없어야 합니다

3. **파일명**
   - 자동으로 타임스탐프와 인덱스가 추가됩니다
   - 파일명에 특수문자는 제거됩니다

## 🔄 다른 프로젝트에서 사용하기

### 방법 1: 파일 복사
```bash
cp cloudike-uploader.js /path/to/other-project/
```

### 방법 2: Git submodule (권장)
```bash
git submodule add https://github.com/daksle-number-13/inspection-photo.git inspector-photo
```

### 방법 3: npm 패키지 (향후 계획)
```bash
npm install @daksle-number-13/cloudike-uploader
```

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Daksle-number-13
