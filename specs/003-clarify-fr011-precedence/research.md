# Research: Full-List and Look-Ahead Precedence Clarification

## 1) Full-List Delivery Model

- **Decision**: Single-response full-list without pagination.
- **Rationale**: Matches dashboard panel mental model (user selects "View all" and sees complete set); simplifies initial implementation; consistent with MVP scope (<1k users implies manageable reminder counts).
- **Alternatives considered**: Paginated full-list (100+ reminders/page). Rejected because adds complexity and contradicts "View all" semantic expectation.

## 2) Look-Ahead Window Precedence

- **Decision**: Resolve in order: current-view temporary value → saved user preference → 7-day default.
- **Rationale**: Enables temporary filtering without persisting; respects user preferences when available; sensible canonical default.
- **Alternatives considered**: Single configurable default only. Rejected because removes ability to apply temporary filters.

## 3) Invalid Window Fallback

- **Decision**: Ignore invalid value and apply 7-day default with user-facing explanation.
- **Rationale**: Prevents crashes or unexpected exclusions; clear feedback avoids support confusion; deterministic.
- **Alternatives considered**: Clamp to nearest valid bound. Rejected because could silently change user intent (e.g., 200-day request clamped to 60 days without notice).

## 4) Full-List Sort Order

- **Decision**: By due date ascending (most urgent first), matching dashboard panel.
- **Rationale**: Visual consistency; users already understand this order from dashboard.
- **Alternatives considered**: Group by dog or reminder type. Rejected because splits attention across unrelated pets/types.

## 5) Simultaneous-Reminder Determinism

- **Decision**: Secondary sort by reminder type order (vaccination → medication → appointment), then by record ID/name.
- **Rationale**: Type order reflects clinical priority (immunizations most time-critical); record ID ensures stable deterministic ordering.
- **Alternatives considered**: Creation timestamp. Rejected because new vs. old records could vary per environment/test run.

## 6) Temporal Reference for Window

- **Decision**: Measure look-ahead from current exact time (UTC now), not calendar day boundaries.
- **Rationale**: Eliminates ambiguity across timezones and times of day; consistent for automated tests.
- **Alternatives considered**: Start/end of calendar day. Rejected because timezone-aware users expect "7 days from now", not calendar-based windows.
