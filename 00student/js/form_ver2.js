//전역변수
const API_BASE_URL = "http://localhost:8080";
//현재 Update 중인 학생의 ID
let editingStudentId = null;

//DOM 엘리먼트 가져오기
const studentForm = document.getElementById("studentForm");
const studentTableBody = document.getElementById("studentTableBody");
const submitButton = document.querySelector("button[type='submit']");
const cancelButton = document.querySelector(".cancel-btn");
const formErrorSpan = document.getElementById("formError");

//Document Load 이벤트 처리하기
document.addEventListener("DOMContentLoaded", function () {
    loadStudents();
});

//StudentForm 의 Submit 이벤트 처리하기
studentForm.addEventListener("submit", function (event) {
    //기본으로 설정된 Event가 동작하지 않도록 하기 위함
    event.preventDefault();
    console.log("Form이 제출되었음....");

    //FormData 객체생성 <form>엘리먼트를 객체로 변환
    const stuFormData = new FormData(studentForm);

    //사용자 정의 Student Object Literal 객체생성 (공백 제거 trim())
    const studentData = {
        name: stuFormData.get("name").trim(),
        studentNumber: stuFormData.get("studentNumber").trim(),
        detailRequest: {
            address: stuFormData.get("address").trim(),
            phoneNumber: stuFormData.get("phoneNumber").trim(),
            email: stuFormData.get("email").trim(),
            dateOfBirth: stuFormData.get("dateOfBirth") || null,
        }
    };

    //유효성 체크하는 함수 호출하기
    if (!validateStudent(studentData)) {
        return;
    }

    //유효한 데이터 출력하기
    console.log(studentData);

    //현재 수정중인 학생Id가 있으면 수정처리
    if (editingStudentId) {
        updateStudent(editingStudentId, studentData);
    } else {
        createStudent(studentData);
    }
});

//Student 등록 함수
function createStudent(studentData) {
    // 버튼 비활성화
    submitButton.disabled = true;
    submitButton.textContent = "등록 중...";
    
    fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
    })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    if (response.status === 409) {
                        throw new Error(errorData.message || '중복되는 정보가 있습니다.');
                    } else {
                        throw new Error(errorData.message || '학생 등록에 실패했습니다.');
                    }
                });
            }
            return response.json();
        })
        .then(function(result) {
            showMessage("학생이 성공적으로 등록되었습니다!", "success");
            studentForm.reset();
            loadStudents();
        })
        .catch(function(error) {
            console.log('Error : ', error);
            showMessage(error.message, "error");
        })
        .finally(function() {
            // 버튼 다시 활성화
            submitButton.disabled = false;
            submitButton.textContent = "학생 등록";
        });
}

//Student 삭제 함수
function deleteStudent(studentId, studentName) {
    if (!confirm(`이름 = ${studentName} 학생을 정말로 삭제하시겠습니까?`)) {
        return;
    }
    
    console.log('삭제 처리 중...');
    
    fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: 'DELETE'
    })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    if (response.status === 404) {
                        throw new Error(errorData.message || '존재하지 않는 학생입니다.');
                    } else {
                        throw new Error(errorData.message || '학생 삭제에 실패했습니다.');
                    }
                });
            }
            showMessage("학생이 성공적으로 삭제되었습니다!", "success");
            loadStudents();
        })
        .catch(function(error) {
            console.log('Error : ', error);
            showMessage(error.message, "error");
        });
}

//학생 수정전에 데이터를 로드하는 함수
function editStudent(studentId) {
    fetch(`${API_BASE_URL}/api/students/${studentId}`)
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    if (response.status === 404) {
                        throw new Error(errorData.message || '존재하지 않는 학생입니다.');
                    }
                });
            }
            return response.json();
        })
        .then(function(student) {
            //Form에 데이터 채우기
            studentForm.name.value = student.name;
            studentForm.studentNumber.value = student.studentNumber;
            if (student.detail) {
                studentForm.address.value = student.detail.address;
                studentForm.phoneNumber.value = student.detail.phoneNumber;
                studentForm.email.value = student.detail.email;
                studentForm.dateOfBirth.value = student.detail.dateOfBirth || '';
            }

            //수정 Mode 설정
            editingStudentId = studentId;
            submitButton.textContent = "학생 수정";
            cancelButton.style.display = 'inline-block';
            
            // 첫 번째 입력 필드에 포커스
            studentForm.name.focus();
        })
        .catch(function(error) {
            console.log('Error : ', error);
            showMessage(error.message, "error");
        });
}

//학생 수정을 처리하는 함수
function updateStudent(studentId, studentData) {
    // 버튼 비활성화
    submitButton.disabled = true;
    submitButton.textContent = "수정 중...";
    
    fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
    })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    if (response.status === 409) {
                        throw new Error(`${errorData.message} (에러코드: ${errorData.statusCode})` || '중복되는 정보가 있습니다.');
                    } else {
                        throw new Error(errorData.message || '학생 수정에 실패했습니다.');
                    }
                });
            }
            return response.json();
        })
        .then(function(result) {
            showMessage("학생이 성공적으로 수정되었습니다!", "success");
            resetForm();
            loadStudents();
        })
        .catch(function(error) {
            console.log('Error : ', error);
            showMessage(error.message, "error");
        })
        .finally(function() {
            // 버튼 다시 활성화
            submitButton.disabled = false;
            if (editingStudentId) {
                submitButton.textContent = "학생 수정";
            } else {
                submitButton.textContent = "학생 등록";
            }
        });
}

