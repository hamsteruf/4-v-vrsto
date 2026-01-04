// Glavna igra
class FourInARow {
    constructor() {
        this.boardSize = 5;
        this.board = [];
        this.currentPlayer = 'o'; // 'o' ali 'x'
        this.blocked = []; // Zapolnjena polja
        this.gameOver = false;
        this.history = [];
        this.winningCells = [];
        this.rotationAngle = 0;
        this.scores = { o: 0, x: 0 };
        this.aiEnabled = false;
        this.aiPlayer = 'x';
        this.aiDifficulty = 'medium';
        this.aiVsAi = false; // Računalnik protiv računalnika
        this.dynamicDifficulty = false; // Naraščajoča težavnost
        this.movesCount = 0; // Šteje poteze za naraščajočo težavnost
        this.noWinUntilMove = 0; // Zadrži zmago za prvi 2 potezi po razširitvi
        this.oldAreaBounds = { minRow: 0, maxRow: 4, minCol: 0, maxCol: 4 }; // Stari 5x5 del
        
        this.initBoard();
    }

    initBoard() {
        this.board = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(null)
        );
        this.blocked = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(false)
        );
        this.renderBoard();
    }

    makeMove(row, col) {
        if (this.gameOver || !this.isValidMove(row, col)) return false;

        // Uporabi gravitacijo - polje pada navzdol
        row = this.applyGravity(row, col);
        if (row === -1) return false; // Stolpec je poln

        // Štej poteze za naraščajočo težavnost
        this.movesCount++;

        // Shrani v zgodovino
        this.history.push({
            board: this.board.map(r => [...r]),
            blocked: this.blocked.map(r => [...r]),
            player: this.currentPlayer,
            boardSize: this.boardSize,
            rotationAngle: this.rotationAngle,
            scores: { ...this.scores },
            winningCells: [...this.winningCells]
        });

        // Naredi potezo
        this.board[row][col] = this.currentPlayer;

        // Preveri zmago (če se ne nahajamo v zadrževalnem obdobju)
        let winResult = null;
        if (this.noWinUntilMove > 0) {
            // V zadrževalnem obdobju - preveri zmago in prepreči jo
            winResult = this.checkWin(row, col);
            if (winResult) {
                // Odvzemi potezo - to ne sme biti dovolj
                this.board[row][col] = null;
                this.showMessage(`Ta poteza bi dala zmago, kar ni dovoljeno! Poskusi drugače.`, 'error');
                this.history.pop(); // Odstrani iz zgodovine
                return false;
            }
            this.noWinUntilMove--;
        } else {
            winResult = this.checkWin(row, col);
        }
        
        if (winResult) {
            this.winningCells = winResult.cells;
            this.scores[this.currentPlayer]++;
            
            // Zapolni zmagovalna polja
            winResult.cells.forEach(cell => {
                this.blocked[cell.r][cell.c] = true;
            });
            
            this.showMessage(`Igralec ${this.currentPlayer.toUpperCase()} je zmaga! +1 točka`, 'win');
            
            // Preveri ali je polje polno - samo razširi, ne obrni
            if (this.isBoardFull()) {
                setTimeout(() => this.expandBoard(false, false), 2000);
            } else {
                // Igra se nadaljuje, zamenjaj igralca
                this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
                this.renderBoard();
                
                // AI poteza
                if (this.aiEnabled) {
                    if (this.aiVsAi) {
                        const delay = 100;
                        setTimeout(() => this.makeAIMove(), delay);
                    } else if (this.currentPlayer === this.aiPlayer) {
                        const delay = 300;
                        setTimeout(() => this.makeAIMove(), delay);
                    }
                }
            }
            return true;
        }

        // Preveri izenačenje
        if (this.isBoardFull()) {
            this.showMessage('Izenačenje! Polje se razširja in obrne...', 'tie');
            setTimeout(() => this.expandBoard(true, true), 1500);
            return true;
        }

        // Zamenjaj igralca
        this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
        this.renderBoard();
        
        // AI poteza
        if (this.aiEnabled) {
            if (this.aiVsAi) {
                // V AI vs AI, oba sta AI - vedno naredi potezo
                const delay = 100;
                setTimeout(() => this.makeAIMove(), delay);
            } else if (this.currentPlayer === this.aiPlayer) {
                // V PvC, samo ko je red AIja
                const delay = 300;
                setTimeout(() => this.makeAIMove(), delay);
            }
        }
        
        return true;
    }

    applyGravity(row, col) {
        // Iskalnik od kliknjene vrste NAVZDOL (ne čez ves stolpec)
        // Poišči prvo polno mesto POD kliknjeno vrsto
        for (let r = row + 1; r < this.boardSize; r++) {
            if (this.board[r][col] !== null || this.blocked[r][col]) {
                // Našli smo polno mesto, vrni mesto en red nad njim
                if (r - 1 >= row) {
                    return r - 1;
                }
                return -1; // Ni prostora nad njim (je takoj pod klikom)
            }
        }
        // Ni nobenega polnega mesta pod klikom, postavi na dno plošče
        return this.boardSize - 1;
    }

    rotateBoardClockwise(board, size) {
        // Rotira 2D niz za 90° v smeri urinega kazalca
        // Novo polje: novi[col][size-1-red] = stari[red][col]
        const rotated = Array(size).fill(null).map(() => 
            Array(size).fill(null)
        );
        
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                rotated[c][size - 1 - r] = board[r][c];
            }
        }
        
        return rotated;
    }

    isValidMove(row, col) {
        // Preveri ali je stolpec vsaj malo prosto
        if (col < 0 || col >= this.boardSize) return false;
        
        // Preverimo ali obstaja kakšno prosto mesto v tem stolpcu
        for (let r = 0; r < this.boardSize; r++) {
            if (this.board[r][col] === null && !this.blocked[r][col]) {
                return true;
            }
        }
        return false;
    }

    checkWin(row, col) {
        const player = this.board[row][col];
        const directions = [
            { dr: 0, dc: 1 },   // Vodoravno
            { dr: 1, dc: 0 },   // Navpično
            { dr: 1, dc: 1 },   // Diagonalno /
            { dr: 1, dc: -1 }   // Diagonalno \
        ];

        for (let dir of directions) {
            const cells = [{ r: row, c: col }];
            
            // Naprej
            for (let i = 1; i < 4; i++) {
                const r = row + dir.dr * i;
                const c = col + dir.dc * i;
                if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                    this.board[r][c] === player && !this.blocked[r][c]) {
                    cells.push({ r, c });
                } else break;
            }

            // Nazaj
            for (let i = 1; i < 4; i++) {
                const r = row - dir.dr * i;
                const c = col - dir.dc * i;
                if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                    this.board[r][c] === player && !this.blocked[r][c]) {
                    cells.unshift({ r, c });
                } else break;
            }

            if (cells.length >= 4) {
                // Vrni le prve 4 celice
                return { player, cells: cells.slice(0, 4) };
            }
        }

        return null;
    }

    isBoardFull() {
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === null && !this.blocked[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    expandBoard(shouldRotate = false, showMessage = true) {
        const oldSize = this.boardSize;
        this.boardSize += 4; // Povečaj za 2 na vsaki strani (skupno 4)

        // Ustvari novo prazno ploščo
        const newBoard = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(null)
        );
        const newBlocked = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(false)
        );

        // Če je izenačenje, rotira stara polja za 90° v smeri urinega kazalca
        let boardToUse = this.board;
        let blockedToUse = this.blocked;
        
        if (shouldRotate) {
            boardToUse = this.rotateBoardClockwise(this.board, oldSize);
            blockedToUse = this.rotateBoardClockwise(this.blocked, oldSize);
            this.rotationAngle = (this.rotationAngle + 90) % 360;
        }

        // Kopiraj stare podatke v sredino (offset: 2 kvadratka na stran)
        const offset = 2;
        for (let r = 0; r < oldSize; r++) {
            for (let c = 0; c < oldSize; c++) {
                // Kopiraj znake
                newBoard[r + offset][c + offset] = boardToUse[r][c];
                // Kopiraj status zapolnjenosti
                newBlocked[r + offset][c + offset] = blockedToUse[r][c];
            }
        }

        this.board = newBoard;
        this.blocked = newBlocked;
        // NE brisanje winningCells - ohrani jih za prikaz
        this.currentPlayer = 'o';
        this.history = [];
        this.noWinUntilMove = 2; // Zadrži zmago za prvi 2 potezi po razširitvi
        this.movesCount = 0; // Resetiraj brojanje potez za novo povečanje
        
        // Posodobi meje starega območja
        this.oldAreaBounds = {
            minRow: offset,
            maxRow: offset + oldSize - 1,
            minCol: offset,
            maxCol: offset + oldSize - 1
        };
        
        // Počisti stare SVG črte
        const grid = document.getElementById('gameBoard');
        if (grid) {
            const oldSvgs = grid.querySelectorAll('svg');
            oldSvgs.forEach(svg => svg.remove());
        }
        
        if (showMessage) {
            this.showMessage(`Polje je razširjeno na ${this.boardSize}x${this.boardSize}! Nova igra.`, 'tie');
        }
        
        this.renderBoard();
        
        // AI poteza
        if (this.aiEnabled && this.currentPlayer === this.aiPlayer) {
            setTimeout(() => this.makeAIMove(), 800);
        }
    }

    rotateBoard() {
        // Obrni ploščo za 90 stopinj v smeri urinega kazalca
        const newBoard = Array(this.boardSize).fill(null).map(() => 
            Array(this.boardSize).fill(null)
        );

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                // Rotacija: new[c][size-1-r] = old[r][c]
                newBoard[c][this.boardSize - 1 - r] = this.board[r][c];
            }
        }

        this.board = newBoard;
        this.rotationAngle += 90;
        this.gameOver = false;
        this.currentPlayer = 'o';
        this.history = [];
        
        this.showMessage('Ploča se je vrtela za 90°!', 'rotating');
        
        // Animiraj rotacijo
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.classList.add('rotating-board');
        setTimeout(() => gameBoard.classList.remove('rotating-board'), 600);
        
        this.renderBoard();
    }

    renderBoard() {
        const boardContainer = document.getElementById('gameBoard');
        boardContainer.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'board-grid';
        grid.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        grid.style.position = 'relative';

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `cell-${r}-${c}`;
                
                const value = this.board[r][c];
                if (value) {
                    cell.textContent = value.toUpperCase();
                    cell.classList.add(value);
                }

                // Preveri ali je zapolnjeno (kot del zmage)
                if (this.blocked[r][c] && value) {
                    cell.classList.add('blocked');
                    // Ne dovoli klikanja na zapolnjene znake
                } else if (!value && !this.blocked[r][c]) {
                    // Samo prazna neblokirana polja dovolijo klikanje
                    cell.onclick = () => this.makeMove(r, c);
                }

                // Preveri ali je v zmagovalni kombinaciji
                const isWinning = this.winningCells.some(w => w.r === r && w.c === c);
                if (isWinning) {
                    cell.classList.add('winning');
                }

                grid.appendChild(cell);
            }
        }

        boardContainer.appendChild(grid);
        
        this.updateInfo();
        this.updateUndoBtn();
    }

    updateInfo() {
        document.getElementById('boardSize').textContent = `${this.boardSize}x${this.boardSize}`;
        this.updateDifficultyDisplay();
        document.getElementById('scoreO').textContent = this.scores.o;
        document.getElementById('scoreX').textContent = this.scores.x;
        
        const playerSpan = document.querySelector('#currentPlayer');
        if (this.gameOver) {
            playerSpan.innerHTML = 'Igra končana!';
        } else {
            const playerClass = this.currentPlayer === 'o' ? 'player-o' : 'player-x';
            playerSpan.innerHTML = `Na vrsti: <span class="${playerClass}">${this.currentPlayer.toUpperCase()}</span>`;
        }
    }

    updateUndoBtn() {
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.disabled = this.history.length === 0;
    }

    updateDifficultyDisplay() {
        const diffDisplay = document.getElementById('difficultyDisplay');
        if (!diffDisplay) return;
        
        if (!this.aiEnabled) {
            diffDisplay.textContent = '';
            return;
        }
        
        let diffText = '';
        if (this.aiVsAi || (this.aiPlayer === 'x' && this.aiEnabled)) {
            // Prikazi čemu igramo nasprotno
            let difficulty = this.aiDifficulty;
            
            if (this.dynamicDifficulty) {
                // Prikaži trenutno razino naraščajočne težavnosti
                if (this.movesCount < 3) {
                    diffText = 'Nasprotnik: Lahka (❶)';
                } else if (this.movesCount < 8) {
                    diffText = 'Nasprotnik: Srednja (❷)';
                } else {
                    diffText = 'Nasprotnik: Težka (❸)';
                }
            } else {
                const labels = {
                    'easy': 'Lahka 🟢',
                    'medium': 'Srednja 🟡',
                    'hard': 'Težka 🔴'
                };
                diffText = 'Nasprotnik: ' + (labels[difficulty] || difficulty);
            }
        }
        
        diffDisplay.textContent = diffText;
    }

    undo() {
        if (this.history.length === 0) return;

        const previous = this.history.pop();
        this.board = previous.board;
        this.blocked = previous.blocked;
        this.currentPlayer = previous.player;
        this.boardSize = previous.boardSize;
        this.rotationAngle = previous.rotationAngle;
        this.scores = previous.scores;
        this.winningCells = previous.winningCells;

        this.renderBoard();
        this.clearMessage();
    }

    showMessage(text, type = '') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = 'message ' + type;
    }

    clearMessage() {
        const messageEl = document.getElementById('message');
        messageEl.textContent = '';
        messageEl.className = 'message';
    }

    reset() {
        console.log('reset() poklican');
        this.boardSize = 5;
        this.board = [];
        this.blocked = [];
        this.currentPlayer = 'o';
        this.gameOver = false;
        this.history = [];
        this.winningCells = [];
        this.rotationAngle = 0;
        this.scores = { o: 0, x: 0 };
        this.noWinUntilMove = 0;
        this.oldAreaBounds = { minRow: 0, maxRow: 4, minCol: 0, maxCol: 4 };
        this.movesCount = 0;
        this.dynamicDifficulty = false;
        this.aiEnabled = false;
        this.aiVsAi = false;
        this.aiPlayer = 'x';
        this.aiDifficulty = 'medium';
        console.log('reset() dovršen - currentPlayer=' + this.currentPlayer);
        this.clearMessage();
        this.initBoard();
    }

    makeAIMove() {
        console.log('makeAIMove() poklican - currentPlayer=' + this.currentPlayer + ', aiPlayer=' + this.aiPlayer);
        if (this.currentPlayer !== this.aiPlayer) {
            console.log('Ni AI poteza - trenutni: ' + this.currentPlayer + ', AI: ' + this.aiPlayer);
            return;
        }

        let result = { col: -1, reason: '' };
        let currentDifficulty = this.aiDifficulty;
        
        // Naraščajoča težavnost
        if (this.dynamicDifficulty) {
            if (this.movesCount < 3) {
                currentDifficulty = 'easy';
            } else if (this.movesCount < 8) {
                currentDifficulty = 'medium';
            } else {
                currentDifficulty = 'hard';
            }
        }
        
        if (currentDifficulty === 'easy') {
            result = this.getEasyAIMove();
        } else if (currentDifficulty === 'medium') {
            result = this.getMediumAIMove();
        } else {
            result = this.getHardAIMove();
        }

        console.log('AI poteža: stolpec=' + result.col + ', težavnost=' + currentDifficulty);

        if (result.col !== -1) {
            console.log('Pozivam makeMove(0, ' + result.col + ')');
            this.makeMove(0, result.col);
        } else {
            console.log('Neveljavna poteza - stolpec=-1');
        }
    }

    getEasyAIMove() {
        const col = this.getRandomValidMove();
        console.log('Easy AI: naključni stolpec=' + col);
        return { col: col, reason: '' };
    }

    showAIComment(reason = '') {
        // Funkcija je odstranjena
    }

    getMediumAIMove() {
        console.log('Medium AI: preverjam zmago...');
        // Prvo preveri zmago
        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                const row = this.applyGravity(0, c);
                if (row === -1) continue;
                
                this.board[row][c] = this.aiPlayer;
                if (this.checkWin(row, c)) {
                    this.board[row][c] = null;
                    console.log('Medium AI: našel zmago na stolpcu ' + c);
                    return { col: c, reason: 'Zmaga! Prepričan sem bil...' };
                }
                this.board[row][c] = null;
            }
        }

        console.log('Medium AI: preverjam nasprotnika...');
        // Nato preveri nasprotnikov zmago
        const opponent = this.aiPlayer === 'o' ? 'x' : 'o';
        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                const row = this.applyGravity(0, c);
                if (row === -1) continue;
                
                this.board[row][c] = opponent;
                if (this.checkWin(row, c)) {
                    this.board[row][c] = null;
                    console.log('Medium AI: blokiral zmago na stolpcu ' + c);
                    return { col: c, reason: 'Blokiral sem tvojo zmago!' };
                }
                this.board[row][c] = null;
            }
        }

        console.log('Medium AI: izbira sredino...');
        // Tretje: preferira sredino (bolji položaj)
        const center = Math.floor(this.boardSize / 2);
        if (this.isValidMove(0, center)) {
            console.log('Medium AI: izbira sredino ' + center);
            return { col: center, reason: 'Dobra strateška pozicija!' };
        }

        console.log('Medium AI: izbira naključno...');
        // Sicer izberi naključno
        return { col: this.getRandomValidMove(), reason: 'Hm, poglejmo kaj se zgodi...' };
    }

    getHardAIMove() {
        // Prvo preveri zmago
        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                const row = this.applyGravity(0, c);
                if (row === -1) continue;
                
                this.board[row][c] = this.aiPlayer;
                if (this.checkWin(row, c)) {
                    this.board[row][c] = null;
                    return { col: c, reason: 'Zmaga! Odličnih štiri v vrsti!' };
                }
                this.board[row][c] = null;
            }
        }

        // Nato preveri nasprotnikov zmago
        const opponent = this.aiPlayer === 'o' ? 'x' : 'o';
        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                const row = this.applyGravity(0, c);
                if (row === -1) continue;
                
                this.board[row][c] = opponent;
                if (this.checkWin(row, c)) {
                    this.board[row][c] = null;
                    return { col: c, reason: 'Dobro, da sem to blokiral!' };
                }
                this.board[row][c] = null;
            }
        }

        // Tretje: Analiza pozicije za boljše poteze
        let bestScore = -Infinity;
        let bestColumn = -1;
        let maxLineLength = 0;
        let blockedLine = false;

        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                const row = this.applyGravity(0, c);
                if (row === -1) continue;
                
                this.board[row][c] = this.aiPlayer;
                const score = this.evaluatePosition(row, c, this.aiPlayer);
                const aiLineLength = this.countLineLength(row, c, this.aiPlayer);
                const oppLineLength = this.countLineLength(row, c, opponent);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestColumn = c;
                    maxLineLength = aiLineLength;
                    blockedLine = oppLineLength >= 3;
                }
                
                this.board[row][c] = null;
            }
        }

        if (bestColumn !== -1) {
            let reason = 'Kot da bi znala kaj delam...';
            
            if (maxLineLength >= 3) {
                reason = 'Tri v vrsti! Še ena in...';
            } else if (blockedLine) {
                reason = 'Preprečujem tvojo linijo!';
            } else if (maxLineLength === 2) {
                reason = 'Zanimiva pozicija!';
            } else {
                reason = 'Strateško razmišljam...';
            }
            
            return { col: bestColumn, reason: reason };
        }

        // Ako sve ostalo ne radi, idi u sredinu
        const center = Math.floor(this.boardSize / 2);
        if (this.isValidMove(0, center)) {
            return { col: center, reason: 'Sredina je vedno dobra!' };
        }

        return { col: this.getRandomValidMove(), reason: 'Kar neki...' };
    }

    evaluatePosition(row, col, player) {
        let score = 0;
        const opponent = player === 'o' ? 'x' : 'o';

        // Vrednost blizine centru
        const center = Math.floor(this.boardSize / 2);
        score += Math.abs(col - center) * -5;

        // Provera linija od 3 (skoro pobeda)
        score += this.countLineLength(row, col, player) * 10;
        score -= this.countLineLength(row, col, opponent) * 8;

        return score;
    }

    countLineLength(row, col, player) {
        const directions = [
            { dr: 0, dc: 1 },  // Horizontalno
            { dr: 1, dc: 0 },  // Vertikalno
            { dr: 1, dc: 1 },  // Dijagonalno /
            { dr: 1, dc: -1 }  // Dijagonalno \
        ];

        let maxLength = 0;

        for (const dir of directions) {
            let length = 1;
            // Išlezi u jednom smjeru
            for (let i = 1; i < 4; i++) {
                const r = row + dir.dr * i;
                const c = col + dir.dc * i;
                if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                    this.board[r][c] === player && !this.blocked[r][c]) {
                    length++;
                } else break;
            }
            // Išlezi u drugom smjeru
            for (let i = 1; i < 4; i++) {
                const r = row - dir.dr * i;
                const c = col - dir.dc * i;
                if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                    this.board[r][c] === player && !this.blocked[r][c]) {
                    length++;
                } else break;
            }
            maxLength = Math.max(maxLength, length);
        }

        return maxLength;
    }

    setAI(enabled, difficulty = 'medium', aiVsAi = false) {
        console.log('setAI: enabled=' + enabled + ', difficulty=' + difficulty + ', aiVsAi=' + aiVsAi);
        this.aiEnabled = enabled;
        this.aiDifficulty = difficulty;
        this.aiVsAi = aiVsAi;
        this.movesCount = 0;
        
        // Naraščajoča težavnost se začne kot "easy"
        if (difficulty === 'dynamic') {
            this.dynamicDifficulty = true;
            this.aiDifficulty = 'easy';
        }
        
        if (enabled) {
            if (aiVsAi) {
                // Oba sta računalnika - 'o' je prvi, ker se igra začne z 'o'
                this.aiPlayer = 'o';
                console.log('AI vs AI: aiPlayer=o, currentPlayer=' + this.currentPlayer);
            } else {
                // Samo en je računalnik - 'x'
                this.aiPlayer = 'x';
                console.log('PvC: aiPlayer=x, currentPlayer=' + this.currentPlayer);
            }
            
            if (this.currentPlayer === this.aiPlayer) {
                const delay = this.aiVsAi ? 100 : 300;
                console.log('Pokrećem prvi AI poteza nakon ' + delay + 'ms');
                setTimeout(() => this.makeAIMove(), delay);
            } else {
                console.log('currentPlayer !== aiPlayer, čekam na igrača');
            }
        }
    }

    getRandomValidMove() {
        const validMoves = [];
        for (let c = 0; c < this.boardSize; c++) {
            if (this.isValidMove(0, c)) {
                validMoves.push(c);
            }
        }
        const col = validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : -1;
        console.log('Random valid moves: ' + validMoves.length + ', izbran: ' + col);
        return col;
    }
}

