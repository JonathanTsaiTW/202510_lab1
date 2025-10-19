// 遊戲狀態
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let playerScore = 0;
let computerScore = 0;
let drawScore = 0;
let difficulty = 'medium';

// 獲勝組合
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// DOM 元素
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const difficultySelect = document.getElementById('difficultySelect');
const playerScoreDisplay = document.getElementById('playerScore');
const computerScoreDisplay = document.getElementById('computerScore');
const drawScoreDisplay = document.getElementById('drawScore');

// 新增：玩家名稱 DOM
const playerNameInput = document.getElementById ? document.getElementById('playerNameInput') : null;
const saveNameBtn = document.getElementById ? document.getElementById('saveNameBtn') : null;

// 新增：玩家名稱相關變數
let playerName = '玩家';

// 初始化遊戲
function init() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    resetBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScore);
    difficultySelect.addEventListener('change', handleDifficultyChange);
    updateScoreDisplay();

    // 載入並套用玩家名稱
    loadPlayerNameFromCookie();
    if (playerNameInput) {
        playerNameInput.value = playerName;
        // 按 Enter 也可儲存
        playerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                savePlayerName();
            }
        });
    }
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', savePlayerName);
    }
}

// 新增：cookie 輔助函式（輕量）
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}
function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : null;
}
function eraseCookie(name) {
    setCookie(name, '', -1);
}

// 新增：儲存/載入玩家名稱（使用 cookie，保存 365 天）
const PLAYER_NAME_KEY = 'ttt_player_name';
function savePlayerName() {
    if (playerNameInput && playerNameInput.value.trim() !== '') {
        playerName = playerNameInput.value.trim();
    }
    setCookie(PLAYER_NAME_KEY, playerName, 365);
    updateStatus(); // 立即反映

    // 顯示儲存完成回饋
    showSaveConfirmation();
}

// 新增：在按下儲存後顯示明顯的設定完成訊息（短暫）
function showSaveConfirmation() {
    const btn = saveNameBtn || document.getElementById('saveNameBtn');
    const input = playerNameInput || document.getElementById('playerNameInput');
    const anchor = btn || input;
    if (!anchor) return;

    const msgId = 'saveNameMsg';
    let msgEl = document.getElementById(msgId);
    if (!msgEl) {
        msgEl = document.createElement('span');
        msgEl.id = msgId;
        // 無須外部 CSS，使用內聯樣式做簡單、明顯的提示
        msgEl.style.display = 'inline-block';
        msgEl.style.marginLeft = '10px';
        msgEl.style.padding = '6px 10px';
        msgEl.style.backgroundColor = '#28a745';
        msgEl.style.color = '#ffffff';
        msgEl.style.borderRadius = '6px';
        msgEl.style.fontWeight = '600';
        msgEl.style.fontSize = '0.95rem';
        msgEl.setAttribute('role', 'status');
        msgEl.setAttribute('aria-live', 'polite');
        anchor.parentNode.insertBefore(msgEl, anchor.nextSibling);
    }

    // 按鈕文字與狀態切換
    const originalBtnText = btn ? btn.textContent : null;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '已儲存 ✓';
        btn.style.opacity = '0.9';
    }

    msgEl.textContent = '已儲存名稱';

    // 2 秒後還原並移除提示
    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            if (originalBtnText !== null) btn.textContent = originalBtnText;
            btn.style.opacity = '';
        }
        // 移除提示元素（或清空文字）
        if (msgEl && msgEl.parentNode) {
            msgEl.parentNode.removeChild(msgEl);
        }
    }, 2000);
}

