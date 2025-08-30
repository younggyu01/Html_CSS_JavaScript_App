// ===== 전역 설정 =====
const API_BASE_URL = 'http://localhost:8080';
let editingBookId = null;

// ===== DOM 참조 =====
const bookForm = document.getElementById('bookForm');
const bookTableBody = document.getElementById('bookTableBody');
const submitButton = bookForm.querySelector('button[type="submit"]');
const cancelButton = bookForm.querySelector('.cancel-btn');
const loadingMessage = document.getElementById('loadingMessage');
const formError = document.getElementById('formError');
const publisherSelect = document.getElementById('publisherSelect');

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  loadPublishers();
  loadBooks();
});

// ===== 공통 유틸 =====
function isValidUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function showLoading(show) {
  if (show) {
    loadingMessage.style.display = 'block';
    bookTableBody.innerHTML = '';
  } else {
    loadingMessage.style.display = 'none';
  }
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.textContent = loading
    ? (editingBookId ? '수정 중...' : '등록 중...')
    : (editingBookId ? '도서 수정' : '도서 등록');
}

function showError(message) {
  formError.textContent = message;
  formError.style.display = 'inline-block';
  formError.style.color = '#f44336';
}

function showSuccess(message) {
  formError.textContent = message;
  formError.style.display = 'inline-block';
  formError.style.color = '#4CAF50';
}

function clearMessages() {
  formError.style.display = 'none';
}

// 모든 input/textarea 변경 시 메시지 자동 지우기
bookForm.querySelectorAll('input, textarea, select').forEach(el => {
  el.addEventListener('input', clearMessages);
  el.addEventListener('change', clearMessages);
});

// 서버 에러 JSON 안전 파싱
async function parseError(response) {
  let data;
  try { data = await response.json(); }
  catch { return { status: response.status, message: `HTTP ${response.status}` }; }
  // 전역 핸들러 포맷: {status, message, timestamp, errors?}
  // (혹시 statusCode를 쓰는 환경도 대비)
  const status = data.status ?? data.statusCode ?? response.status;
  const message = data.message || `HTTP ${status}`;
  return { status, message, errors: data.errors };
}

// ===== 데이터 로드 =====
function loadPublishers() {
  fetch(`${API_BASE_URL}/api/publishers`)
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(pubs => {
      publisherSelect.innerHTML = `<option value="">-- 출판사를 선택하세요 --</option>`;
      pubs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        publisherSelect.appendChild(opt);
      });
    })
    .catch(async (err) => {
      const e = await parseError(err);
      console.error('출판사 로드 실패:', e.message);
      showError(`출판사 목록을 불러오지 못했습니다: ${e.message}`);
    });
}

function loadBooks() {
  showLoading(true);
  fetch(`${API_BASE_URL}/api/books`)
    .then(async (res) => {
      if (!res.ok) {
        const e = await parseError(res);
        throw new Error(e.message);
      }
      return res.json();
    })
    .then(books => renderBookTable(books))
    .catch(err => {
      console.error(err);
      alert(err.message);
      bookTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color:#dc3545;">
            오류: 데이터를 불러올 수 없습니다.
          </td>
        </tr>`;
    })
    .finally(() => showLoading(false));
}

// ===== 렌더링 =====
function renderBookTable(books) {
  bookTableBody.innerHTML = '';
  books.forEach(book => {
    const row = document.createElement('tr');

    const formattedPrice = (book.price ?? null) !== null ? `₩${Number(book.price).toLocaleString()}` : '-';
    const formattedDate = book.publishDate || '-';
    const publisherName = book.publisher && book.publisher.name
      ? book.publisher.name
      : '-';

    row.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.isbn}</td>
      <td>${formattedPrice}</td>
      <td>${formattedDate}</td>
      <td>${publisherName}</td>
      <td>
        <button class="edit-btn" onclick="editBook(${book.id})">수정</button>
        <button class="delete-btn" onclick="deleteBook(${book.id}, '${escapeHtml(book.title)}')">삭제</button>
      </td>
    `;

    bookTableBody.appendChild(row);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}

// ===== 폼 제출 =====
bookForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(bookForm);
  const publisherIdRaw = formData.get('publisherId');

  const bookData = {
    title: (formData.get('title') || '').trim(),
    author: (formData.get('author') || '').trim(),
    isbn: (formData.get('isbn') || '').trim(),
    price: formData.get('price') ? Number(formData.get('price')) : null,
    publishDate: formData.get('publishDate') || null,
    publisherId: publisherIdRaw ? Number(publisherIdRaw) : null,
    detailRequest: {
      description: (formData.get('description') || '').trim(),
      language: (formData.get('language') || '').trim(),
      pageCount: formData.get('pageCount') ? Number(formData.get('pageCount')) : null,
      publisher: (formData.get('publisher') || '').trim(),  // 상세의 출판사명(텍스트)
      coverImageUrl: (formData.get('coverImageUrl') || '').trim(),
      edition: (formData.get('edition') || '').trim()
    }
  };

  if (!validateBook(bookData)) return;

  if (editingBookId) {
    updateBook(editingBookId, bookData);
  } else {
    createBook(bookData);
  }
});

