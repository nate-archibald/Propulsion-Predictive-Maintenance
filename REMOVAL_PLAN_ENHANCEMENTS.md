# Engine Removal Plan Page - Enhancement Summary

## Overview
Enhanced the Engine Removal Plan page with advanced location identification, manual reordering capabilities, and improved chat-based customization. These features enable operators to handle unscheduled engine removals, identify exact engine locations, and make fine-grained adjustments to the removal schedule.

---

## Features Implemented

### 1. **Location Identification**
- **Display**: Each engine in the removal plan now shows its exact location as `Tail (Wing Position)`
  - Example: `N5678 (Left Wing)`, `N5678 (Right Wing)`
- **Benefits**:
  - Quick visual reference to find engines in the facility
  - Critical for unscheduled removals where you need to locate the engine immediately
  - Helps with manual small adjustments (e.g., moving an engine from 3rd to 4th position)

**Files Modified**:
- `client/src/scheduling/removalSchedule.ts` - Added `position?: string` field to `PlanRow` interface
- `client/src/pages/RemovalPlanPage.tsx` - Added `formatLocation()` helper function and location column to the removal plan table

---

### 2. **Manual Reordering with Up/Down Arrow Buttons**
- **UI**: Each removal row now includes up/down arrow buttons (next to the location column)
  - Up arrow: Move the engine earlier in the removal sequence
  - Down arrow: Move the engine later in the removal sequence
  - Buttons are disabled at the first/last positions
- **Tooltips**: Hover labels explain the action ("Move earlier", "Move later")
- **Non-print**: These controls are hidden in print view

**How It Works**:
1. Click the up/down arrow on an engine row
2. The engine's position in the removal order is adjusted
3. The plan recalculates instantly showing new spares balance and impact
4. Changes are tracked in the undo history

**Files Modified**:
- `client/src/pages/RemovalPlanPage.tsx` - Added `handleMoveRemoval()` function and arrow button UI

---

### 3. **Drag-and-Drop Reordering**
- **UI**: Each removal row has a grip icon (🖱️) on the left side (non-print)
- **Behavior**:
  - Drag a removal row over another engine to reorder
  - The dragged engine is pinned to the first available Monday in the schedule
  - Useful for "bumping" an urgent engine to the top
- **Visual Feedback**: Grip icon shows cursor changes on hover
- **Non-print**: Hidden in print view

**How It Works**:
1. Hover over an engine row to see the grip icon
2. Click and drag to move the engine
3. Automatically pins the engine to the first available removal Monday
4. For more precise date control, use the chat commands

**Files Modified**:
- `client/src/pages/RemovalPlanPage.tsx` - Added `handleDragReorder()` function and drag event handlers

---

### 4. **Enhanced Chat Commands for Unscheduled Removals**

#### Location-Based References
Users can now reference engines by their physical location instead of just ESN:

```
Examples:
- "Remove engine on left side of N5678"
- "Remove the right wing engine from N1234"
- "Engine on left of N9999 needs to come out"
```

The chat parser automatically resolves the aircraft tail to the engine ESN.

#### Specific Date Removals (Non-Monday Support)
Users can now specify exact dates, including non-Monday dates for urgent removals:

```
Examples:
- "Remove ESN-12345 on 2027-03-15" (specific Friday)
- "Bump ESN-67890 to 2027-02-24" (specific Wednesday)
- "Unscheduled removal of engine on left of N5678 on 2027-03-10"
```

**Important**: The standard removal plan uses Mondays, but chat commands support any date for special/urgent situations.

#### Full Command Summary
All existing chat commands now work with the new reordering features:

| Command Type | Examples | Result |
|---|---|---|
| **Pin by Position** | "first removal in January 2027" | Locks removal #1 to a specific week |
| **Pin by ESN** | "remove ESN-12345 on 2027-03-15" | Pins specific engine to exact date |
| **Pin by Location** | "engine on left of N5678 on 2027-03-20" | Uses location to find engine, pins to date |
| **Move Up/Down** | Via arrow buttons or drag-and-drop | Adjusts removal order with instant recalc |
| **Reorder** | "remove ESN-12345 first" | Puts engine at top of sequence |
| **Block Dates** | "no removals in March" | Prevents any removals during blackout |
| **Set Cadence** | "space removals 4 weeks apart" | Adjusts spacing between removals |
| **Rate Cap** | "max one removal per month" | Limits removals per calendar month |
| **Hours Floor** | "keep at least 1,000 remaining hours" | Pulls engines earlier to stay above floor |
| **Clear All** | "clear all constraints" | Resets to automatic plan |