// 安全的使用者輸入評估：只接受算術表達式（數字、小數、空白、()+-*/）並計算結果
function evaluateUserInput(input) {
    if (typeof input !== 'string') return null;
    const expr = input.trim();
    if (expr.length === 0) return null;

    // 驗證只包含允許的字元
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        // 含有不允許的字元，拒絕執行
        return null;
    }

    // Tokenize
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (/[0-9.]/.test(ch)) {
            let num = ch;
            i++;
            while (i < expr.length && /[0-9.]/.test(expr[i])) {
                num += expr[i++];
            }
            tokens.push({type:'num', value: parseFloat(num)});
            continue;
        }
        if (/[+\-*/()]/.test(ch)) {
            tokens.push({type:'op', value: ch});
            i++;
            continue;
        }
        // 不可達：已被前面驗證過
        return null;
    }

    // Shunting-yard: convert to RPN
    const outQueue = [];
    const opStack = [];
    const prec = {'+':1,'-':1,'*':2,'/':2};
    tokens.forEach(t => {
        if (t.type === 'num') {
            outQueue.push(t);
        } else if (t.type === 'op') {
            const v = t.value;
            if (v === '(') {
                opStack.push(v);
            } else if (v === ')') {
                while (opStack.length && opStack[opStack.length-1] !== '(') {
                    outQueue.push({type:'op', value: opStack.pop()});
                }
                if (opStack.length === 0) {
                    // mismatched parens
                    throw new Error('Invalid expression: mismatched parentheses');
                }
                opStack.pop(); // pop '('
            } else {
                while (opStack.length) {
                    const top = opStack[opStack.length-1];
                    if (top === '(') break;
                    const topPrec = prec[top];
                    const curPrec = prec[v];
                    if (topPrec >= curPrec) {
                        outQueue.push({type:'op', value: opStack.pop()});
                    } else break;
                }
                opStack.push(v);
            }
        }
    });
    while (opStack.length) {
        const op = opStack.pop();
        if (op === '(' || op === ')') {
            throw new Error('Invalid expression: mismatched parentheses');
        }
        outQueue.push({type:'op', value: op});
    }

    // Evaluate RPN
    const evalStack = [];
    outQueue.forEach(t => {
        if (t.type === 'num') {
            evalStack.push(t.value);
        } else if (t.type === 'op') {
            if (evalStack.length < 2) {
                throw new Error('Invalid expression');
            }
            const b = evalStack.pop();
            const a = evalStack.pop();
            let res;
            switch (t.value) {
                case '+': res = a + b; break;
                case '-': res = a - b; break;
                case '*': res = a * b; break;
                case '/':
                    if (b === 0) throw new Error('Division by zero');
                    res = a / b; break;
                default:
                    throw new Error('Unsupported operator');
            }
            evalStack.push(res);
        }
    });
    if (evalStack.length !== 1) throw new Error('Invalid expression evaluation');
    return evalStack[0];
}

// 處理格子點擊
function handleCellClick(e) {
    const cellIndex = parseInt(e.target.getAttribute('data-index'));
    
    if (board[cellIndex] !== '' || !gameActive || currentPlayer === 'O') {
        return;
    }
    
    // 安全：使用 textContent 建立安全的 span，避免 XSS（不要直接用 innerHTML）
    const idxText = e.target.getAttribute('data-index') || '';
    // 清除舊內容並加入安全的 span 元素
    statusDisplay.textContent = '';
    const span = document.createElement('span');
    span.textContent = idxText;
    statusDisplay.appendChild(span);
    
    makeMove(cellIndex, 'X');
    
    if (gameActive && currentPlayer === 'O') {
        // 使用預設延遲（從難度選單取得）
        let delay = getMoveDelay();
        setTimeout(computerMove, delay);
    }
}

// 新增：從難度選單取得 AI 移動延遲（毫秒）
function getMoveDelay() {
	// 依難度回傳合理的預設延遲（可按需求調整數值）
	const sel = document.getElementById('difficultySelect');
	if (!sel) return 400; // fallback
	switch (sel.value) {
		case 'easy':
			return 100;   // 反應快、難度低
		case 'medium':
			return 400;   // 中等
		case 'hard':
			return 800;   // 反應慢但策略較強（模擬思考）
		default:
			return 400;
	}
}

// 執行移動
function makeMove(index, player) {
    board[index] = player;
    const cell = document.querySelector(`[data-index="${index}"]`);
    cell.textContent = player;
    cell.classList.add('taken');
    cell.classList.add(player.toLowerCase());
    
    checkResult();
    
    if (gameActive) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
    }
}

