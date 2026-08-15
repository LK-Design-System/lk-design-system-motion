/**
 * LDS 스타일 로드 지점 — 컴포지션마다 임포트하지 말고 여기 한 곳만 유지한다.
 * core(토큰·폰트) → theme(시맨틱 색) → slides(--slides-* 캔버스 토큰) 순서.
 */
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import '@lk-design-system/lds-slides-ui/styles.css';