**Files Modified**:
- `client/src/scheduling/planChatParser.ts` - Enhanced PIN intent handler to support:
  - Location-based engine reference parsing (`left/right side of TAIL`)
  - ISO date format parsing (YYYY-MM-DD) for exact dates
  - Differentiation between Monday-based and specific-date pins

---

### 5. **Updated Help Documentation**
The chat help tooltip in the RemovalPlanPage now documents all new features:
- Location-based references
- Drag-and-drop reordering
- Specific date pin commands
- Up/down arrow buttons
- Usage examples for unscheduled removals

**Files Modified**:
- `client/src/pages/RemovalPlanPage.tsx` - Updated help text in the info tooltip

---

## Technical Implementation Details

### Data Structure Changes

**PlanRow Interface** (`removalSchedule.ts`):
```typescript
export interface PlanRow {
  engineSN: string;
  tail: string;
  position?: string; // "L" or "R" (NEW)
  bindingConstraint: "HSR" | "LLP";
  dueDate: string;
  removalDate: string;
  weeksEarly: number;
  esnGoingOn: string;
  returnDate: string;
  sparesAtQx: number;
  limitingUnit: "hr" | "cyc";
  limitingRemainingNow: number;
  limitingRemainingAtRemoval: number;
  hrsRemainingAtRemoval: number;
  cycRemainingAtRemoval: number | null;
  feasible: boolean;
  issue?: string;
}
```

### Key Functions

**Location Formatting** (`RemovalPlanPage.tsx`):
```typescript
const formatLocation = (tail: string | undefined, position: string | undefined): string => {
  if (!tail) return "Unknown";
  if (position) return `${tail} (${position === "L" ? "Left" : "Right"} Wing)`;
  return tail;
};
```

**Drag-and-Drop Handler** (`RemovalPlanPage.tsx`):
```typescript
const handleDragReorder = (draggedEngineSN: string) => {
  if (plan.rows.length > 0) {
    const firstMondayToPin = plan.rows[0]?.removalDate || new Date().toISOString().slice(0, 10);
    const pin: RemovalPin = { engineSN: draggedEngineSN, monday: firstMondayToPin };
    const nextConstraints: PlanConstraints = { ...config.constraints };
    nextConstraints.pins = [...(nextConstraints.pins ?? []), pin];
    commit({ ...config, constraints: nextConstraints });
  }
};
```

**Movement Handler** (`RemovalPlanPage.tsx`):
```typescript
const handleMoveRemoval = (engineSN: string, direction: "up" | "down") => {
  const currentOrder = config.constraints.order ?? [];
  const currentIndex = currentOrder.indexOf(engineSN);
  // Reorder and commit with new order constraint
};
```

**Enhanced Chat Parser** (`planChatParser.ts`):
- Location regex: `/\b(left|right|l|r)(?:\s+(?:side|wing))?\s+(?:of\s+)?([A-Z][0-9A-Z]+)\b/i`
- ISO date regex: `/(\d{4})-(\d{1,2})-(\d{1,2})/`
- Distinguishes between Monday snapping and exact date pins

---

## Workflow Examples

### Example 1: Unscheduled Engine Removal (Top Priority)

**Scenario**: Engine on left wing of N5678 fails unexpectedly. You need to remove it ASAP and see how it affects the rest of the plan.

**Steps**:
1. In chat: `"Remove engine on left side of N5678 on 2027-03-15"` 
   - Chat confirms: "Engine ESN-31047 pinned to 2027-03-15 (exact date)."
   - Plan recalculates instantly showing impact
2. OR drag the N5678 left engine row to the top
   - It pins to the next available Monday in the plan
   - Spares balance updates automatically
