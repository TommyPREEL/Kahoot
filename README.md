# Kahoot Clone 🎮

A fully-featured, real-time quiz game inspired by Kahoot, built with React + TypeScript + Socket.IO.

## Features

- **4 question types**: Quiz (single), True/False, Multi-select, Slider/Range
- **Speed scoring**: faster answers = more points (500–1000 per question)
- **Streak bonuses**: consecutive correct answers give extra points
- **QR code joining**: scan to jump straight into the room
- **Room codes**: short alphanumeric codes (e.g. `AZ5R2T`)
- **Live podium**: top players shown after each question
- **Final podium**: animated podium at game end with confetti
- **Real-time**: WebSocket-based, supports many concurrent rooms
- **Animations**: countdown, answer flash, confetti, podium rise

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend  | Node.js + Express + Socket.IO |
| Realtime | Socket.IO (WebSockets) |
| QR Code  | `qrcode` npm package |
| Styling  | Pure CSS with custom animations |

## Quick Start

### Prerequisites
- Node.js 18+

### Install & Run

```bash
# From the repo root
npm install
npm run install:all
npm run dev
```

This starts:
- Server on `http://localhost:3650`
- Client on `http://localhost:3600`

### Usage

1. Open `http://localhost:3600`
2. Click **Host a Game** → build your quiz → **Create Room**
3. Share the room code or QR code with players
4. Players open `http://localhost:3600` → **Join a Game**
5. Host clicks **Start** when everyone is in
6. Play!

## Scoring

- **Base points**: 500–1000 per correct answer (based on speed)
- **Streak bonus**: +50 pts per consecutive correct answer (capped at +500)
- **Wrong answer**: 0 points, streak resets

## Project Structure

```
kahoot/
├── server/          Node.js + Socket.IO backend
│   └── src/
│       ├── index.ts        Socket event handlers
│       ├── RoomManager.ts  Room CRUD
│       ├── GameEngine.ts   Game logic & scoring
│       └── types.ts        Shared TypeScript interfaces
└── client/          React frontend
    └── src/
        ├── App.tsx          Main orchestrator (socket events + view routing)
        ├── socket.ts        Socket.IO client singleton
        ├── components/
        │   ├── host/        Host-facing views (setup, lobby, game)
        │   ├── player/      Player-facing views (join, lobby, answering)
        │   └── shared/      Podium, countdown, timer, confetti
        └── styles/
            └── global.css   All styles + animations
```
