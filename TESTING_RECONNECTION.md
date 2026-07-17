# Quick Testing Guide for Reconnection System

## Prerequisites
- Server running on port 3650
- Client running on port 3600 (or your configured port)
- Two browser windows/tabs recommended

## Quick Test Scenarios

### ✅ Test 1: Basic Tab Close & Reopen
**Steps:**
1. Open game in browser A (as host)
2. Open game in browser B (as player)
3. Join with nickname "TestPlayer"
4. Start the game
5. **Close browser B completely**
6. **Reopen browser B and go to the app URL**
7. ✓ Should see "Reconnecting..." overlay
8. ✓ Should automatically resume game at current state

**Expected Result:** Player seamlessly rejoins without losing score or progress

---

### ✅ Test 2: Network Disconnection During Question
**Steps:**
1. Start a game with at least one question
2. Join as player
3. Host starts the game
4. During an active question:
   - **Disconnect WiFi/Network**
   - Wait 3 seconds
   - **Reconnect WiFi/Network**
5. ✓ Should see connection status banner
6. ✓ Should automatically reconnect
7. ✓ Should show current question with remaining time
8. ✓ Can submit answer if time remains

**Expected Result:** Player can continue answering the question

---

### ✅ Test 3: Page Refresh
**Steps:**
1. Join a game as player
2. Game is in any state (lobby, active question, results)
3. **Press F5 or Ctrl+R to refresh page**
4. ✓ Should see brief reconnecting overlay
5. ✓ Should return to exact same game state

**Expected Result:** No data loss, seamless continuation

---

### ✅ Test 4: Multiple Players Disconnecting
**Steps:**
1. Host creates game
2. 3+ players join
3. Start the game
4. **Disconnect 2 players** (close tabs)
5. ✓ Host should see updated player count
6. Continue with remaining players
7. **Reconnect disconnected players**
8. ✓ Both should rejoin successfully
9. ✓ Scores should be preserved

**Expected Result:** Game continues smoothly, reconnected players maintain their state

---

### ✅ Test 5: Lobby Timeout
**Steps:**
1. Join a game in lobby (don't start)
2. **Close the tab**
3. **Wait 65 seconds**
4. Try to visit the URL again
5. ✓ Should fail to reconnect (session expired)
6. ✓ Should redirect to home page

**Expected Result:** Disconnected lobby players are cleaned up after 60 seconds

---

### ✅ Test 6: Answer Submission After Reconnect
**Steps:**
1. Join game, start playing
2. During a question, **disconnect**
3. **Reconnect immediately** (within question time)
4. **Submit an answer**
5. ✓ Answer should be accepted
6. ✓ Score should be updated correctly
7. Wait for results
8. ✓ Your answer should be shown in results

**Expected Result:** Can submit answer after reconnection if time permits

---

### ✅ Test 7: Cannot Double-Answer After Reconnect
**Steps:**
1. Join game, start question
2. **Submit an answer**
3. **Disconnect** (close tab)
4. **Reconnect**
5. Try to submit another answer for same question
6. ✓ Answer should be rejected
7. ✓ Original answer should be preserved

**Expected Result:** No duplicate answers allowed

---

## Browser Console Checks

Open Developer Tools (F12) → Console tab

**On Join:**
```
Socket connected
[+] Connected: <socket-id>
[Room] <nickname> joined <room-code>
```

**On Disconnect:**
```
Socket disconnected
[Room] <nickname> disconnected from <room-code>
```

**On Reconnect:**
```
Socket connected
Attempting to reconnect to session: {...}
Successfully reconnected! {...}
[Room] <nickname> reconnected to <room-code>
```

## Visual Indicators

### Connection Status Banner (Top of screen)
- **Orange**: Reconnecting...
- **Red**: Connection lost

### Reconnection Overlay (Full screen)
- Shows spinning icon
- Shows attempt number
- Displays "Reconnecting..." message

### LocalStorage Check
Open DevTools → Application → Local Storage → your domain

Should see:
```json
{
  "blitzquiz_session": "{\"roomCode\":\"ABC123\",\"nickname\":\"YourName\",\"isPlayer\":true,\"timestamp\":1234567890}"
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Player not found" | Session expired or room deleted | Join manually again |
| Infinite reconnect loop | Server not running | Start server |
| No reconnection attempt | LocalStorage disabled | Enable localStorage in browser |
| Score reset to 0 | Joined as new player | Ensure session exists before reload |

## Performance Metrics

**Expected Reconnection Times:**
- Same tab refresh: < 1 second
- Tab close/reopen: 1-3 seconds
- Network recovery: 2-5 seconds
- Maximum attempts: 10 (1-5 second intervals)

## Success Criteria

✅ All 7 test scenarios pass  
✅ No console errors  
✅ Session persists in localStorage  
✅ Player scores preserved  
✅ Host sees accurate player counts  
✅ Visual feedback is smooth and clear  
✅ No duplicate answer submissions  

---

**Last Updated:** 2026-07-17
**System Version:** 1.0 with Reconnection Support
