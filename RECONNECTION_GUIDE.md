# Reconnection System Guide

## Overview
The BlitzQuiz app now includes a comprehensive reconnection system that allows players to seamlessly reconnect if they experience disconnection, close their tab, or have network issues during a game.

## Features

### 1. **Automatic Session Persistence**
- Player sessions are automatically saved to `localStorage` when joining a game
- Sessions include: room code, nickname, and player role
- Sessions expire after 2 hours for security

### 2. **Smart Reconnection**
- **Socket.IO Configuration**: Up to 10 reconnection attempts with progressive delay (1-5 seconds)
- **State Restoration**: When reconnecting, players are automatically placed in the correct game state:
  - Lobby: Returns to waiting screen
  - Question Active: Shows current question with remaining time
  - Question Results: Shows results of current question
  - Final Results: Shows final standings

### 3. **Visual Feedback**
- **Connection Status Banner**: Subtle top banner showing connection issues
- **Reconnection Overlay**: Full-screen overlay during active reconnection attempts
- **Reconnect Counter**: Shows current attempt number

### 4. **Server-Side Improvements**
- **Nickname-Based Identity**: Players are identified by nickname, not socket ID
- **Graceful Disconnection Handling**: 
  - Players marked as `disconnected` but not removed during active games
  - In lobby, disconnected players are cleaned up after 60 seconds
  - All player data (score, answers, streak) is preserved
- **State Synchronization**: Reconnecting players receive current game state

## How It Works

### Client Side (App.tsx & socket.ts)

1. **Session Management**:
   ```typescript
   saveSession({ roomCode, nickname, isPlayer: true })
   ```
   - Called when player successfully joins a room
   - Stores session in localStorage

2. **Connection Monitoring**:
   - Listens to socket events: `connect`, `disconnect`, `reconnect_attempt`
   - Updates UI with connection status
   - Triggers reconnection flow when needed

3. **Automatic Reconnection**:
   - On `connect` event, checks for existing session
   - If session exists and user was disconnected, calls `reconnect-to-room` event
   - Restores game state based on server response

4. **Session Cleanup**:
   - Cleared when game ends
   - Cleared when player is kicked
   - Cleared when host disconnects
   - Cleared when clicking "Play Again"

### Server Side (index.ts)

1. **New Event: `reconnect-to-room`**:
   - Receives: room code and nickname
   - Finds existing player by nickname (case-insensitive)
   - Updates socket ID to new connection
   - Sends current game state to player
   - Emits appropriate game events based on current state

2. **Enhanced Disconnect Handling**:
   - Sets `player.connected = false` instead of removing
   - Emits `player-disconnected` event (instead of `player-left`)
   - In lobby, schedules cleanup after 60 seconds
   - During game, keeps player data intact

3. **New Event: `player-reconnected`**:
   - Notifies host when player successfully reconnects
   - Updates connected player count

## Edge Cases Handled

### 1. **Mid-Question Disconnection**
- Player reconnects and sees current question
- Timer is synced with server time
- Can submit answer if time remains
- Cannot submit duplicate answers (already answered questions are blocked)

### 2. **During Results**
- Player sees current question results
- Personal answer and score are included
- Can continue when host advances to next question

### 3. **Multiple Disconnections**
- Socket.IO handles up to 10 reconnection attempts
- Each successful reconnection updates the socket ID
- Old socket ID is properly cleaned up

### 4. **Lobby Disconnection**
- 60-second grace period before removing from lobby
- Can reconnect during this window
- After timeout, slot opens for new players

### 5. **Game Completion**
- Session automatically cleared when game ends
- Prevents stale sessions from interfering with new games

### 6. **Nickname Conflicts**
- During active game, existing player can reconnect with same nickname
- New players cannot join with nickname of disconnected player
- In lobby, after timeout, nickname becomes available again

## Testing the Reconnection System

### Test Scenario 1: Tab Close During Game
1. Join a game as a player
2. Host starts the game
3. Close the browser tab completely
4. Reopen the same URL
5. **Expected**: Automatic reconnection overlay → Resume at current game state

### Test Scenario 2: Network Interruption
1. Join a game and start playing
2. Disable network (airplane mode / disconnect WiFi)
3. Wait 5-10 seconds
4. Re-enable network
5. **Expected**: Connection status banner → Automatic reconnection → Resume game

### Test Scenario 3: Page Refresh
1. Join a game as a player
2. Refresh the page (F5 or Ctrl+R)
3. **Expected**: Automatic reconnection → Game state restored

### Test Scenario 4: Mid-Question Disconnect
1. Join a game
2. Host starts a question
3. Disconnect (close tab)
4. Reconnect before timer expires
5. **Expected**: See current question with remaining time, can submit answer

### Test Scenario 5: Lobby Timeout
1. Join a game (stay in lobby)
2. Disconnect
3. Wait more than 60 seconds
4. Try to reconnect
5. **Expected**: Reconnection fails, redirected to home

## Configuration

### Socket.IO Settings (socket.ts)
```typescript
reconnectionAttempts: 10,      // Try up to 10 times
reconnectionDelay: 1000,       // Start with 1 second delay
reconnectionDelayMax: 5000,    // Max 5 seconds between attempts
timeout: 20000,                // 20 second connection timeout
```

### Session Expiration
- Default: 2 hours (7,200,000 ms)
- Can be adjusted in `getSession()` function

### Lobby Cleanup Timeout
- Default: 60 seconds (60,000 ms)
- Configured in disconnect handler

## Benefits

1. **Improved User Experience**: Players don't lose progress due to temporary disconnections
2. **Network Resilience**: Handles poor network conditions gracefully
3. **Mobile-Friendly**: Supports browser backgrounding on mobile devices
4. **Seamless Recovery**: Game continues as if nothing happened
5. **Host Awareness**: Host can see when players disconnect/reconnect

## Known Limitations

1. **Host Disconnection**: If host disconnects, game ends (by design)
2. **Session Storage**: Uses localStorage, not available in private/incognito mode
3. **Cross-Device**: Cannot resume session on different device (session is browser-specific)
4. **Expired Sessions**: Sessions older than 2 hours are automatically discarded

## Future Enhancements

Potential improvements for the reconnection system:

1. **Cloud Session Storage**: Store sessions on server for cross-device support
2. **Offline Queue**: Queue answer submissions while offline, sync on reconnect
3. **Partial State Updates**: Only send diff instead of full game state
4. **Host Reconnection**: Allow host to reconnect and resume game
5. **Player Notification**: Show toast when other players disconnect/reconnect

## Troubleshooting

### Issue: "Player not found in this room"
- **Cause**: Session expired or player was removed from room
- **Solution**: Join the game again manually

### Issue: Reconnection keeps failing
- **Cause**: Room might have been deleted or game ended
- **Solution**: Check if game is still active, may need to start new game

### Issue: Multiple reconnection overlays
- **Cause**: Multiple tabs open with same session
- **Solution**: Close duplicate tabs, keep only one active

### Issue: Score not preserved
- **Cause**: Rejoined as new player instead of reconnecting
- **Solution**: Ensure localStorage is enabled and session hasn't expired
