# Relearn tab

Hackera is where a problem is found. LeetCode is where it is solved. The in-app Solved checkbox is not the source of truth for this tab.

## Marking a solve

- On a real LeetCode problem, the solve page shows mark controls directly under the LeetCode link.
- The Relearn tab has a search by problem name or number. That is the backup for when the mark was not made on the problem page.
- First mark only:
  - **Solved just now** puts the problem at the back of the queue.
  - **Solved earlier** backdates the solve: a week ago, a month ago, or a few months ago. The older the solve, the nearer the front it starts.
- Those actions do not reset a problem that is already marked.
- Curriculum problems that are not real LeetCode problems, and custom bank questions, cannot be marked.
- The same LeetCode problem uses one record whether it was opened from Practice or from the learning path. The key is the LeetCode slug.

## The queue

- There is no waiting period. Every marked problem is in the queue from the moment it is marked.
- The queue is ordered by least recently visited first, so the problem most likely to be forgotten is at the top and numbered 1.
- The whole queue is shown, in order. The first card is highlighted as up next.
- Each card shows the position, the problem, its difficulty, when it was last visited, and how many times it needed more practice.
- Each card links out to LeetCode.

## After redoing a problem

- **Flawless** moves it to the back of the queue.
- **Needs more practice** puts it back a few places down (after the next 3 problems), so it returns soon without coming straight back up. With fewer than 3 others it goes to the back.
- **Remove** deletes the record.
- Both review buttons record the real time of the review as "last visited". The original solve date is never overwritten.
- Needing more practice does not clear the separate in-app Solved checkbox.

## Stats

- A stat area sits at the top of the tab with four cards: Total, Easy, Medium, Hard.
- Each shows how many of your marked problems are in that level, against how many problems of that level are in Hackera, so the numbers can be compared directly with LeetCode.
- Clicking a card filters the "Marked problems" list underneath to that level. Clicking it again shows everything.
- The marked list is sorted by problem number and each row can be removed, so a missing or extra problem is easy to spot.
- Counts only cover problems that exist in Hackera's catalog.

## Storage

- Saved in this browser under `oa.relearn`, scoped to the signed-in user, same as other personal progress.
- Two accounts on one browser do not share a list.
- Marks made before the queue existed (which only have a solve date) still work. Their solve date is used as their last visit.

## Out of scope

- Signing into LeetCode or importing an account.
- Picking a problem at random.
- Fixed review intervals or "due" dates.
