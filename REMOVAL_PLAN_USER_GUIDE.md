# Engine Removal Plan - Quick Start Guide

## What's New

Your Engine Removal Plan page now has powerful tools for handling unscheduled removals and fine-tuning the schedule. Here's what you can do:

---

## ✈️ Location Display

**What**: Each engine now shows its exact location in the removal table.

**Example**:
```
Tail: N5678 → Location: N5678 (Left Wing)
Tail: N9999 → Location: N9999 (Right Wing)
```

**Why it Matters**:
- Quickly find which aircraft and engine position is being removed
- Critical when an urgent removal happens and you need to locate the engine physically
- Helps coordinate with maintenance teams

---

## 🎯 Manual Reordering

You have **three ways** to reorder engines:

### Method 1: Arrow Buttons (Precise)
Located next to each engine's location:
- **Up Arrow (↑)**: Move engine earlier in the removal schedule
- **Down Arrow (↓)**: Move engine later in the removal schedule
- Buttons disable at first/last positions

**Use When**: You want to move an engine by exactly one position (e.g., 3rd → 4th)

### Method 2: Drag-and-Drop (Quick)
Grab the grip icon (≡) on the left side of each engine row:
- **Drag to top**: Quickly bump an urgent engine to the next available Monday
- **Visual feedback**: Cursor changes to indicate you can drag

**Use When**: You need to move an engine to the top ASAP for an unscheduled removal

### Method 3: Chat Commands (Flexible)
Type natural language commands in the chat:
```
"Remove ESN-12345 first"
"Bump engine on left of N5678 to the top"
```

---

## 🚨 Handling Unscheduled Removals

**Scenario**: An engine fails and needs immediate removal. What do you do?

### Step 1: Identify the Engine
Use the **location column** to find which aircraft and position it's on:
```
Looking for the engine on the left wing of N5678?
Scan the Location column: "N5678 (Left Wing)" ✓
```

### Step 2: Move It to the Top
Choose your method:

**Option A** - Drag-and-drop (fastest):
1. Find the engine row
2. Drag it to the top of the table
3. Automatically pins to the next available Monday

**Option B** - Arrow buttons (precise):
1. Find the engine row
2. Click the up arrow repeatedly until it's first
3. See all changes recalculate in real-time

**Option C** - Chat command (most flexible):
```
"Remove engine on left side of N5678 on 2027-03-15"
(Supports any date, not just Mondays)
```

