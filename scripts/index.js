let questions = null;
let timer;
let timeLeft = 600;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

window.onload = async function() {
    try {
        const response = await axios.get('./data/questions.json');
        questions = response.data.questions;
        renderQuestions();
    } catch (error) {
        console.error('加载题目失败:', error);
        alert('加载题目失败，请刷新页面重试');
    }
};

function startSurvey() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;

    if (!username || !email) {
        alert('请填写用户名和邮箱！');
        return;
    }

    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址！');
        return;
    }

    localStorage.setItem('username', username);
    localStorage.setItem('email', email);

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('quiz-section').style.display = 'block';

    startTimer();
    updateProgress();
    updateAnswerCard();
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('time').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitQuiz();
        }
    }, 1000);
}

function updateProgress() {
    const totalQuestions = questions.singleChoice.length + questions.multipleChoice.length;
    const answeredQuestions = document.querySelectorAll('input:checked').length;
    const progress = (answeredQuestions / totalQuestions) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
}

function showHistory() {
    const historyModal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');

    historyList.innerHTML = history.map(record => `
        <div class="history-item">
            <p>用户名: ${record.username}</p>
            <p>得分: ${record.score}分</p>
            <p>用时: ${record.timeTaken}秒</p>
            <p>时间: ${new Date(record.timestamp).toLocaleString()}</p>
        </div>
    `).join('');

    historyModal.style.display = 'flex';
}

function closeHistory() {
    document.getElementById('history-modal').style.display = 'none';
}

function getBestScore() {
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    if (history.length === 0) return 0;
    return Math.max(...history.map(record => record.score));
}

function renderQuestions() {
    const container = document.querySelector('.question-container');
    container.innerHTML = '';

    questions.singleChoice.forEach((q, index) => {
        container.innerHTML += `
            <div class="question">
                <h3>${index + 1}. ${q.question}</h3>
                <div class="options">
                    ${q.options.map(opt => `
                        <div class="option">
                            <input type="radio" name="${q.id}" value="${opt.value}" id="${q.id}_${opt.value}" onchange="updateProgress()">
                            <label for="${q.id}_${opt.value}">${opt.text}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    questions.multipleChoice.forEach((q, index) => {
        container.innerHTML += `
            <div class="question">
                <h3>${questions.singleChoice.length + index + 1}. ${q.question}（多选）</h3>
                <div class="options">
                    ${q.options.map(opt => `
                        <div class="option">
                            <input type="checkbox" name="${q.id}" value="${opt.value}" id="${q.id}_${opt.value}" onchange="updateProgress()">
                            <label for="${q.id}_${opt.value}">${opt.text}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', () => {
            updateProgress();
            updateAnswerCard();
        });
    });

    renderAnswerCard();
}

function renderAnswerCard() {
    const singleChoiceItems = document.getElementById('single-choice-items');
    const multipleChoiceItems = document.getElementById('multiple-choice-items');
    
    singleChoiceItems.innerHTML = questions.singleChoice.map((q, index) => `
        <div class="question-item" id="card-${q.id}" onclick="scrollToQuestion('${q.id}')">
            ${index + 1}
        </div>
    `).join('');
    
    multipleChoiceItems.innerHTML = questions.multipleChoice.map((q, index) => `
        <div class="question-item" id="card-${q.id}" onclick="scrollToQuestion('${q.id}')">
            ${index + 1}
        </div>
    `).join('');
}

function scrollToQuestion(questionId) {
    const questionElement = document.querySelector(`[name="${questionId}"]`).closest('.question');
    questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateAnswerCard() {
    questions.singleChoice.forEach(q => {
        const answered = document.querySelector(`input[name="${q.id}"]:checked`);
        const cardItem = document.getElementById(`card-${q.id}`);
        if (answered) {
            cardItem.classList.add('answered');
        } else {
            cardItem.classList.remove('answered');
        }
    });

    questions.multipleChoice.forEach(q => {
        const answered = document.querySelectorAll(`input[name="${q.id}"]:checked`).length > 0;
        const cardItem = document.getElementById(`card-${q.id}`);
        if (answered) {
            cardItem.classList.add('answered');
        } else {
            cardItem.classList.remove('answered');
        }
    });
}

function submitQuiz() {
    clearInterval(timer);
    let score = 0;
    const timeTaken = 600 - timeLeft;

    questions.singleChoice.forEach(q => {
        const answer = document.querySelector(`input[name="${q.id}"]:checked`)?.value;
        if (answer === q.correct) score += q.score;
    });

    questions.multipleChoice.forEach(q => {
        const answers = Array.from(document.querySelectorAll(`input[name="${q.id}"]:checked`))
            .map(input => input.value)
            .sort();
        if (arraysEqual(answers, q.correct.sort())) score += q.score;
    });

    const result = {
        username: localStorage.getItem('username'),
        score: score,
        timeTaken: timeTaken,
        timestamp: new Date().toISOString()
    };
    
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    history.push(result);
    localStorage.setItem('quizHistory', JSON.stringify(history));

    document.getElementById('quiz-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('score-display').textContent = `得分：${score}分`;
    document.getElementById('time-taken').textContent = `用时：${timeTaken}秒`;
    document.getElementById('best-score').textContent = `${getBestScore()}分`;
}

function restartQuiz() {
    timeLeft = 600;
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('time').textContent = timeLeft;
    document.getElementById('progress').style.width = '0%';
    
    document.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
    document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}