// ===== 클라이언트 유효성 검사 =====
function validateBook(b) {
  if (!b.title) { alert('제목을 입력해주세요.'); return false; }
  if (!b.author) { alert('저자를 입력해주세요.'); return false; }
  if (!b.isbn) { alert('ISBN을 입력해주세요.'); return false; }

  // 백엔드 정규식에 맞춤(숫자/하이픈, 10 또는 13자리 숫자)
  const isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;
  if (!isbnRegex.test(b.isbn)) {
    alert('올바른 ISBN 형식이 아닙니다. (숫자/하이픈, 10 또는 13자리 숫자)');
    return false;
  }

  if (b.price !== null && b.price < 0) {
    alert('가격은 0 이상이어야 합니다.');
    return false;
  }

  if (!b.publisherId) {
    alert('출판사를 선택해주세요.');
    return false;
  }

  if (b.publishDate) {
    const today = todayISO();
    if (b.publishDate > today) {
      alert('출판일은 과거 날짜여야 합니다.');
      return false;
    }
  }

  const d = b.detailRequest;
  if (d.pageCount !== null && d.pageCount < 0) {
    alert('페이지 수는 0 이상이어야 합니다.');
    return false;
  }
  if (d.coverImageUrl && !isValidUrl(d.coverImageUrl)) {
    alert('올바른 이미지 URL 형식이 아닙니다.');
    return false;
  }

  return true;
}

// ===== 생성/수정/삭제 =====
function createBook(bookData) {
  setLoading(true);
  fetch(`${API_BASE_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData)
  })
    .then(async res => {
      if (!res.ok) {
        const e = await parseError(res);
        if (e.status === 400 && e.errors) {
          const msgs = Object.values(e.errors).join('\n');
          throw new Error(`유효성 오류:\n${msgs}`);
        }
        throw new Error(e.message || '도서 등록에 실패했습니다.');
      }
      return res.json();
    })
    .then(() => {
      showSuccess('도서가 성공적으로 등록되었습니다.');
      resetForm();
      loadBooks();
    })
    .catch(err => showError(err.message))
    .finally(() => setLoading(false));
}

function updateBook(bookId, bookData) {
  setLoading(true);
  fetch(`${API_BASE_URL}/api/books/${bookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData)
  })
    .then(async res => {
      if (!res.ok) {
        const e = await parseError(res);
        if (e.status === 400 && e.errors) {
          const msgs = Object.values(e.errors).join('\n');
          throw new Error(`유효성 오류:\n${msgs}`);
        }
        throw new Error(e.message || '도서 수정에 실패했습니다.');
      }
      return res.json();
    })
    .then(() => {
      showSuccess('도서 정보가 성공적으로 수정되었습니다.');
      resetForm();
      loadBooks();
    })
    .catch(err => showError(err.message))
    .finally(() => setLoading(false));
}

function deleteBook(bookId, bookTitle) {
  if (!confirm(`정말로 "${bookTitle}" 도서를 삭제하시겠습니까?`)) return;

  fetch(`${API_BASE_URL}/api/books/${bookId}`, { method: 'DELETE' })
    .then(async res => {
      if (!res.ok) {
        const e = await parseError(res);
        throw new Error(e.message || '도서 삭제에 실패했습니다.');
      }
      alert('도서가 성공적으로 삭제되었습니다.');
      loadBooks();
    })
    .catch(err => alert(err.message));
}

// ===== 편집 =====
function editBook(bookId) {
  setLoading(true);
  fetch(`${API_BASE_URL}/api/books/${bookId}`)
    .then(async res => {
      if (!res.ok) {
        const e = await parseError(res);
        throw new Error(e.message || '도서 정보를 불러오지 못했습니다.');
      }
      return res.json();
    })
    .then(book => {
      // 기본 정보
      bookForm.title.value = book.title ?? '';
      bookForm.author.value = book.author ?? '';
      bookForm.isbn.value = book.isbn ?? '';
      bookForm.price.value = book.price ?? '';
      bookForm.publishDate.value = book.publishDate ?? '';

      // 연결된 출판사
      if (book.publisher && book.publisher.id) {
        publisherSelect.value = book.publisher.id;
      } else {
        // 혹시 응답에 publisher가 없다면 사용자가 직접 선택해야 함
        publisherSelect.value = '';
      }

      // 상세 정보
      if (book.detail) {
        bookForm.description.value = book.detail.description ?? '';
        bookForm.language.value = book.detail.language ?? '';
        bookForm.pageCount.value = book.detail.pageCount ?? '';
        bookForm.publisher.value = book.detail.publisher ?? '';
        bookForm.coverImageUrl.value = book.detail.coverImageUrl ?? '';
        bookForm.edition.value = book.detail.edition ?? '';
      } else {
        bookForm.description.value = '';
        bookForm.language.value = '';
        bookForm.pageCount.value = '';
        bookForm.publisher.value = '';
        bookForm.coverImageUrl.value = '';
        bookForm.edition.value = '';
      }

      editingBookId = bookId;
      submitButton.textContent = '도서 수정';
      cancelButton.style.display = 'inline-block';
      bookForm.scrollIntoView({ behavior: 'smooth' });
    })
    .catch(err => showError(err.message))
    .finally(() => setLoading(false));
}

// ===== 리셋 =====
function resetForm() {
  bookForm.reset();
  editingBookId = null;
  submitButton.textContent = '도서 등록';
  cancelButton.style.display = 'none';
  clearMessages();
}
