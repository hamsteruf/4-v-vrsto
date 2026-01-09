# 4-v-vrsto

**4-v-vrsto** is an expandable board game inspired by *Connect Four*, but with **fundamentally different mechanics**.  
The game is played on a **growing square grid**, **with classic gravity**, supports **continuous scoring**, and can be played **Player vs Player**, **Player vs AI**, or **AI vs AI**.

Live demo:  
https://hamsteruf.github.io/4-v-vrsto/

---

## Game Overview

- Two symbols: **O** and **X**
- **O always starts**
- Initial board size: **5×5**
- The game **does not end after a single win**
- The board **expands automatically** and the match continues

---

## Core Rules

### Board & Placement
- The game is played on a **square grid**.
- A move consists of clicking **any empty, unlocked cell**.

### Turn Order
- Players alternate turns.
- The current player is always clearly shown.
- Undo is available **only for human turns**.

---

## Winning & Scoring

- A player scores **1 point** when they connect **four of their symbols** in a straight line:
  - horizontal  
  - vertical  
  - diagonal  
- After scoring:
  - the winning four cells become **locked** and **cannot be reused** for further wins,
  - the game **continues**.

---

## Board Expansion

The board expands automatically when the board becomes **completely full**

### Expansion Rules
- The board grows by **+4 rows and +4 columns**
- The previous board is placed **in the center** of the new board (2-square wide gap around the previous board)
- All locked and occupied cells are preserved
- The current player continues
- For the first **2 moves after expansion** (first move for each player), winning moves are **temporarily blocked** (prevents instant chain scoring)

---

## Undo System

- Undo restores:
  - the previous board state,
  - locked cells,
  - current player,
  - scores.
- Undo is **disabled**:
  - when no moves exist,
  - during AI turns,
  - after irreversible game states.

---

## AI play

The game includes an AI opponent:

- Uses **Minimax with Alpha–Beta pruning**
- Lookahead
- Evaluates:
  - immediate wins,
  - opponent blocks,
  - line building,
  - center control,
  - long-term board value
- Supports:
  - Player vs AI
  - AI vs AI (fully autonomous)

---

## Interface Features

- Dark mode toggle
- Clear board visualization
- Highlighted winning lines
- Live score tracking
TODO: Smooth board expansion and rotation animations

---

## Game Modes

- Player vs Player
- Player vs Computer
- Computer vs Computer

All modes use the **same core rules and mechanics**.

---
## TODO:
- Configure the game and settings (n in a row, custom expansions, custom computer difficulty)
- Smooth animations (board expansion and rotation...)
- Improve performance for large boards
- Mobile UI
- Sound effects
- full EN and SI Language support
- Share game via URL/seed (play with others)
---

## 🚀 Run Locally

```bash
git clone https://github.com/hamsteruf/4-v-vrsto.git