3. See at a glance:
   - Engine location: `N5678 (Left Wing)`
   - Impact on spares: "Spares @ QX" column updates
   - When replacement arrives: "Forecast return" column shows when spare comes back from shop

### Example 2: Fine-Tuning Manual Adjustments

**Scenario**: You want to move an engine from 3rd in line to 4th position (one position later).

**Steps**:
1. Find the engine in the removal plan table
2. Click the down arrow (⬇️) on that row
3. Plan recalculates showing:
   - New position number: now shows "4" instead of "3"
   - Updated spare balance across the horizon
   - Any constraint warnings if the new position violates limits
4. To undo: Click "Return to previous plan" in the chat controls
5. To save: Click "Save plan" to persist

### Example 3: Blocking and Rescheduling

**Scenario**: Maintenance window in March 2027; need to avoid removals during that month.

**Steps**:
1. Chat: `"No removals in March 2027"`
   - Plan compresses remaining removals earlier
2. Check the result:
   - Location column helps you verify which specific engines are affected
   - Up/down arrows let you fine-tune any problem removals
3. Chat: `"Remove engine on right of N9999 in April 2027"` (if needed to reset a specific one)
4. See the combined effect in one view

---

## User Benefits

1. **Unscheduled Removals**: Quickly identify engine location, move it to the top, and see cascading impact on spares
2. **Visibility**: Location display makes it clear which aircraft and position each removal affects
3. **Control**: Multiple reordering methods (chat, buttons, drag-and-drop) suit different preferences
4. **Flexibility**: Support for non-Monday dates for urgent situations
5. **Instant Feedback**: All changes recalculate spare balance and feasibility instantly
6. **Audit Trail**: Chat history shows every change, undo/restore functions let you revert mistakes
7. **Print-Friendly**: Reordering controls hidden in print view; location shown in printed schedule

---

## Build & Deployment

**Build Status**: ✅ Successfully compiled

**Files Modified**:
- `client/src/pages/RemovalPlanPage.tsx` - Main UI page (added location column, arrow buttons, drag-drop)
- `client/src/scheduling/removalSchedule.ts` - Data model (added position field to PlanRow)
- `client/src/scheduling/planChatParser.ts` - Chat parser (enhanced PIN intent for location + date parsing)
- `client/src/components/RemovalPlanChat.tsx` - No changes required (uses updated help text via parent)

**New Icons Used**:
- `MapPin` - Location marker
- `ChevronsUp`/`ChevronsDown` - Movement arrows
- `GripVertical` - Drag handle

**No Breaking Changes**: All existing functionality preserved; features are additive.

---

## Future Enhancements (Optional)

1. **Impact Preview**: Show spare balance impact before confirming a drag-drop
2. **Conflict Detection**: Warn if a chat command conflicts with another constraint
3. **Location Auto-Complete**: Suggest known aircraft tails as user types
4. **Removal Notes**: Add per-engine notes (e.g., "awaiting parts", "shop availability")
5. **Multi-Select Reordering**: Select multiple engines and reorder as a group
6. **Export to CSV**: Include locations in exported removal schedule

---

## Testing Recommendations

1. **Drag-and-Drop**: 
   - Drag engine from middle of list to various positions
   - Verify spare balance updates
   - Verify position numbers update correctly

2. **Arrow Buttons**:
   - Click up/down on various engines
   - Verify first/last engines disable their respective buttons
   - Confirm plan recalculates

3. **Location Display**:
   - Verify all installed engines show location
   - Confirm position display (L vs. R wing)
   - Check print view (should be clean without controls)

4. **Chat Commands**:
   - Test location references: `"engine on left of N5678"`
   - Test specific dates: `"remove ESN-12345 on 2027-03-15"`
   - Test mixed: `"engine on right of N9999 on 2027-03-20"`
   - Verify error messages for malformed commands

5. **Undo/Restore**:
   - Make changes via multiple methods
   - Test undo history
   - Test restore to saved plan

---

## Summary

The Engine Removal Plan page now provides comprehensive tools for managing unscheduled removals and making fine-tuned adjustments to the schedule. Location identification makes it easy to find engines, manual reordering supports complex workflows, and enhanced chat commands give operators maximum flexibility while maintaining data integrity.
