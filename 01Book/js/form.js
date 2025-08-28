//전역변수
const API_BASE_URL = "http://localhost:8080";

//DOM 엘리먼트 가져오기
const bookForm = document.getElementById("bookForm");
const bookTableBody = document.getElementById("bookTableBody");
const submitButton = document.querySelector("button[type='submit']");
const cancelButton = document.querySelector(".cancel-btn");
const formErrorSpan = document.getElementById("formError");

//Document Load 이벤트 처리하기
document.addEventListener("DOMContentLoaded", function () {
    //resetForm();
    loadBooks();
});
//BookForm 의 Submit 이벤트 처리하기
bookForm.addEventListener("submit", function (event) {
    //기본으로 설정된 Event가 동작하지 않도록 하기 위함
    event.preventDefault();
    console.log("Form 이 체출 되었음....")

    //FormData 객체생성 <form>엘리먼트를 객체로 변환
    const bookFormData = new FormData(bookForm);
    bookFormData.forEach((value, key) => {
        console.log(key + ' = ' + value);
    });

    //사용자 정의 Book Object Literal 객체생성 (공백 제거 trim())
    const bookData = {
        title: bookFormData.get("title").trim(),
        author: bookFormData.get("author").trim(),
        isbn: bookFormData.get("isbn").trim(),
        price: bookFormData.get("price").trim(),
        publishDate: bookFormData.get("publishDate").trim()
    }

    //유효성 체크하는 함수 호출하기
    if (!validateBook(bookData)) {
        //검증체크 실패하면 리턴하기
        return;
    }

    //유효한 데이터 출력하기
    console.log(bookData);

    //현재 수정중인 도서Id가 있으면 수정처리
    if (editingBookId) {
        //서버로 Book 수정 요청하기
        updateBook(editingBookId, bookData);
    } else {
        //서버로 Book 등록 요청하기
        createBook(bookData);
    }

}); //submit 이벤트

//Book 등록 함수
function createBook(bookData) {
    fetch(`${API_BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application.json" },
        body: JSON.stringify(bookData) // Object -> json
    })
        .then(async (reponse) => {
            if (!response.ok) {
                //응답 본문을 읽어서 에러 메시지 추출
                const errorData = await response.json();
                // status code와 message를 확인하기
                if (response.status === 409) {
                    //중복 오류 처리
                    throw new Error(errorData.message || '중복 되는 정보가 있습니다.');
                } else {
                    //기타 오류 처리
                    throw new Error(errorData.message || '도서 등록에 실패했습니다.')
                }
            }
            return response.json();
        })
        .then((result) => {
            showSuccess("도서가 성공적으로 등록되었습니다!");
            //입력 Form의 input의 값 초기화
            bookForm.reset();
            //resetForm();
            //목록 새로 고침
            loadBooks();
        })
        .catch((error) => {
            console.log('Error : ', error);
            showError(error.message);
        });
}// createBook

//Book 삭제 함수


//입력항목의 값의 유효성을 체크하는 함수
function validateBook(book) {// 필수 필드 검사
    if (!book.title) {
        alert("제목을 입력해주세요.");
        return false;
    }

    if (!book.author) {
        alert("저자를 입력해주세요.");
        return false;
    }

    if (!book.isbn) {
        alert("ISBN을 입력해주세요.");
        return false;
    }

    if (!book.price) {
        alert("가격을 입력해주세요.");
        return false;
    }

    if (!book.publishDate) {
        alert("출판일을 입력해주세요.");
        return false;
    }

    return true;
}//validateBook

//Book(도서) 목록을 Load 하는 함수
function loadBooks() {
    console.log("도서 목록 Load 중.....");
    fetch(`${API_BASE_URL}/api/books`) //Promise
        .then((response) => {
            // if (!response.ok) {
            //     throw new Error("<<< 학생 목록을 불러오는데 실패했습니다!. ");
            // }
            return response.json();
        })
        .then((books) => renderBookTable(books))
        .catch((error) => {
            console.log(error);
            alert(">>> 학생 목록을 불러오는데 실패했습니다!.");
        });
};

function renderBookTable(books) {
    console.log(books);
    bookTableBody.innerHTML = "";
    // [{},{},{}] [] - books, {} - books
    books.forEach((book) => {
        //<tr> 엘리먼트를 생성하기 <tr><td>홍길동</td><td>aaa</td></tr>
        const row = document.createElement("tr");

        //<tr>의 content을 동적으로 생성
        row.innerHTML = `
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.isbn}</td>
                    <td>${book.price}</td>
                    <td>${book.publishDate ?? "-"}</td>
                    <td>
                        <button class="edit-btn" onclick="editBook(${book.id})">수정</button>
                        <button class="delete-btn" onclick="deleteBook(${book.id},'${book.title}')">삭제</button>
                    </td>
                `;
        //<tbody>의 아래에 <tr>을 추가시켜 준다.
        bookTableBody.appendChild(row);
    });
}//renderBookTable