# Relearn tab

Hackera is where a problem is found. LeetCode is where it is solved. The in-app Solved checkbox is not the source of truth for this tab.

## Marking a solve

- On a real LeetCode problem, the solve page shows mark controls directly under the LeetCode link.
- The Relearn tab has a search by problem name or number. That is the backup for when the mark was not made on the problem page.
- First mark only:
  - **Solved just now** stores the current time and schedules the first review in 3 days.
  - **Solved earlier** backdates the solve: a week ago, a month ago, or a few months ago. Those are due immediately, and the older date comes back first.
- Those two actions do not reset a problem that is already marked.
- After a problem is marked, the actions are **Still got it**, **Forgot it** (only once it is due), and **Remove**.
- Curriculum problems that are not real LeetCode problems, and custom bank questions, cannot be marked.
- The same LeetCode problem uses one record whether it was opened from Practice or from the learning path. The key is the LeetCode slug.

## What comes back

- The tab shows at most 3 problems whose review time has arrived.
- Order: forgotten more often first, then solved longer ago.
- If more than 3 are due, say how many are waiting. They show up after these are reviewed.
- If nothing is due, say when the next one is. If nothing is marked, say so.
- Each due card links out to LeetCode and offers Still got it and Forgot it.
- **Still got it** keeps the original solve date and lengthens the gap: 3 days, then 7, then 21, then 45. It stays at 45 after that.
- **Forgot it** brings the problem back tomorrow, adds one to the forgotten count, and the next success starts again at 3 days. The original solve date stays.
- **Remove** deletes the record.
- Forgetting a review does not clear the separate in-app Solved checkbox.

## Storage

- Saved in this browser under `oa.relearn`, scoped to the signed-in user, same as other personal progress.
- Two accounts on one browser do not share a list.

## Out of scope

- Signing into LeetCode or importing an account.
- Picking a problem at random.
- The Code-tab finish checkboxes, which live on `kesh-checklist`.