// Globalna instanca igre
let game;

// Inicijalizacija
function initGame() {
    game = new FourInARow();
    // Na začetku prikaži meni
    showGameMode();
}

function showGame() {
    console.log('showGame poklican');
    try {
        const modeSelect = document.getElementById('modeSelect');
        const difficultySelect = document.getElementById('difficultySelect');
        const gameContainer = document.getElementById('gameContainer');
        console.log('modeSelect:', modeSelect);
        console.log('gameContainer:', gameContainer);
        if (modeSelect) modeSelect.style.display = 'none';
        if (difficultySelect) difficultySelect.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'block';
        console.log('Display spremenjen');
        // Osvježi prikaz ploče
        if (game) game.renderBoard();
    } catch(e) {
        console.error('Napaka v showGame:', e);
    }
}

function showGameMode() {
    document.getElementById('modeSelect').style.display = 'block';
    document.getElementById('difficultySelect').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
}

function backToMenu() {
    showGameMode();
}

function resetGame() {
    game.reset();
    showGame();
}

function undoMove() {
    game.undo();
}

function startAIGame(difficulty) {
    game.reset();
    game.setAI(true, difficulty);
    showGame();
}

function startPvPGame() {
    console.log('startPvPGame klican');
    try {
        game.reset();
        console.log('game reset');
        game.setAI(false);
        console.log('AI disabled');
        showGame();
        console.log('showGame poklican');
    } catch(e) {
        console.error('Napaka v startPvPGame:', e);
    }
}