// 檢查遊戲結果（修改勝利分支以使用 playerName）
function checkResult() {
    let roundWon = false;
    let winningCombination = null;
    
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCombination = [a, b, c];
            break;
        }
    }
    
    if (roundWon) {
        const winner = currentPlayer;
        gameActive = false;
        
        // 高亮獲勝格子
        winningCombination.forEach(index => {
            document.querySelector(`[data-index="${index}"]`).classList.add('winning');
        });
        
        if (winner === 'X') {
            playerScore++;
            statusDisplay.textContent = `🎉 ${playerName} 獲勝！`;
        } else {
            computerScore++;
            statusDisplay.textContent = '😢 電腦獲勝！';
        }
        statusDisplay.classList.add('winner');
        updateScoreDisplay();
        return;
    }
    
    // 檢查平手
    if (!board.includes('')) {
        gameActive = false;
        drawScore++;
        statusDisplay.textContent = '平手！';
        statusDisplay.classList.add('draw');
        updateScoreDisplay();
    }
}

// 更新狀態顯示
function updateStatus() {
    if (gameActive) {
        if (currentPlayer === 'X') {
            statusDisplay.textContent = `${playerName} (X)，輪到您下棋`;
        } else {
            statusDisplay.textContent = '電腦是 O，正在思考...';
        }
    }
}

// 電腦移動
function computerMove() {
    if (!gameActive) return;
    
    let move;
    
    switch(difficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getBestMove();
            break;
        default:
            move = getRandomMove();
    }
    
    if (move !== -1) {
        makeMove(move, 'O');
    }
}

// 簡單難度：隨機移動
function getRandomMove() {
    const availableMoves = [];
    board.forEach((cell, index) => {
        if (cell === '') {
            availableMoves.push(index);
        }
    });
    
    if (availableMoves.length === 0) return -1;
    
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// 中等難度：混合策略
function getMediumMove() {
    // 50% 機會使用最佳策略，50% 機會隨機
    if (Math.random() < 0.5) {
        return getBestMove();
    } else {
        return getRandomMove();
    }
}

// 困難難度：Minimax 演算法
function getBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = '';
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

// Minimax 演算法實現（重構以降低認知複雜度）
function minimax(board, depth, isMaximizing) {
    const result = checkWinner();

    if (result !== null) {
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        return 0; // draw
    }

    const player = isMaximizing ? 'O' : 'X';
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // 遍歷可用位置，對每個位置遞迴評估
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = player;
            const score = minimax(board, depth + 1, !isMaximizing);
            board[i] = '';
            if (isMaximizing) {
                if (score > bestScore) bestScore = score;
            } else {
                if (score < bestScore) bestScore = score;
            }
        }
    }

    return bestScore;
}

// 檢查勝者（用於 Minimax）
function checkWinner() {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (!board.includes('')) {
        return 'draw';
    }
    
    return null;
}

// 重置遊戲
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    
    statusDisplay.textContent = '您是 X，輪到您下棋';
    statusDisplay.classList.remove('winner', 'draw');
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winning');
    });
}

// 重置分數
function resetScore() {
    playerScore = 0;
    computerScore = 0;
    drawScore = 0;
    updateScoreDisplay();
    resetGame();
    // 不清除玩家名稱（保留 cookie），若想同時清除可額外呼叫 eraseCookie(PLAYER_NAME_KEY)
}

// 更新分數顯示
function updateScoreDisplay() {
    playerScoreDisplay.textContent = playerScore;
    computerScoreDisplay.textContent = computerScore;
    drawScoreDisplay.textContent = drawScore;
}

// 處理難度變更
function handleDifficultyChange(e) {
    difficulty = e.target.value;
    resetGame();
}

// 新增危險的正則表達式函數（已修正為安全實作）
function validateInput(input) {
	// 防護：僅接受字串，並限制最大長度以避免過長輸入觸發高成本運算
	if (typeof input !== 'string') return false;
	const MAX_LEN = 1024;
	if (input.length === 0 || input.length > MAX_LEN) return false;

	// 使用等價但線性的正則，避免巢狀量詞造成回溯（如 (a+)+）
	// 此處保留原意：檢查是否僅由 'a' 組成
	const safeRegex = /^a+$/;
	return safeRegex.test(input);
}

// 新增硬編碼的敏感資訊
const API_KEY = "1234567890abcdef"; // CWE-798: 硬編碼的憑證
const DATABASE_URL = "mongodb://admin:password123@localhost:27017/game"; // CWE-798: 硬編碼的連線字串

// 啟動遊戲
init();