/**
 * Cloudike Uploader Module
 * 다른 프로젝트에서 재사용 가능한 Cloudike 업로드 모듈
 *
 * Usage:
 *   import CloudikeUploader from './cloudike-uploader.js';
 *
 *   const uploader = new CloudikeUploader({
 *     onProgress: (current, total) => console.log(`${current}/${total}`),
 *     onError: (index, error) => console.error(error)
 *   });
 *
 *   await uploader.uploadFile(file, shareUrl, folderPath, fileName);
 */

class CloudikeUploader {
  /**
   * @param {Object} options - 설정 옵션
   * @param {string} options.apolloUrl - GraphQL 엔드포인트 (기본: Cloudike Apollo)
   * @param {string} options.proxyUrl - CORS 프록시 URL (기본: corsproxy.io)
   * @param {Function} options.onProgress - 진행률 콜백 (current, total)
   * @param {Function} options.onError - 에러 콜백 (index, error)
   */
  constructor(options = {}) {
    this.apolloUrl = options.apolloUrl || 'https://apollo.cloudike.kr/graphql';
    this.proxyUrl = options.proxyUrl || 'https://corsproxy.io/?';
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * 공유 URL에서 hash 추출
   * 예: https://app.cloudike.kr/public/QcO1RAb6o → QcO1RAb6o
   */
  extractHash(shareUrl) {
    const url = new URL(shareUrl.trim());
    return url.pathname.split('/').filter(Boolean).pop();
  }

  /**
   * URL에서 Content-Type 추출
   */
  extractContentType(uploadUrl, defaultType = 'image/jpeg') {
    try {
      const signedType = new URL(uploadUrl).searchParams.get('content-type') ||
                         new URL(uploadUrl).searchParams.get('Content-Type');
      return signedType ? decodeURIComponent(signedType) : defaultType;
    } catch (_) {
      return defaultType;
    }
  }

  /**
   * GraphQL API로 업로드 URL 발급받기
   */
  async createPublicFile(hash, filePath, fileSize) {
    const response = await fetch(this.apolloUrl + '?o=CreatePublicFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'CreatePublicFile',
        variables: {
          input: {
            hash,
            path: filePath,
            size: fileSize,
            overwrite: true,
            multipart: false
          }
        },
        query: `mutation CreatePublicFile($input: CreateFileInput!) {
          createPublicFile(input: $input) { url confirmUrl }
        }`
      })
    });

    const data = await response.json();
    const uploadUrl = data?.data?.createPublicFile?.url;
    const confirmUrl = data?.data?.createPublicFile?.confirmUrl;

    if (!uploadUrl) {
      const errorMsg = data?.errors?.[0]?.message || JSON.stringify(data).slice(0, 120);
      throw new Error(`업로드 URL 생성 실패: ${errorMsg}`);
    }

    return { uploadUrl, confirmUrl };
  }

  /**
   * 파일을 Cloudike에 업로드
   */
  async uploadFile(file, shareUrl, folderPath, fileName) {
    const hash = this.extractHash(shareUrl);
    const filePath = '/' + folderPath + '/' + fileName;

    // 1단계: 업로드 URL 발급
    const { uploadUrl, confirmUrl } = await this.createPublicFile(hash, filePath, file.size);

    // 2단계: Content-Type 추출
    const contentType = this.extractContentType(uploadUrl, file.type || 'image/jpeg');

    // 3단계: CORS 프록시를 통해 파일 PUT 전송
    const proxyUrl = this.proxyUrl + encodeURIComponent(uploadUrl);
    const uploadResponse = await fetch(proxyUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`파일 전송 실패: HTTP ${uploadResponse.status}`);
    }

    // 4단계: 업로드 확정
    if (confirmUrl) {
      await fetch(confirmUrl, { method: 'GET' }).catch(() => {});
    }

    return filePath;
  }

  /**
   * 여러 파일 일괄 업로드
   */
  async uploadMultiple(files, shareUrl, folderPath, onProgress = null) {
    const errors = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${Date.now()}_${String(i + 1).padStart(3, '0')}.${ext}`;

      try {
        await this.uploadFile(file, shareUrl, folderPath, fileName);
        this.onProgress?.(i + 1, total);
        onProgress?.(i + 1, total);
      } catch (err) {
        errors.push({ index: i, error: err });
        this.onError?.(i, err);
      }
    }

    return {
      succeeded: total - errors.length,
      failed: errors.length,
      total,
      errors
    };
  }
}

// ESM 내보내기
export default CloudikeUploader;

// CommonJS 호환성 (필요 시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudikeUploader;
}