### Step 3: Check the Impact
The page **instantly recalculates**:
- ✅ New position in removal order (e.g., now #1 instead of #5)
- ✅ **Spares @ QX** column updates - see spare balance change
- ✅ **Forecast return** shows when removed engine returns from shop
- ⚠️ Red warning if spare balance drops too low

---

## 💬 Chat Command Examples

### Location-Based References
Instead of ESNs, reference engines by their location:

```
"Remove engine on left side of N5678"
→ Finds the left engine, schedules it

"Engine on right wing of N1234 to the top"
→ Moves right engine to first removal

"Can we remove the left engine from N9999 on 2027-03-15?"
→ Specific engine, specific date (non-Monday support!)
```

### Specific Date Removals
Normally, removals happen on Mondays. But for urgent situations, specify any date:

```
"Remove ESN-12345 on 2027-03-15"  (Friday - urgent!)
"Unscheduled removal on 2027-02-24"  (Wednesday)
"Move N5678 left engine to 2027-03-20"  (Tuesday)
```

### Combining Methods
You can mix location + date in one command:

```
"Engine on left of N5678 on 2027-03-11"
→ Finds left engine, pins to exact date
```

---

## 📊 Reading the Updated Table

### New Columns & Info

| Column | What It Shows | Why It Matters |
|--------|---------------|----------------|
| **Location** | `N5678 (Left Wing)` | Know exactly where the engine is |
| **Week (Mon)** | `2027-02-15` | When removal happens (normally Monday) |
| **#** | `1, 2, 3, ...` | Position in removal order |
| **Spares @ QX** | `5, 4, 3, ...` | Available spares after each removal |
| **Forecast return** | `2027-05-25` | When removed engine back as spare |
| **↑ ↓ Actions** | Arrow buttons | Move engine up/down one position |

### Interpreting Spare Balance

**Spares @ QX** column counts down as removals happen:
```
Week 1: Spares = 5  (remove #1, install spare)
Week 2: Spares = 4  (remove #2, install spare)
Week 3: Spares = 5  (removed #1 returns from shop, +1 back!)
Week 4: Spares = 4  (remove #3, install spare)
```

⚠️ If **Spares @ QX** reaches 0 or red, the plan is infeasible → needs reworking

---

## 🔧 Workflow: A Complete Example

**Scenario**: 
- N5678's left engine needs urgent removal on March 10, 2027
- Check impact on spares
- Then adjust other removals if needed

**Steps**:

1. **Chat input**: `"Remove engine on left of N5678 on 2027-03-10"`
   - System: "Engine ESN-31047 pinned to 2027-03-10 (exact date)."
   
2. **View result**:
   - Location column: ✓ `N5678 (Left Wing)` confirmed
   - Row highlights in plan at that date
   - Spares balance shows impact: drops from 5 to 4 that week
   
3. **If spares look low**, adjust other removals:
   - **Option A**: Chat: `"Space removals 4 weeks apart"` (increase buffer)
   - **Option B**: Click down arrow on one of the later removals (push it back)
   - **Option C**: Chat: `"No removals in March"` except the urgent one (shift rest forward)
   
4. **Check feasibility**:
   - Green checkmark = ✅ Plan works
   - Red warning = ⚠️ Can't get enough spares, needs more work
   
5. **Save when ready**: "Save plan" button at bottom

---

## 🔄 Undo & Restore

Made a mistake? No problem:

- **↶ Return to previous plan**: Undoes your last change
- **⟲ Return to last saved plan**: Goes back to previously saved version
- **💾 Save plan**: Locks in your changes for next time

---

## 🖨️ Printing

When you print the removal plan:
- ✓ All location info is included
- ✓ Clean table without reordering controls (buttons/drag-drop hidden)
- ✓ Professional formatting

---

## ⚡ Quick Tips

1. **Location lookup**: Use search in your browser (Ctrl+F) to find aircraft tails quickly

2. **Drag-drop speed**: Dragging automatically pins to the *first available Monday* — use chat for exact non-Monday dates

3. **Chat flexibility**: The chat understands many phrasings:
   ```
   "Remove the left engine from N5678"  ✓
   "Engine on left of N5678"  ✓
   "N5678 left engine"  ✓
   "ESN-31047"  ✓ (works too)
   ```

4. **Spare balance**: Watch this column closely when making multiple adjustments

5. **Forecast return**: Use this to plan when spares will be back in inventory

---

## ❓ Frequently Asked Questions

**Q: Can I remove engines on non-Monday dates?**
A: Yes! Use chat commands: `"Remove ESN-12345 on 2027-03-15"` (any date). Arrow buttons keep Monday cadence.

**Q: What does red highlighting on a row mean?**
A: Infeasible — not enough spares available that week. Adjust earlier removals or increase spare count.

**Q: Can I drag-drop multiple engines at once?**
A: Not yet. Drag one at a time or use chat commands.

**Q: How do I reference an engine if I know the aircraft but not the ESN?**
A: Use location reference: `"Engine on left of N5678"` — system finds it automatically.

**Q: Does the plan automatically reset after I close the page?**
A: Not if you click "Save plan" — your changes persist. Otherwise, refresh reloads the last saved version.

---

## 📞 Support

**For questions or issues**:
- Check the info icon (ℹ️) at the top of the "Adjust the plan — chat" section
- Review the chat examples and command syntax
- Use "Return to previous plan" to undo experimental changes

---

**Built for the maintenance team's workflow.** Questions, feedback, or suggestions? Let your admin know!