//입력필드 초기화, 수정모드에서 등록모드로 전환
function resetForm() {
    studentForm.reset();
    editingStudentId = null;
    submitButton.textContent = "학생 등록";
    cancelButton.style.display = 'none';
    hideMessage();
}

//입력항목의 값의 유효성을 체크하는 함수
function validateStudent(student) {
    // 이름 확인
    if (!student.name) {
        showMessage("이름을 입력해주세요.", "error");
        studentForm.name.focus();
        return false;
    }

    // 학번 확인
    if (!student.studentNumber) {
        showMessage("학번을 입력해주세요.", "error");
        studentForm.studentNumber.focus();
        return false;
    }

    // 학번 형식 검사 (영문 1글자 + 숫자 5자리)
    const studentNumberPattern = /^[A-Za-z]\d{5}$/;
    if (!studentNumberPattern.test(student.studentNumber)) {
        showMessage("학번은 영문(1글자) + 숫자(5자리)로 입력해주세요. 예: S12345", "error");
        studentForm.studentNumber.focus();
        return false;
    }

    if (student.detailRequest) {
        const studentDetail = student.detailRequest;
        
        // 주소 확인
        if (!studentDetail.address) {
            showMessage("주소를 입력해주세요.", "error");
            studentForm.address.focus();
            return false;
        }

        // 전화번호 확인
        if (!studentDetail.phoneNumber) {
            showMessage("전화번호를 입력해주세요.", "error");
            studentForm.phoneNumber.focus();
            return false;
        }

        // 전화번호 형식 검사
        const phonePattern = /^[0-9-\s]+$/;
        if (!phonePattern.test(studentDetail.phoneNumber)) {
            showMessage("올바른 전화번호 형식이 아닙니다. 예: 010-1234-5678", "error");
            studentForm.phoneNumber.focus();
            return false;
        }

        // 이메일 확인
        if (!studentDetail.email) {
            showMessage("이메일을 입력해주세요.", "error");
            studentForm.email.focus();
            return false;
        }

        // 이메일 형식 검사
        if (!isValidEmail(studentDetail.email)) {
            showMessage("올바른 이메일 형식이 아닙니다. 예: user@example.com", "error");
            studentForm.email.focus();
            return false;
        }
    }
    return true;
}

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

//Student(학생) 목록을 Load 하는 함수
function loadStudents() {
    console.log("학생 목록 로드 중...");
    
    fetch(`${API_BASE_URL}/api/students`)
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    throw new Error(errorData.message || '학생 목록을 불러올 수 없습니다.');
                });
            }
            return response.json();
        })
        .then(function(students) {
            renderStudentTable(students);
        })
        .catch(function(error) {
            console.log(error);
            showMessage(error.message, "error");
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc3545; padding: 20px;">
                        오류: 데이터를 불러올 수 없습니다.<br>
                        ${error.message}
                    </td>
                </tr>
            `;
        });
}

function renderStudentTable(students) {
    console.log(`${students.length}명의 학생 데이터를 표시합니다.`);
    studentTableBody.innerHTML = "";
    
    if (students.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #666; padding: 20px;">
                    등록된 학생이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    students.forEach(function(student) {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.studentNumber}</td>
            <td>${student.detail ? student.detail.address : "-"}</td>
            <td>${student.detail ? student.detail.phoneNumber : "-"}</td>
            <td>${student.detail ? student.detail.email : "-"}</td>
            <td>${student.detail ? formatDate(student.detail.dateOfBirth) : "-"}</td>
            <td class="action-buttons">
                <button class="edit-btn" onclick="editStudent(${student.id})">수정</button>
                <button class="delete-btn" onclick="deleteStudent(${student.id},'${student.name}')">삭제</button>
            </td>
        `;
        
        studentTableBody.appendChild(row);
    });
}

// 날짜 형식을 보기 좋게 변환
function formatDate(dateString) {
    if (!dateString) return "-";
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    } catch (error) {
        return dateString;
    }
}

// 메시지 표시 함수 (성공/에러 통합)
function showMessage(message, type) {
    formErrorSpan.textContent = message;
    formErrorSpan.style.display = 'block';
    
    if (type === "success") {
        formErrorSpan.style.color = '#28a745';
        formErrorSpan.style.backgroundColor = '#d4edda';
        formErrorSpan.style.borderColor = '#c3e6cb';
    } else {
        formErrorSpan.style.color = '#dc3545';
        formErrorSpan.style.backgroundColor = '#f8d7da';
        formErrorSpan.style.borderColor = '#f5c6cb';
    }
    
    // 3초 후 자동으로 메시지 숨김
    setTimeout(function() {
        hideMessage();
    }, 3000);
}

// 메시지 숨김
function hideMessage() {
    formErrorSpan.style.display = 'none';
    formErrorSpan.style.backgroundColor = '';
    formErrorSpan.style.borderColor = '';
}