// Zaženi igro pri nalaganju
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event');
    initGame();
    
    // Glavni meni - izbira tipa igre
    const pvpBtn = document.getElementById('pvpBtn');
    const pvcBtn = document.getElementById('pvcBtn');
    const aiaiBtn = document.getElementById('aiaiBtn');
    
    if (pvpBtn) {
        pvpBtn.addEventListener('click', () => {
            game.reset();
            game.setAI(false);
            showGame();
        });
    }
    
    if (pvcBtn) {
        pvcBtn.addEventListener('click', () => {
            showDifficultySelect(false); // Igralec vs Računalnik
        });
    }
    
    if (aiaiBtn) {
        aiaiBtn.addEventListener('click', () => {
            showDifficultySelect(true); // Računalnik vs Računalnik
        });
    }
    
    // Težavnost
    const diffBtns = document.querySelectorAll('#difficultySelect .mode-btn:not(.back-btn)');
    const backBtn = document.querySelector('#difficultySelect .back-btn');
    
    diffBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            game.reset();
            
            if (index === 0) { // Easy
                game.setAI(true, 'easy', pvcAiVsAi);
            } else if (index === 1) { // Medium
                game.setAI(true, 'medium', pvcAiVsAi);
            } else if (index === 2) { // Hard
                game.setAI(true, 'hard', pvcAiVsAi);
            } else if (index === 3) { // Dynamic
                game.setAI(true, 'dynamic', pvcAiVsAi);
            }
            
            showGame();
        });
    });
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showGameMode();
        });
    }
    
    // Ostali gumbi
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoMove);
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', backToMenu);
    
    console.log('Vsi event listenerjí nastavljeni');
});

let pvcAiVsAi = false; // Spremenljivka za tiste ali je AI vs AI

function showDifficultySelect(aiVsAi) {
    pvcAiVsAi = aiVsAi;
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('difficultySelect').style.display = 'block';
}
