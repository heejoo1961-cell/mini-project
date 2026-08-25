# 견적서 파일 업로드 API 계약

## 범위

이 계약은 XLSX 또는 CSV 견적서 한 개를 Backend에 전달하고 기본 유효성을 검증하는 기능만 다룬다. 파일 내용 파싱, 영구 저장, 인증 및 외부 서비스 연동은 포함하지 않는다.

## 요청

- Method: `POST`
- Path: `/api/quote-files/upload`
- Content-Type: `multipart/form-data`
- File field: `file`
- Maximum size: 10 MiB (`10,485,760` bytes)

Frontend는 multipart boundary가 포함된 Content-Type을 브라우저가 설정하도록 두며 해당 헤더를 직접 지정하지 않는다.

## 허용 형식

| 형식 | 확장자 | MIME type |
| --- | --- | --- |
| Excel Workbook | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| CSV | `.csv` | `text/csv`, `application/csv`, `application/vnd.ms-excel` |

확장자는 대소문자를 구분하지 않으며 확장자와 MIME type이 모두 허용 목록에 들어 있어야 한다. 빈 MIME type, `text/plain`, `application/octet-stream`은 허용하지 않는다.

## 성공 응답

- HTTP status: `200 OK`

```json
{
  "fileName": "quote.xlsx",
  "fileType": "xlsx",
  "fileSize": 24831,
  "status": "success",
  "message": "견적서 파일이 정상적으로 전달되었습니다."
}
```

`fileSize`는 요청 헤더가 아닌 실제로 읽은 바이트 수다. `fileName`은 경로 정보를 제거한 파일명이며 `fileType`은 점을 제외한 소문자 확장자다.

## 오류 응답

```json
{
  "status": "error",
  "code": "UNSUPPORTED_EXTENSION",
  "message": "XLSX 또는 CSV 파일만 업로드할 수 있습니다."
}
```

| 조건 | HTTP status | code | message |
| --- | ---: | --- | --- |
| 파일 필드 누락 | 400 | `FILE_REQUIRED` | 견적서 파일을 선택해 주세요. |
| 빈 파일명 | 400 | `INVALID_FILE_NAME` | 파일 이름을 확인해 주세요. |
| 미지원 확장자 | 415 | `UNSUPPORTED_EXTENSION` | XLSX 또는 CSV 파일만 업로드할 수 있습니다. |
| 미지원 MIME type | 415 | `UNSUPPORTED_MIME_TYPE` | 파일 형식을 확인해 주세요. XLSX 또는 CSV 파일만 업로드할 수 있습니다. |
| 0바이트 파일 | 400 | `EMPTY_FILE` | 비어 있는 파일은 업로드할 수 없습니다. |
| 10 MiB 초과 | 413 | `FILE_TOO_LARGE` | 파일 크기는 10MB 이하여야 합니다. |
| 잘못된 multipart 요청 | 400 | `INVALID_UPLOAD_REQUEST` | 업로드 요청 형식을 확인해 주세요. |
| 예상하지 못한 서버 오류 | 500 | `INTERNAL_SERVER_ERROR` | 파일 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. |

내부 예외 메시지, 스택 트레이스, 서버 경로 및 파일 내용은 오류 응답이나 로그에 노출하지 않는다.

## 검증 순서

1. multipart의 `file` 필드 존재 여부
2. 파일명 존재 여부와 경로 제거
3. 마지막 확장자의 소문자 정규화 및 허용 여부
4. MIME type 허용 여부
5. chunk 단위 실제 크기 측정
6. 0바이트 및 10 MiB 초과 여부
7. 파일 닫기

## 테스트 매트릭스

| 사례 | 예상 결과 |
| --- | --- |
| 정상 XLSX | 200, `status=success`, 실제 파일 정보 |
| 정상 CSV (`text/csv`) | 200 |
| 정상 CSV (`application/csv`) | 200 |
| 정상 CSV (`application/vnd.ms-excel`) | 200 |
| 대문자 `.XLSX` | 200, `fileType=xlsx` |
| 파일 필드 누락 | 400, `FILE_REQUIRED` |
| 빈 파일명 | 400, `INVALID_FILE_NAME` |
| `.pdf`, `.xls`, `.png` | 415, `UNSUPPORTED_EXTENSION` |
| 확장자는 정상이지만 MIME 불일치 | 415, `UNSUPPORTED_MIME_TYPE` |
| 0바이트 파일 | 400, `EMPTY_FILE` |
| 정확히 10 MiB | 200 |
| 10 MiB + 1바이트 | 413, `FILE_TOO_LARGE` |
| `GET /health` | 200, 기존 계약 유지 |

## 개발 환경

- Frontend origin: `http://localhost:3000`
- Backend base URL: `http://localhost:8000`
- Frontend environment variable: `NEXT_PUBLIC_API_URL`
- CORS allowed origin: `http://localhost:3000`만 허용
