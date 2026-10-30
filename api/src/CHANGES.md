# Fix summary (see inline comments in code)
Behavior changes the frontend must know about:
- POST /cart/:id/pay (was GET /cart/:id) starts a payment; GET /cart/callback now reachable.
- GET /user/attempts/attempts/:id/result returns { success, data: <result> } in both branches.
- Notes list returns data: { notes, nextPage } (was a bare array).
- UserCreateExamDto filter/difficulty are strings: "ALL" | "WRONG" | "UNANSWERED" | "NOT_SEEN" and "HARD" | "MEDIUM" | "EASY" | "MIXED".
- Exam question browsing (/user/questions/exam/:id) only after the user finished an attempt.
- ?limit= on exam lists is optional (default 10, max 50).
